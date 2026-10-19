/**
 * The docs lock (docs freshness test E).
 *
 * `docs-lock.json` records a hash of each item's shipped source files — the
 * files registry.json installs, so NOT meta.ts, which is the docs. When the
 * source changes, the hash no longer matches, and lock.test.ts fails until
 * someone has looked at that item's docs and run `pnpm docs:ack <item>`.
 *
 * It is noisy on purpose: a refactor that changes nothing a reader can see
 * still asks the question. Acking is one command, and the question is cheap
 * next to a page that quietly describes last month's component.
 */
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync, writeFileSync, existsSync } from "node:fs";
import { relative, resolve } from "node:path";

import { META_DIRS } from "../../src/agent/metas";
import { GUIDE_SOURCES } from "./guide-sources";
import { CORE_DIRS, itemDir, registryRoot } from "./program";

export const LOCK_PATH = resolve(registryRoot, "docs-lock.json");

interface RegistryItem {
  name: string;
  files: { path: string }[];
}

/**
 * Every item whose docs are locked: registry.json's, plus the echo-ui-core
 * modules, whose files are their source in packages/core (tests excluded).
 */
export function registryItems(): RegistryItem[] {
  const items = (JSON.parse(readFileSync(resolve(registryRoot, "registry.json"), "utf8")) as { items: RegistryItem[] }).items;
  const core = Object.entries(META_DIRS)
    .filter(([, dir]) => dir in CORE_DIRS)
    .map(([name, dir]) => ({
      name,
      files: readdirSync(itemDir(dir))
        .filter((f) => !f.endsWith(".test.ts"))
        .map((f) => ({ path: relative(registryRoot, resolve(itemDir(dir), f)) })),
    }));
  return [...items, ...core];
}

export const repoRoot = resolve(registryRoot, "..");
export const GUIDES_DIR = resolve(repoRoot, "apps/www/app/docs/(guides)");

/** Every file a source path means: the file, or a folder's files, tests aside. */
function filesUnder(path: string): string[] {
  const abs = resolve(repoRoot, path);
  if (!statSync(abs).isDirectory()) return [abs];
  return readdirSync(abs, { withFileTypes: true }).flatMap((entry) => {
    const child = resolve(abs, entry.name);
    if (entry.isDirectory()) return filesUnder(relative(repoRoot, child));
    return /\.(test|spec)\.tsx?$/.test(entry.name) ? [] : [child];
  });
}

/**
 * Every guide that describes code, as a lock item named `guide:<folder>`:
 * its files are the code it makes claims about (guide-sources.ts).
 */
export function guideItems(): RegistryItem[] {
  return Object.entries(GUIDE_SOURCES)
    .filter((entry): entry is [string, readonly string[]] => Array.isArray(entry[1]))
    .map(([name, paths]) => ({
      name: `guide:${name}`,
      files: [...new Set(paths.flatMap(filesUnder))].map((abs) => ({ path: relative(registryRoot, abs) })),
    }));
}

/** The guide folders the site has; `introduction` is the docs root's own page. */
export function guideFolders(): string[] {
  const folders = readdirSync(GUIDES_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory() && existsSync(resolve(GUIDES_DIR, e.name, "content.mdx")))
    .map((e) => e.name);
  return ["introduction", ...folders];
}

/** sha256 over each file's path and contents, in path order, line endings normalized. */
export function hashItem(item: RegistryItem): string {
  const h = createHash("sha256");
  for (const f of [...item.files].sort((a, b) => a.path.localeCompare(b.path))) {
    h.update(f.path).update("\0");
    h.update(readFileSync(resolve(registryRoot, f.path), "utf8").replace(/\r\n/g, "\n")).update("\0");
  }
  return h.digest("hex").slice(0, 16);
}

export function readLock(): Record<string, string> {
  return existsSync(LOCK_PATH) ? (JSON.parse(readFileSync(LOCK_PATH, "utf8")) as Record<string, string>) : {};
}

export function writeLock(lock: Record<string, string>): void {
  const sorted = Object.fromEntries(Object.entries(lock).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(LOCK_PATH, `${JSON.stringify(sorted, null, 2)}\n`);
}
