/**
 * The apps an agent starts from. Every setup begins as the same hand-written
 * Next.js app, so the only difference between two runs of a task is the
 * design system installed into it.
 *
 * - `echo`: Echo from npm, with `init` and nothing else, as a new user has it.
 * - `echo-local`: Echo from this working tree, packed the way `npm publish`
 *   would send it, with the registry read from the local build. The only way
 *   to measure a change before it's published.
 * - any other setup is read from `setups.json` in the results folder, as the
 *   steps that install it. The comparison setup lives there, with the notes.
 *
 * An Echo setup can wear a style: `echo-local+drafting-index` is the
 * echo-local app after `style use drafting-index`, the style taken from
 * Echo's library or the builder's own (`ECHO_STYLES_DIR`, or
 * ~/Documents/styles). The same prompt in two of them is the style task: each
 * app's pages are scored against the look it wears (score/look.ts).
 */
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { cp, mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { install, installBase, packEcho, repoRoot, run, writeApp } from "../../scripts/matrix/fresh-app.mjs";
import { devicePolarity } from "../../packages/core/src/theme/create-echo-theme";
import { RESULTS_DIR, WORK_DIR } from "./config";
import { capture } from "./score/build";

/** What a prepared app is, recorded with every run made from it. */
export interface AppFacts {
  setup: string;
  preparedAt: string;
  /** Present for an Echo app. */
  echo?: {
    source: "npm" | "local";
    dir: string;
    registry: string;
    /** Where the scoring reads the catalog: a URL or a path. */
    catalog: string;
    cli?: string;
    core?: string;
  };
  /** The style the app wears, when the setup names one. */
  style?: {
    name: string;
    title: string;
    from: "echo" | "yours";
    device: "light" | "dark";
    /** Of what the project carries (its seed and its style), so a style changed in the library starts a new series. */
    sha256: string;
  };
}

/** A setup's name: the app it starts as, and the style it wears, if any. */
export function parseSetup(setup: string): { base: string; style?: string } {
  const [base, style, ...rest] = setup.split("+");
  if (!base || style === "" || rest.length) {
    throw new Error(`"${setup}" isn't a setup. A setup is a name, or a name and a style joined by +: echo-local+drafting-index.`);
  }
  return style ? { base, style } : { base };
}

const BASE_FILES: Record<string, string> = {
  "app/layout.tsx": `import "./globals.css";

export const metadata = { title: "My app" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
`,
  "app/page.tsx": `export default function Home() {
  return (
    <main>
      <h1>My app</h1>
      <p>Welcome.</p>
    </main>
  );
}
`,
  "app/globals.css": "",
  ".gitignore": "node_modules/\n.next/\nnext-env.d.ts\n",
};

/** The Next.js app every setup starts from: React 19, TypeScript, an `@/` alias, npm. */
async function baseApp(root: string): Promise<void> {
  await writeApp(root, { framework: "next", name: "my-app", files: BASE_FILES, paths: { "@/*": ["./*"] } });
  await installBase(root, { pm: "npm", framework: "next", react: "19", quiet: true });
}

async function versionOf(root: string, pkg: string): Promise<string | undefined> {
  try {
    return (JSON.parse(await readFile(join(root, "node_modules", pkg, "package.json"), "utf8")) as { version: string }).version;
  } catch {
    return undefined;
  }
}

async function echoFacts(root: string, source: "npm" | "local"): Promise<AppFacts["echo"]> {
  const config = JSON.parse(await readFile(join(root, "echo.json"), "utf8")) as { dir: string; registry: string };
  const registry = config.registry.replace(/\/+$/, "");
  return {
    source,
    dir: config.dir.split(/[\\/]/).join("/"),
    registry,
    // The catalog sits next to /e/ as /r/catalog.json, locally and on the site.
    catalog: source === "local" ? join(repoRoot, "apps/www/public/r/catalog.json") : registry.replace(/\/e$/, "/r/catalog.json"),
    cli: await versionOf(root, "echo-ui-cli"),
    core: await versionOf(root, "echo-ui-core"),
  };
}

/** A step of a setup read from setups.json. */
type Step =
  | { install: string[]; dev?: boolean }
  | { write: string; content: string }
  | { run: string[] };

interface ExternalSetup {
  label?: string;
  steps: Step[];
}

async function externalSetups(): Promise<Record<string, ExternalSetup>> {
  try {
    return JSON.parse(await readFile(join(RESULTS_DIR, "setups.json"), "utf8")) as Record<string, ExternalSetup>;
  } catch {
    return {};
  }
}

export async function setupIds(): Promise<string[]> {
  return ["echo", "echo-local", ...Object.keys(await externalSetups())];
}

/** What an app wearing a style carries, from its echo.json. */
async function styleFacts(root: string): Promise<NonNullable<AppFacts["style"]>> {
  const config = JSON.parse(await readFile(join(root, "echo.json"), "utf8")) as {
    seed: { chassis: string };
    style: { name: string; title: string; from: "echo" | "yours" };
  };
  return {
    name: config.style.name,
    title: config.style.title,
    from: config.style.from,
    device: devicePolarity(config.seed.chassis),
    sha256: createHash("sha256").update(JSON.stringify({ seed: config.seed, style: config.style })).digest("hex"),
  };
}

/** Installs a setup into a fresh app at `root`. */
async function install_(setup: string, root: string): Promise<AppFacts> {
  const { base, style } = parseSetup(setup);
  const facts: AppFacts = { setup, preparedAt: new Date().toISOString() };
  await baseApp(root);

  if (base === "echo") {
    await run("npx", ["--yes", "echo-ui-cli@latest", "init", "--yes"], { cwd: root, quiet: true });
    facts.echo = await echoFacts(root, "npm");
  } else if (base === "echo-local") {
    const packs = await mkdtemp(join(WORK_DIR, "packs-"));
    const tarballs = await packEcho(packs, { quiet: true });
    const core = tarballs.find((t) => /echo-ui-core-/.test(t));
    const cli = tarballs.find((t) => /echo-ui-cli-/.test(t));
    if (!core || !cli) throw new Error(`packing Echo gave ${tarballs.join(", ")}`);
    await install("npm", root, [core], { quiet: true });
    await install("npm", root, [cli], { dev: true, quiet: true });
    const registry = pathToFileURL(join(repoRoot, "apps/www/public/e")).href;
    await run("node", [join(root, "node_modules/echo-ui-cli/index.js"), "init", "--yes", "--skip-install", "--registry", registry], {
      cwd: root,
      quiet: true,
    });
    await rm(packs, { recursive: true, force: true });
    facts.echo = await echoFacts(root, "local");
  } else {
    const external = (await externalSetups())[base];
    if (!external) throw new Error(`No setup "${base}". Setups: ${(await setupIds()).join(", ")}, each of Echo's with +<style> to wear one.`);
    for (const step of external.steps) {
      if ("install" in step) await install("npm", root, step.install, { dev: step.dev, quiet: true });
      else if ("write" in step) {
        await mkdir(join(root, step.write, ".."), { recursive: true });
        await writeFile(join(root, step.write), step.content);
      } else await run(step.run[0]!, step.run.slice(1), { cwd: root, quiet: true });
    }
  }

  if (style) {
    if (!facts.echo) throw new Error(`${base} isn't an Echo app, so it can't wear a style.`);
    const cli = facts.echo.source === "local" ? ["node", join(root, "node_modules/echo-ui-cli/index.js")] : ["npx", "--yes", "echo-ui-cli@latest"];
    const worn = await capture(cli[0]!, [...cli.slice(1), "style", "use", style], root);
    if (worn.code !== 0) throw new Error(`${setup}: \`style use ${style}\` failed:\n${worn.output.trim()}`);
    facts.style = await styleFacts(root);
  }

  // Everything so far is the setup's. The agent's work is whatever comes after.
  await run("git", ["init", "-q"], { cwd: root, quiet: true });
  await run("git", ["add", "-A"], { cwd: root, quiet: true });
  await run("git", ["-c", "user.name=bench", "-c", "user.email=bench@localhost", "commit", "-qm", "setup"], { cwd: root, quiet: true });
  await writeFile(join(root, ".git", "bench-app.json"), `${JSON.stringify(facts, null, 2)}\n`);
  return facts;
}

const exists = (path: string) => stat(path).then(() => true, () => false);

/**
 * The prepared app for a setup, built once and reused. `echo-local` (with
 * any style) is rebuilt every time it's asked for, because the working tree
 * it packs may have changed; `fresh` rebuilds any setup.
 */
export async function template(setup: string, { fresh = false } = {}): Promise<{ root: string; facts: AppFacts }> {
  const root = join(WORK_DIR, "templates", setup);
  const factsFile = join(root, ".git", "bench-app.json");
  if (!fresh && parseSetup(setup).base !== "echo-local" && (await exists(factsFile))) {
    return { root, facts: JSON.parse(await readFile(factsFile, "utf8")) as AppFacts };
  }
  await rm(root, { recursive: true, force: true });
  await mkdir(root, { recursive: true });
  const facts = await install_(setup, root);
  return { root, facts };
}

/** A copy of the template for one run. A clone on macOS, so it costs no disk and no time. */
export async function cloneApp(from: string, to: string): Promise<void> {
  await rm(to, { recursive: true, force: true });
  await mkdir(join(to, ".."), { recursive: true });
  if (process.platform === "darwin") {
    await new Promise<void>((ok, fail) => {
      const child = spawn("cp", ["-cR", from, to], { stdio: "ignore" });
      child.on("error", fail);
      child.on("close", (code) => (code === 0 ? ok() : fail(new Error(`cp exited with ${code}`))));
    });
  } else {
    await cp(from, to, { recursive: true, verbatimSymlinks: true, mode: constants.COPYFILE_FICLONE });
  }
}

/** The skills an app ships for the agent, by name. */
export async function projectSkills(root: string): Promise<string[]> {
  try {
    return (await readdir(join(root, ".claude", "skills"), { withFileTypes: true })).filter((d) => d.isDirectory()).map((d) => d.name);
  } catch {
    return [];
  }
}
