import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const source = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "fonts.ts"), "utf8");

/** Each `localFont({ … })` call, by the CSS variable it declares. */
const faces = [...source.matchAll(/localFont\(\{([\s\S]*?)\n\}\);/g)].map((m) => ({
  variable: /variable: "([^"]+)"/.exec(m[1]!)?.[1],
  preloaded: !/preload:\s*false/.test(m[1]!),
}));

test("the site preloads only the faces its first paint uses", () => {
  // Five preloaded faces downloaded ahead of the stylesheets the homepage's first
  // paint waits for; on a throttled connection in CI the hero painted at 2,500 to
  // 2,800ms against a 2,500ms budget. The code face and the screen's dot matrix
  // load when they're used instead (display: swap).
  assert.equal(faces.length, 5, "five site faces");
  const preloaded = faces.filter((f) => f.preloaded).map((f) => f.variable);
  assert.deepEqual(preloaded, ["--site-font-display", "--site-font-text", "--brand-font-display"]);
});
