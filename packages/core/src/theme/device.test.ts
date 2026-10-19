import { test } from "node:test";
import assert from "node:assert/strict";

import { createEchoTheme } from "./create-echo-theme";
import { EchoSeed } from "./seed";
import { CONTROL_HEIGHT, RADIUS_SCALE, SPACE_SCALE } from "./scales";
import { KEY_LIGHT_ANGLE, glossFactor, radiusFactor, shadeFactor } from "./device";

const token = (css: string, name: string): string => {
  const m = new RegExp(`--echo-${name}: ([^;]+);`).exec(css);
  assert.ok(m, `--echo-${name} is emitted`);
  return m[1]!;
};
const px = (v: string) => Number(v.replace("px", ""));

test("the default device is today's look exactly: every factor is 1 and every scale unchanged", () => {
  const { css } = createEchoTheme({}, { quiet: true });
  assert.equal(token(css, "gloss"), "1");
  assert.equal(token(css, "shade"), "1");
  assert.equal(token(css, "density"), "1");
  assert.equal(token(css, "radius-scale"), "1");
  for (const [step, value] of Object.entries(RADIUS_SCALE)) assert.equal(token(css, `radius-${step}`), value);
  for (const [step, value] of Object.entries(SPACE_SCALE)) assert.equal(token(css, `space-${step}`), value);
  for (const [step, value] of Object.entries(CONTROL_HEIGHT)) assert.equal(token(css, `control-${step}`), value);
});

test("finish runs from matte to glossy: highlights and shadows move the right way", () => {
  assert.ok(glossFactor(0) < glossFactor(0.5) && glossFactor(0.5) < glossFactor(1));
  assert.ok(shadeFactor(0) < shadeFactor(0.5) && shadeFactor(0.5) < shadeFactor(1));
  const matte = createEchoTheme({ finish: 0 }, { quiet: true }).css;
  const glossy = createEchoTheme({ finish: 1 }, { quiet: true }).css;
  assert.ok(Number(token(matte, "gloss")) < 1 && Number(token(glossy, "gloss")) > 1);
});

test("radius runs from crisp to soft, and `full` stays a pill", () => {
  assert.ok(radiusFactor(0) < 1 && radiusFactor(1) > 1);
  const crisp = createEchoTheme({ radius: 0 }, { quiet: true }).css;
  const soft = createEchoTheme({ radius: 1 }, { quiet: true }).css;
  assert.ok(px(token(crisp, "radius-md")) < px(RADIUS_SCALE.md));
  assert.ok(px(token(soft, "radius-md")) > px(RADIUS_SCALE.md));
  assert.equal(token(crisp, "radius-full"), RADIUS_SCALE.full);
  assert.equal(token(soft, "radius-full"), RADIUS_SCALE.full);
});

test("density scales spacing and controls; compact never takes a control under 24px", () => {
  const compact = createEchoTheme({ density: "compact" }, { quiet: true }).css;
  const comfortable = createEchoTheme({ density: "comfortable" }, { quiet: true }).css;
  for (const step of Object.keys(CONTROL_HEIGHT)) {
    const def = px(CONTROL_HEIGHT[step as keyof typeof CONTROL_HEIGHT]);
    assert.ok(px(token(compact, `control-${step}`)) < def);
    assert.ok(px(token(compact, `control-${step}`)) >= 24, `compact control-${step} is at least 24px`);
    assert.ok(px(token(comfortable, `control-${step}`)) > def);
  }
  assert.ok(px(token(compact, "space-8")) < px(SPACE_SCALE["8"]));
  assert.ok(px(token(comfortable, "space-8")) > px(SPACE_SCALE["8"]));
});

test("the key light is grammar: fixed at 145°, not part of the seed", () => {
  const { css, values } = createEchoTheme({ keyAngle: 30 } as never, { quiet: true });
  assert.equal(values.keyAngle, KEY_LIGHT_ANGLE);
  assert.equal(token(css, "key-angle"), "145deg");
  assert.equal("keyAngle" in EchoSeed.parse({ keyAngle: 30 } as never), false);
});

test("out-of-range device settings are rejected with a message that names them", () => {
  assert.throws(() => EchoSeed.parse({ finish: 1.5 }), /finish must be a number from 0 to 1/);
  assert.throws(() => EchoSeed.parse({ radius: -0.1 }), /radius must be a number from 0 to 1/);
  assert.throws(() => EchoSeed.parse({ density: "tight" as never }), /density must be one of compact, default, comfortable/);
});
