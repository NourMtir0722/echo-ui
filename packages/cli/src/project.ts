/**
 * What the CLI knows about the project it is run in.
 *
 * Detection is all evidence from the disk — a lockfile, a dependency, a `src/`
 * folder — and every answer it produces can be overridden by a flag. Outside
 * the support baseline it says so and stops, rather than writing half an
 * install into a project it doesn't understand.
 */
import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import { dirname, join, resolve, sep } from "node:path";

export const DEFAULT_REGISTRY = "https://echo-ui.com/e";

export type { Framework, PackageManager } from "@registry/agent/config-schema";
import type { Framework, PackageManager } from "@registry/agent/config-schema";
import type { AppliedStyle } from "@registry/agent/style-schema";

export interface EchoConfig {
  $schema?: string;
  /** One folder; every copied item lives under it. */
  dir: string;
  framework: Framework;
  packageManager: PackageManager;
  registry: string;
  /** The seed the theme and DESIGN.md are made from (`init --seed`, `style use`); Echo's defaults when absent. */
  seed?: Record<string, unknown>;
  /** The style the project wears (`style use`): what DESIGN.md tells the agent. */
  style?: AppliedStyle;
  /** The team's own additions to `check` (see registry/src/agent/config-schema.ts). */
  check?: unknown;
  /** What `test` and the Stop gate run on (check/app.ts). */
  test?: unknown;
}

export interface LockFile {
  lockVersion: 1;
  core: string;
  items: Record<string, { version: string; files: Record<string, string> }>;
}

export const CONFIG_FILE = "echo.json";
export const LOCK_FILE = "echo-lock.json";

const exists = (path: string) => access(path).then(() => true, () => false);

async function readJson<T>(path: string): Promise<T | undefined> {
  try {
    return JSON.parse(await readFile(path, "utf8")) as T;
  } catch {
    return undefined;
  }
}

/** One of Echo's own files is there but can't be read as what it is. */
export class ProjectFileError extends Error {}

/**
 * Echo's own files, echo.json and echo-lock.json: undefined only when the
 * file isn't there. One that's there and isn't a JSON object stops whatever
 * was reading it, with the file's name: read as missing, it turned the check
 * off and let `init` write over the team's seed and rules.
 */
async function readEchoFile<T>(root: string, file: string, keeps: string): Promise<T | undefined> {
  let text: string;
  try {
    text = await readFile(join(root, file), "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw new ProjectFileError(`${file} can't be read: ${(error as Error).message}`);
  }
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch (error) {
    throw new ProjectFileError(`${file} isn't valid JSON (${(error as Error).message}). It ${keeps}, so nothing was written: fix the file, or take it back from version control, and run this again.`);
  }
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new ProjectFileError(`${file} isn't valid JSON for Echo: it has to be an object. It ${keeps}, so nothing was written.`);
  }
  return value as T;
}

export async function writeJson(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
}

/** The package manager, from whichever lockfile is in the project. */
export async function detectPackageManager(root: string): Promise<PackageManager> {
  const lockfiles: [string, PackageManager][] = [
    ["pnpm-lock.yaml", "pnpm"],
    ["bun.lockb", "bun"],
    ["bun.lock", "bun"],
    ["yarn.lock", "yarn"],
    ["package-lock.json", "npm"],
  ];
  for (const [file, manager] of lockfiles) {
    if (await exists(join(root, file))) return manager;
  }
  return "npm";
}

/** Next or Vite, from the app's own dependencies — not from a parent in a monorepo. */
export async function detectFramework(root: string): Promise<Framework> {
  const pkg = await readJson<{ dependencies?: Record<string, string>; devDependencies?: Record<string, string> }>(
    join(root, "package.json"),
  );
  const deps = { ...pkg?.dependencies, ...pkg?.devDependencies };
  if (deps.next) return "next";
  if (deps.vite) return "vite";
  return "unknown";
}

/** `src/components/echo` where there's a `src/`, else `components/echo`. */
export async function defaultDir(root: string): Promise<string> {
  return (await exists(join(root, "src"))) ? join("src", "components", "echo") : join("components", "echo");
}

export interface BaselineProblem {
  what: string;
  fix: string;
}

/**
 * The support baseline, checked before anything is written.
 * TypeScript is required: Echo ships `.tsx`, and a JavaScript project would
 * install files it cannot compile.
 */
export async function checkBaseline(
  root: string,
  framework: Framework,
  nodeVersion: string = process.versions.node,
): Promise<BaselineProblem[]> {
  const problems: BaselineProblem[] = [];
  if (!(await exists(join(root, "package.json")))) {
    problems.push({
      what: "There's no package.json here.",
      fix: "Run this inside your app's folder — in a monorepo that's the app, not the repo root.",
    });
    return problems;
  }
  if (framework === "unknown") {
    problems.push({
      what: "This doesn't look like a Next.js or Vite app.",
      fix: "Echo supports Next.js (App Router) and Vite + React. Add one, or install the files by hand from the docs.",
    });
  }
  const hasTsconfig = (await exists(join(root, "tsconfig.json"))) || (await exists(join(root, "jsconfig.json")));
  if (!hasTsconfig) {
    problems.push({
      what: "No tsconfig.json.",
      fix: "Echo's components are TypeScript (.tsx). Add TypeScript to the project first.",
    });
  }
  const react = await readJson<{ dependencies?: Record<string, string> }>(join(root, "package.json"));
  if (!react?.dependencies?.react) {
    problems.push({ what: "React isn't a dependency of this project.", fix: "Install react and react-dom first." });
  } else {
    // What's declared when it names a version, else what's installed; with neither there's nothing to go on.
    const version =
      declaredVersion(react.dependencies.react) ??
      (await readJson<{ version?: string }>(join(root, "node_modules", "react", "package.json")))?.version;
    if (version && Number(version.split(".")[0]) < 18) {
      problems.push({
        what: `This project is on React ${version}.`,
        fix: "Echo needs React 18 or later (echo-ui-core's peer range, and the hooks its components use). Upgrade react and react-dom first.",
      });
    }
  }
  // Each component imports its own stylesheet, and the Pages Router takes global CSS only from `pages/_app`:
  // its build refuses every one. An app with both routers is fine, for its App Router's pages.
  if (framework === "next") {
    const has = async (dir: string) => (await exists(join(root, dir))) || (await exists(join(root, "src", dir)));
    if ((await has("pages")) && !(await has("app"))) {
      problems.push({
        what: "This is a Next.js Pages Router app.",
        fix: "Echo's components import their own CSS, and the Pages Router only takes CSS imported in pages/_app. Echo supports the App Router: add an app/ folder and use Echo in the pages there.",
      });
    }
  }
  if (Number(nodeVersion.split(".")[0]) < 20) {
    problems.push({
      what: `This is Node ${nodeVersion}.`,
      fix: "echo-ui-cli runs on Node 20 or later. Upgrade Node, then run this again.",
    });
  }
  return problems;
}

/**
 * The version inside a declared dependency — `^0.1.0` → `0.1.0` — or nothing.
 *
 * Only an exact `major.minor.patch` is an answer. Stripping the leading
 * non-digits instead turned `^1` into `1`, which the range parser throws on
 * (and the throw escaped `add` entirely), and `workspace:*`, `latest` and `*`
 * into `""`, which skipped the core check without saying so and was then
 * written into the lock as the installed version.
 */
export function declaredVersion(declared: string): string | undefined {
  return /(?<![.\d])\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?/.exec(declared)?.[0];
}

/** The core version the project has, so an item can say it needs a newer one. */
export async function installedCore(root: string): Promise<string | undefined> {
  for (const path of [
    join(root, "node_modules", "echo-ui-core", "package.json"),
    join(root, "package.json"),
  ]) {
    try {
      const pkg = JSON.parse(await readFile(path, "utf8")) as {
        name?: string;
        version?: string;
        dependencies?: Record<string, string>;
      };
      if (pkg.name === "echo-ui-core" && pkg.version) return pkg.version;
      const declared = pkg.dependencies?.["echo-ui-core"];
      if (declared) return declaredVersion(declared);
    } catch {
      /* try the next one */
    }
  }
  return undefined;
}

/** The project's echo.json, or undefined when there isn't one. Throws ProjectFileError when it can't be read. */
export async function readConfig(root: string): Promise<EchoConfig | undefined> {
  return readEchoFile<EchoConfig>(root, CONFIG_FILE, "holds this project's folder, seed, style and rules");
}

/** The project's echo-lock.json, or undefined when there isn't one. Throws ProjectFileError when it can't be read. */
export async function readLock(root: string): Promise<LockFile | undefined> {
  return readEchoFile<LockFile>(root, LOCK_FILE, "records which files are Echo's");
}

/**
 * Where a file lands, checked again at the last moment: the resolved path has
 * to stay inside the Echo folder whatever the registry said.
 */
export function resolveInside(dir: string, relative: string): string {
  const base = resolve(dir);
  const target = resolve(base, relative);
  if (target !== base && !target.startsWith(base + sep)) {
    throw new Error(`Refusing to write ${relative}: it lands outside ${dir}.`);
  }
  return target;
}
