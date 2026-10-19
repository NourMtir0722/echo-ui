/**
 * The app as Echo's tests find it: its pages, where it's running, and
 * which pages a change touched. All of it from the project's own files, and
 * all of it overridden by echo.json's `test` when the project says.
 */
import { execFile } from "node:child_process";
import { readFile, readdir, stat } from "node:fs/promises";
import { join, posix, relative, sep } from "node:path";
import { promisify } from "node:util";

import type { Framework } from "@registry/agent/config-schema";
import { withoutTrailingSlashes } from "@echo-ui/client";

/** echo.json's `test`: what `test` and the Stop gate run on. */
export interface TestSettings {
  /** Where the app runs, `http://localhost:3000`. Found from the dev script when absent. */
  url?: string;
  /** The pages to test, as paths. Found from the app's routes when absent. */
  routes?: string[];
  /** Widths to test each page at. Default `[1280]`. */
  widths?: number[];
  /** `false` turns the Stop gate off; `test` still runs. */
  stop?: boolean;
}

export class TestSettingsError extends Error {}

/** echo.json's `test`, checked. */
export function readTestSettings(value: unknown): TestSettings {
  if (value === undefined) return {};
  const where = "echo.json's `test`";
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new TestSettingsError(`${where} should be an object with \`url\`, \`routes\`, \`widths\` or \`stop\`.`);
  const out: TestSettings = {};
  for (const [key, v] of Object.entries(value)) {
    if (key === "url") {
      if (typeof v !== "string" || !/^https?:\/\//.test(v)) throw new TestSettingsError(`${where}.url should be a URL, like "http://localhost:3000".`);
      out.url = withoutTrailingSlashes(v);
    } else if (key === "routes") {
      if (!Array.isArray(v) || v.some((r) => typeof r !== "string" || !r.startsWith("/"))) throw new TestSettingsError(`${where}.routes should be a list of paths, like ["/", "/pricing"].`);
      out.routes = v as string[];
    } else if (key === "widths") {
      if (!Array.isArray(v) || v.length === 0 || v.some((w) => typeof w !== "number" || w < 240 || w > 3840)) throw new TestSettingsError(`${where}.widths should be a list of widths in pixels, like [390, 1280].`);
      out.widths = v as number[];
    } else if (key === "stop") {
      if (typeof v !== "boolean") throw new TestSettingsError(`${where}.stop should be true or false.`);
      out.stop = v;
    } else throw new TestSettingsError(`${where} has \`${key}\`; it takes \`url\`, \`routes\`, \`widths\` and \`stop\`.`);
  }
  return out;
}

/* ------------------------------------------------------------------ routes */

const PAGE_FILE = /^page\.(tsx|jsx|ts|js|mdx|md)$/;
const SKIP_DIRS = new Set(["node_modules", ".next", ".git", "dist", "build", "out", "public"]);

const isDir = (path: string) => stat(path).then((s) => s.isDirectory(), () => false);

/** The App Router's folder: `app/` or `src/app/`. */
async function appDir(root: string): Promise<string | undefined> {
  for (const dir of ["app", "src/app"]) if (await isDir(join(root, dir))) return join(root, dir);
  return undefined;
}
async function pagesDir(root: string): Promise<string | undefined> {
  for (const dir of ["pages", "src/pages"]) if (await isDir(join(root, dir))) return join(root, dir);
  return undefined;
}

/**
 * A page file's route, or undefined when it has none to visit without
 * knowing more: a `[slug]` to fill in, a parallel `@slot`, a `_private` folder.
 */
export function routeOf(segments: readonly string[]): string | undefined {
  const parts: string[] = [];
  for (const segment of segments) {
    if (segment.startsWith("(") && segment.endsWith(")")) continue;
    if (segment.startsWith("@") || segment.startsWith("_") || segment.includes("[")) return undefined;
    parts.push(segment);
  }
  return `/${parts.join("/")}`;
}

/** A Pages Router file's route: `pages/pricing.tsx` is `/pricing`; `_app`, `api/` and `[id]` aren't pages to visit. */
export function pagesRouteOf(file: string): string | undefined {
  const parts = file.replace(/\.(tsx|jsx|ts|js|mdx|md)$/, "").split("/");
  if (parts[0] === "api" || parts.some((p) => p.startsWith("_") || p.includes("["))) return undefined;
  if (parts.at(-1) === "index") parts.pop();
  return `/${parts.join("/")}`;
}

async function walk(dir: string, visit: (path: string) => void): Promise<void> {
  for (const entry of await readdir(dir, { withFileTypes: true }).catch(() => [])) {
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) await walk(join(dir, entry.name), visit);
    } else visit(join(dir, entry.name));
  }
}

/** The page files the app has, each with its route. */
export async function pageFiles(root: string, framework: Framework): Promise<{ file: string; route: string }[]> {
  const pages: { file: string; route: string }[] = [];
  if (framework === "next" || framework === "unknown") {
    const app = await appDir(root);
    if (app) {
      await walk(app, (path) => {
        const rel = relative(app, path).split(sep);
        if (!PAGE_FILE.test(rel.at(-1)!)) return;
        const route = routeOf(rel.slice(0, -1));
        if (route) pages.push({ file: relative(root, path).split(sep).join("/"), route });
      });
    }
    const legacy = await pagesDir(root);
    if (legacy) {
      await walk(legacy, (path) => {
        const route = pagesRouteOf(relative(legacy, path).split(sep).join("/"));
        if (route && /\.(tsx|jsx|ts|js|mdx|md)$/.test(path)) pages.push({ file: relative(root, path).split(sep).join("/"), route });
      });
    }
  }
  return pages.sort((a, b) => a.route.localeCompare(b.route));
}

/** The pages to test: echo.json's list, else every page the app has, else its home. */
export async function appRoutes(root: string, framework: Framework, settings: TestSettings): Promise<string[]> {
  if (settings.routes?.length) return settings.routes;
  const found = [...new Set((await pageFiles(root, framework)).map((p) => p.route))];
  return found.length ? found : ["/"];
}

/* ------------------------------------------------------------------ server */

/** The port a dev script names: `next dev -p 3300`, `vite --port 5174`, `PORT=4000 …`. */
export function portOf(script: string | undefined): number | undefined {
  if (!script) return undefined;
  const found = /(?:-p|--port)[ =](\d{2,5})\b/.exec(script) ?? /\bPORT=(\d{2,5})\b/.exec(script);
  return found ? Number(found[1]) : undefined;
}

const DEFAULT_PORTS: Record<Framework, number[]> = { next: [3000], vite: [5173], unknown: [3000, 5173] };

/** Where the app should be running, in the order to try. */
export async function candidateUrls(root: string, framework: Framework, settings: TestSettings): Promise<string[]> {
  if (settings.url) return [settings.url];
  let scripts: Record<string, string> = {};
  try {
    scripts = (JSON.parse(await readFile(join(root, "package.json"), "utf8")) as { scripts?: Record<string, string> }).scripts ?? {};
  } catch {
    // No package.json: the framework's default port.
  }
  const ports = [portOf(scripts.dev), portOf(scripts.start), ...DEFAULT_PORTS[framework]].filter((p): p is number => p !== undefined);
  return [...new Set(ports)].map((port) => `http://localhost:${port}`);
}

/** Whether something answers at `url`, within a second and a half. */
export async function answers(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(1_500), redirect: "manual" });
    await response.body?.cancel();
    return true;
  } catch {
    return false;
  }
}

/** The first candidate that answers, or undefined when the app isn't running. */
export async function runningApp(root: string, framework: Framework, settings: TestSettings): Promise<string | undefined> {
  for (const url of await candidateUrls(root, framework, settings)) if (await answers(url)) return url;
  return undefined;
}

/* ------------------------------------------------------------------ changes */

const run = promisify(execFile);

/** Files changed since the last commit, tracked or new, as paths from the root; undefined outside git. */
export async function changedFiles(root: string): Promise<string[] | undefined> {
  try {
    const { stdout } = await run("git", ["status", "--porcelain", "--untracked-files=all"], { cwd: root });
    // Porcelain names files from the repository's root, and pages are named from
    // the app's: in a monorepo they're different folders. A file
    // outside the app keeps a `../` path, which no page has: it reads as shared.
    const prefix = (await run("git", ["rev-parse", "--show-prefix"], { cwd: root })).stdout.trim();
    return stdout
      .split("\n")
      .filter(Boolean)
      .map((line) => posix.relative(prefix || ".", line.slice(3).split(" -> ").at(-1)!.replace(/^"|"$/g, "")));
  } catch {
    return undefined;
  }
}

/** What a person sees: a change to one of these can change a page. */
const UI_FILE = /\.(tsx|jsx|ts|js|mdx|css|scss|sass|less|html|vue|svelte)$/;
const NOT_UI = /(^|\/)(node_modules|\.echo|\.next|dist|build|out)\/|(\.test|\.spec)\.[jt]sx?$|(^|\/)(tests?|e2e|scripts)\//;

/**
 * The pages a change touched: a page file's own route when only pages
 * changed, every page when anything they share did, none when nothing a
 * person sees changed.
 */
export function touchedRoutes(changed: readonly string[], pages: readonly { file: string; route: string }[], all: readonly string[]): string[] {
  const ui = changed.filter((f) => UI_FILE.test(f) && !NOT_UI.test(f));
  if (!ui.length) return [];
  const byFile = new Map(pages.map((p) => [p.file, p.route]));
  if (ui.every((f) => byFile.has(f))) return [...new Set(ui.map((f) => byFile.get(f)!))];
  return [...all];
}
