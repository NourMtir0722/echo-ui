import { test } from "node:test";
import assert from "node:assert/strict";

import { VERT, FRAG, hexToRgb } from "./shader";
import { createEchoTheme } from "echo-ui-core/theme";

test("hexToRgb normalises 6- and 3-digit hex", () => {
  assert.deepEqual(hexToRgb("#000000"), [0, 0, 0]);
  assert.deepEqual(hexToRgb("#ffffff"), [1, 1, 1]);
  assert.deepEqual(hexToRgb("#fff"), [1, 1, 1]);
  const [r, g, b] = hexToRgb("#DE3B74");
  assert.ok(Math.abs(r - 0xde / 255) < 1e-9);
  assert.ok(Math.abs(g - 0x3b / 255) < 1e-9);
  assert.ok(Math.abs(b - 0x74 / 255) < 1e-9);
});

test("hexToRgb rejects garbage", () => {
  assert.throws(() => hexToRgb("not-a-colour"), TypeError);
});

test("every accent-ramp stop converts to an in-range GL uniform", () => {
  for (const seed of [{}, { accent: "#2AA9A0" }, { accent: "#D98A2B" }]) {
    const { accentRamp } = createEchoTheme(seed, { quiet: true }).values;
    for (const stop of accentRamp) {
      for (const channel of hexToRgb(stop)) {
        assert.ok(channel >= 0 && channel <= 1, `${stop} out of range`);
      }
    }
  }
});

test("the shader declares the uniforms the component binds", () => {
  for (const name of ["uRes", "uTime", "uMouse", "cVoid", "cA", "cB", "cC"]) {
    assert.ok(FRAG.includes(name), `fragment shader is missing ${name}`);
  }
  assert.match(VERT, /attribute vec2 p;/, "the component binds an attribute named p");
  assert.match(FRAG, /gl_FragColor/);
});

test("the shader takes its colour only from uniforms — no baked palette", () => {
  // A hard-coded hue here would survive a reseed and reintroduce raspberry
  // residue on a teal theme, which the theme tests forbid everywhere else.
  assert.doesNotMatch(FRAG, /#[0-9a-fA-F]{3,8}\b/, "no hex literals in the shader");
  assert.doesNotMatch(FRAG, /vec3\s*\(\s*[0-9.]+\s*,\s*[0-9.]+\s*,\s*[0-9.]+\s*\)/, "no literal rgb triples");
});
