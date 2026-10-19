/**
 * A fresh app with Echo installed the way a stranger installs it, as
 * functions. The release matrix (`install-app.mjs`) and the agent benchmark
 * (`bench/`) both start from here, so what the benchmark hands an agent is the
 * app the matrix proves installs.
 *
 * The app is written here rather than scaffolded by a generator, so a run
 * doesn't depend on a generator's network, prompts or template of the day.
 * Echo arrives as packed tarballs — the actual published artefacts — or from
 * npm, installed with the package manager under test.
 */
import { spawn } from "node:child_process";
import { mkdir, writeFile, readdir, rm } from "node:fs/promises";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

export const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

/** Runs a command, echoing it, with its output on this process's (or ignored with `quiet`). */
export function run(command, args, options = {}) {
  const { quiet, ...spawnOptions } = options;
  return new Promise((ok, fail) => {
    if (!quiet) console.log(`$ ${command} ${args.join(" ")}`);
    const child = spawn(command, args, {
      stdio: quiet ? "ignore" : "inherit",
      shell: process.platform === "win32",
      ...spawnOptions,
    });
    child.on("error", fail);
    child.on("close", (code) => (code === 0 ? ok() : fail(new Error(`${command} exited with ${code}`))));
  });
}

/** `npm install --save-dev a`, `pnpm add -D a`, … */
export function installArgs(pm, packages, dev = false) {
  return pm === "npm"
    ? ["install", dev ? "--save-dev" : "--save", ...packages]
    : ["add", ...(dev ? ["-D"] : []), ...packages];
}

export const install = (pm, cwd, packages, { dev = false, quiet = false } = {}) =>
  run(pm, installArgs(pm, packages, dev), { cwd, quiet });

/** The published artefacts, built and packed the way `npm publish` would send them. */
export async function packEcho(into, { quiet = false } = {}) {
  await run("pnpm", ["--filter", "echo-ui-core", "build"], { cwd: repoRoot, quiet });
  await run("pnpm", ["--filter", "echo-ui-cli", "build"], { cwd: repoRoot, quiet });
  for (const dir of ["packages/core/dist", "packages/cli/dist"]) {
    await run("npm", ["pack", "--pack-destination", into], { cwd: join(repoRoot, dir), quiet });
  }
  const tarballs = [];
  for (const file of await readdir(into)) {
    if (file.endsWith(".tgz")) tarballs.push(join(into, file));
  }
  return tarballs;
}

export const NEXT_FILES = {
  "next.config.mjs": "export default {};\n",
  "app/layout.tsx": `import "./globals.css";

export const metadata = { title: "Echo matrix app" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
`,
};

export const VITE_FILES = {
  "index.html": `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8" /><title>Echo matrix app</title></head>
  <body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body>
</html>
`,
  "vite.config.ts": `import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({ plugins: [react()] });
`,
};

/**
 * A component file for the matrix to run `init`'s check hook on, as Claude
 * Code would after the agent wrote one. Written apart from the app's own
 * files, because the app differs by framework (only Next has
 * `app/layout.tsx`) and the agent benchmark's apps are built by
 * `writeApp` too, where an extra file would be something an agent sees.
 */
export async function writeHookProbe(root) {
  const path = join(root, "src", "echo-hook-probe.tsx");
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, "export function HookProbe() {\n  return <p>Probe</p>;\n}\n");
  return { path, remove: () => rm(path, { force: true }) };
}

export const TSCONFIG = {
  compilerOptions: {
    target: "ES2022",
    lib: ["ES2022", "DOM", "DOM.Iterable"],
    module: "ESNext",
    moduleResolution: "Bundler",
    jsx: "preserve",
    strict: true,
    noEmit: true,
    esModuleInterop: true,
    skipLibCheck: true,
    resolveJsonModule: true,
    isolatedModules: true,
    allowImportingTsExtensions: false,
    plugins: [],
  },
  include: ["**/*.ts", "**/*.tsx"],
};

/**
 * The app before anything is installed: package.json, tsconfig and the
 * framework's own files. `files` adds to or replaces the framework's; `paths`
 * gives the tsconfig an import alias, as a generated app has.
 */
export async function writeApp(root, { framework = "next", name = "echo-matrix-app", files = {}, paths } = {}) {
  await writeFile(
    join(root, "package.json"),
    `${JSON.stringify({ name, private: true, version: "0.0.0", type: "module" }, null, 2)}\n`,
  );
  const compilerOptions = {
    ...TSCONFIG.compilerOptions,
    jsx: framework === "next" ? "preserve" : "react-jsx",
    ...(paths ? { baseUrl: ".", paths } : {}),
  };
  await writeFile(join(root, "tsconfig.json"), `${JSON.stringify({ ...TSCONFIG, compilerOptions }, null, 2)}\n`);
  const all = { ...(framework === "next" ? NEXT_FILES : VITE_FILES), ...files };
  for (const [path, content] of Object.entries(all)) {
    await mkdir(dirname(join(root, path)), { recursive: true });
    await writeFile(join(root, path), content);
  }
}

/** React, TypeScript and the framework, installed with the package manager under test. */
export async function installBase(root, { pm = "npm", framework = "next", react = "19", tailwind = false, quiet = false } = {}) {
  const reactDeps = react === "18" ? ["react@^18.3.1", "react-dom@^18.3.1"] : ["react@^19", "react-dom@^19"];
  const typeDeps =
    react === "18" ? ["@types/react@^18", "@types/react-dom@^18"] : ["@types/react@^19", "@types/react-dom@^19"];
  await install(pm, root, reactDeps, { quiet });
  // Every app create-next-app writes has @types/node, and `next build` stops
  // to install it when it's missing, so the app here has it too.
  const nodeTypes = framework === "next" ? ["@types/node@^22"] : [];
  await install(pm, root, ["typescript@^5.7.2", ...typeDeps, ...nodeTypes], { dev: true, quiet });
  if (framework === "next") await install(pm, root, ["next@^16"], { quiet });
  else await install(pm, root, ["vite@^6", "@vitejs/plugin-react@^4"], { dev: true, quiet });
  if (tailwind) await install(pm, root, ["tailwindcss@^4", "@tailwindcss/postcss@^4"], { dev: true, quiet });
}
