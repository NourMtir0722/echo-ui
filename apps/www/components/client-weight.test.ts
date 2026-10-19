import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * The docs manifest holds every component's metadata and its zod schema.
 * Imported by one client module, it lands in the scripts of every page that
 * module is on: the site nav imported it, and so every page, the homepage
 * included, downloaded all of it. Server components read it and hand client
 * components the plain data they draw.
 */
const www = join(dirname(fileURLToPath(import.meta.url)), "..");
const SERVER_ONLY = /from "@\/components\/(docs-manifest|site\/docs-nav)"/;

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (name === "node_modules" || name.startsWith(".")) return [];
    if (statSync(path).isDirectory()) return sources(path);
    return /\.(tsx?|mdx)$/.test(name) && !name.endsWith(".test.ts") ? [path] : [];
  });
}

test("no client module imports the docs manifest or the docs sections", () => {
  const offenders = [...sources(join(www, "components")), ...sources(join(www, "app"))]
    .filter((file) => /^\s*["']use client["']/.test(readFileSync(file, "utf8")))
    .filter((file) =>
      readFileSync(file, "utf8")
        .split("\n")
        .some((line) => SERVER_ONLY.test(line) && !/^import type /.test(line.trim())),
    )
    .map((file) => relative(www, file));
  assert.deepEqual(offenders, []);
});

/**
 * zod is how the metas describe their props, and the docs read them
 * on the server. Shipped to the browser it is 170KB, and zod 4 builds every
 * object schema by asking whether `eval` is allowed (`Function("")`, to compile
 * a faster parser), which a strict Content Security Policy reports on every
 * page that loads it. The templates page reached it: a client component took
 * the templates manifest, and the manifest takes two metas.
 *
 * Every client module is followed through what it imports (a module a client
 * component imports is client code too), and none may reach zod.
 */
const repo = join(www, "../..");
const ALIASES: [string, string][] = [
  ["@/", www],
  ["@registry/", join(repo, "registry/src")],
];

function resolveImport(from: string, spec: string): string | undefined {
  let base: string | undefined;
  for (const [alias, dir] of ALIASES) if (spec.startsWith(alias)) base = join(dir, spec.slice(alias.length));
  if (!base && spec.startsWith(".")) base = join(dirname(from), spec);
  if (!base) return undefined;
  for (const ext of [".ts", ".tsx", "/index.ts", "/index.tsx", ""]) {
    const path = base + ext;
    try {
      if (statSync(path).isFile()) return path;
    } catch {
      // not this one
    }
  }
  return undefined;
}

/** The chain from `file` to zod through value imports, or undefined. */
function pathToZod(file: string, seen = new Set<string>()): string[] | undefined {
  if (seen.has(file)) return undefined;
  seen.add(file);
  const source = readFileSync(file, "utf8");
  for (const match of source.matchAll(/^\s*(?:import|export)\s+(?!type\b)(?:[^;]*?\s+from\s+)?["']([^"']+)["']/gm)) {
    const spec = match[1]!;
    if (spec === "zod" || spec.startsWith("zod/")) return [relative(repo, file)];
    const next = resolveImport(file, spec);
    const rest = next && /\.tsx?$/.test(next) ? pathToZod(next, seen) : undefined;
    if (rest) return [relative(repo, file), ...rest];
  }
  return undefined;
}

test("no client module reaches zod", () => {
  const offenders = [...sources(join(www, "components")), ...sources(join(www, "app"))]
    .filter((file) => /^\s*["']use client["']/.test(readFileSync(file, "utf8")))
    .map((file) => pathToZod(file))
    .filter((chain): chain is string[] => chain !== undefined)
    .map((chain) => chain.join(" → "));
  assert.deepEqual(offenders, [], "zod belongs on the server: pass client components the plain data");
});
