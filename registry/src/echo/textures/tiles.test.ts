import { test } from "node:test";
import assert from "node:assert/strict";

import { bayer, ditherUri, noiseUri, ditherTile, noiseTile } from "./tiles";

test("bayer(1) is the trivial matrix", () => {
  assert.deepEqual(bayer(1), [[0]]);
});

for (const n of [2, 4, 8]) {
  test(`bayer(${n}) is a permutation of 0..${n * n - 1}`, () => {
    const m = bayer(n);
    assert.equal(m.length, n);
    for (const row of m) assert.equal(row.length, n);
    const flat = m.flat().sort((a, b) => a - b);
    assert.deepEqual(
      flat,
      Array.from({ length: n * n }, (_, i) => i),
      "every threshold appears exactly once — otherwise the dither clumps",
    );
  });
}

test("bayer rejects non-power-of-two sides", () => {
  assert.throws(() => bayer(3), RangeError);
  assert.throws(() => bayer(0), RangeError);
});

test("dither tiles are inline SVG data URIs with one rect per cell", () => {
  const uri = ditherUri(8, "dark");
  assert.ok(uri.startsWith("data:image/svg+xml,"), "no network, no asset files");
  const decoded = decodeURIComponent(uri.slice("data:image/svg+xml,".length));
  assert.equal((decoded.match(/<rect/g) ?? []).length, 64);
  assert.match(decoded, /width='16' height='16'/);
});

test("dither tone picks the ink", () => {
  const dark = decodeURIComponent(ditherTile.dark);
  const light = decodeURIComponent(ditherTile.light);
  assert.ok(dark.includes("rgba(0,0,0,"), "dark ink deepens");
  assert.ok(light.includes("rgba(255,255,255,"), "light ink lifts");
  assert.notEqual(ditherTile.dark, ditherTile.light);
});

test("noise tiles differ by grain and carry a stitched turbulence filter", () => {
  const fine = decodeURIComponent(noiseTile.fine);
  assert.match(fine, /feTurbulence type='fractalNoise'/);
  assert.match(fine, /stitchTiles='stitch'/, "unstitched tiles show visible seams");
  assert.notEqual(noiseTile.fine, noiseTile.coarse);
  assert.ok(noiseUri(0.5, 2).startsWith("data:image/svg+xml,"));
});

test("importing the texture tiles touches no browser globals at module scope", async () => {
  // The module is already imported above; if it had touched window/document
  // under Node it would have thrown before this test ran.
  assert.equal(typeof globalThis.window, "undefined");
  assert.ok(ditherTile.dark.length > 0);
});
