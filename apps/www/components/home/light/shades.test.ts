import { test } from "node:test";
import assert from "node:assert/strict";
import { hexToOklch } from "echo-ui-core/theme";

import { GRADIENT } from "./look";
import { shades } from "./shades";

const chromaOf = (hex: string) => hexToOklch(hex).C;

test("a colour with no hue lights the page in greys, on either device", () => {
  // Drafting Index's ink on its white paper, and turned over; and a plain grey a visitor can pick.
  for (const accent of ["#050505", "#FDFDFD", "#808080"]) {
    for (const light of [false, true]) {
      for (const shade of shades(accent, GRADIENT.hueDrift, light)) {
        assert.ok(chromaOf(shade) < 0.01, `${accent} on ${light ? "light" : "dark"} gave ${shade}, a colour`);
      }
    }
  }
});

test("a colour with a hue keeps it, deep to glow", () => {
  const stops = shades("#3D8EF0", GRADIENT.hueDrift);
  assert.equal(stops.length, 6);
  assert.ok(Math.max(...stops.map(chromaOf)) > 0.1);
  const hue = hexToOklch("#3D8EF0").H;
  assert.ok(Math.abs(hexToOklch(stops[2]!).H - hue) < 3, "the middle shade is the colour itself");
});
