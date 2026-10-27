import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * What the homepage loads before it can answer a press: every module its
 * client tree imports statically (Next splits `import()` and
 * `next/dynamic` into chunks of their own, fetched when called). three.js
 * isn't one of them: the 3D Echo, the ChatGPT moment and the paper sheets each
 * load it in their own chunk, when they're needed (Echo3D.tsx), so it never
 * stands between a visitor and the first screen.
 */
const www = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const registry = resolve(www, "../../registry/src");

/** A specifier, resolved to a file on disk (null: a package). */
function resolveFrom(from: string, spec: string): string | null {
  let base: string;
  if (spec.startsWith("@/")) base = join(www, spec.slice(2));
  else if (spec.startsWith("@registry/")) base = join(registry, spec.slice("@registry/".length));
  else if (spec.startsWith(".")) base = resolve(dirname(from), spec);
  else return null;
  for (const f of [base, `${base}.ts`, `${base}.tsx`, join(base, "index.ts"), join(base, "index.tsx")]) {
    if (/\.tsx?$/.test(f) && existsSync(f)) return f;
  }
  return null;
}

/** The modules a file imports for their values: `import type`, `export type` and `import()` don't count. */
function staticImports(source: string): string[] {
  const out: string[] = [];
  const re = /^\s*(import|export)\s+(type\s+)?([^;]*?)\s*from\s*["']([^"']+)["']/gms;
  for (const m of source.matchAll(re)) if (!m[2]) out.push(m[4]!);
  for (const m of source.matchAll(/^\s*import\s+["']([^"']+)["']/gm)) out.push(m[1]!);
  return out;
}

test("the homepage's first load imports no three.js: the 3D loads in its own chunks, when it's needed", () => {
  const start = join(www, "components/home/HomePage.tsx");
  const seen = new Set<string>();
  const found: string[] = [];
  const walk = (file: string, via: string[]) => {
    if (seen.has(file)) return;
    seen.add(file);
    for (const spec of staticImports(readFileSync(file, "utf8"))) {
      if (/^(three|@react-three\/)/.test(spec)) found.push(`${[...via, file].map((f) => f.replace(`${www}/`, "")).join(" → ")} → ${spec}`);
      const next = resolveFrom(file, spec);
      if (next) walk(next, [...via, file]);
    }
  };
  walk(start, []);
  assert.ok(seen.size > 50, `walked only ${seen.size} modules: the walk has lost its way`);
  assert.deepEqual(found, []);
});
