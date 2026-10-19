/**
 * Every screenshot test is named `visual: …`.
 *
 * Screenshot baselines exist for macOS only, so CI (Linux) runs Playwright
 * with --grep-invert "visual:" (.github/workflows/ci.yml). A screenshot test
 * named anything else runs in CI, finds no Linux baseline, and fails.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

import { registryRoot } from "./docs/program";

const testsDir = resolve(registryRoot, "../tests");

test("every Playwright test that takes a screenshot is named `visual: …`", () => {
  const problems: string[] = [];
  for (const file of readdirSync(testsDir).filter((f) => f.endsWith(".spec.ts"))) {
    const src = readFileSync(join(testsDir, file), "utf8");
    for (const shot of src.matchAll(/toHaveScreenshot\(/g)) {
      // The nearest test( before the assertion is the test it belongs to.
      const before = src.slice(0, shot.index);
      const calls = [...before.matchAll(/\btest\(\s*(`[^`]*`|"[^"]*"|'[^']*')/g)];
      const title = calls.at(-1)?.[1] ?? "(no enclosing test found)";
      if (!title.includes("visual:")) {
        const line = before.split("\n").length;
        problems.push(`${file}:${line}: screenshot test ${title} isn't named "visual: …"`);
      }
    }
  }
  assert.deepEqual(problems, [], `\n  ${problems.join("\n  ")}`);
});
