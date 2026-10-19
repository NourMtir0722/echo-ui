/**
 * `echo-ui-core` runs in a browser, so it may not assume Node's globals.
 *
 * This package is the one thing every Echo install pulls in, and it is
 * published compiled — so a bare `process.env.NODE_ENV` in the source reaches
 * `dist/` verbatim and is evaluated in whatever the consumer's app is. Under a
 * bundler that replaces it, that is fine. Under anything that does not — a
 * plain ESM import, a CDN, a worker, a test runner without the define — it is
 * `ReferenceError: process is not defined`, thrown from the first call to
 * `createEchoTheme`, which is the first thing an Echo app does.
 *
 * Three copied components once had this exact shape, and the fix there was
 * to stop assuming the global. The package was never checked, because the repo
 * type-checks it with `"types": ["node"]`, where the assumption is true.
 * `registry/tsconfig.shipped.json` is what finally surfaced it.
 *
 * Guarded access is what passes: `typeof process !== "undefined" && …`.
 *
 * The rule is "a file that mentions a Node global must also guard it", not
 * "every read is individually guarded" — because the guarded form reads the
 * global a second time on the right-hand side of the `&&`, and telling those
 * apart needs a parser rather than a regex. It catches the failure that
 * actually happens, which is a file reaching for `process` having never
 * considered that it might not be there.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SRC = resolve(dirname(fileURLToPath(import.meta.url)));

/** Every shipped source file: no tests, no type-only declarations. */
function shippedSources(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      out.push(...shippedSources(path));
    } else if (/\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) && !name.endsWith(".d.ts")) {
      out.push(path);
    }
  }
  return out;
}

const NODE_GLOBALS = ["process", "__dirname", "__filename", "Buffer", "global"];

test("no shipped module reads a Node global without guarding it", () => {
  const offences: string[] = [];
  for (const path of shippedSources(SRC)) {
    const code = readFileSync(path, "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^[ \t]*\/\/.*$/gm, "");

    // A `declare const process: …` is a type declaration, not a read.
    const reads = code.replace(/^\s*declare\s+[^;]*;/gm, "");

    for (const global of NODE_GLOBALS) {
      const mentioned = new RegExp(`(?<![\\w.$])${global}(?![\\w$])`).test(reads);
      if (!mentioned) continue;
      const guarded = new RegExp(`typeof\\s+${global}\\s*!==?\\s*["']undefined["']`).test(reads);
      if (!guarded) {
        offences.push(`${relative(SRC, path)} reads \`${global}\` with no typeof guard anywhere`);
      }
    }
  }
  assert.deepEqual(
    offences,
    [],
    "this package is published compiled and runs in a browser — guard it, or do not use it",
  );
});
