import { test } from "node:test";
import assert from "node:assert/strict";
import { createEchoTheme } from "echo-ui-core/theme";

import { darkSeedOf, isLightSeed, lightSeedOf, onDevice, otherDevice } from "./device-seed";
import { SEED_PRESETS, STYLE_PRESETS, sameSeed } from "./seeds";

test("every preset has a light device of its own, with the same accent, and nothing unreadable on it", () => {
  for (const { name, seed } of SEED_PRESETS) {
    const light = lightSeedOf(seed);
    assert.equal(light.accent, seed.accent, name);
    assert.ok(isLightSeed(light), `${name}'s light seed makes a light device`);
    assert.deepEqual(createEchoTheme(light, { quiet: true }).report.unsatisfiable, [], name);
  }
});

test("switching a preset to light and back brings it back exactly", () => {
  for (const { seed } of SEED_PRESETS) assert.deepEqual(otherDevice(otherDevice(seed)), seed);
});

test("a seed of the visitor's own gets a dark counterpart in its own hue, and nothing unreadable on it", () => {
  const own = { accent: "#2AA9A0", chassis: "#E8EEF0", paper: "#1B2426" };
  const dark = darkSeedOf(own);
  assert.equal(isLightSeed(dark), false);
  assert.deepEqual(createEchoTheme(dark, { quiet: true }).report.unsatisfiable, []);
});

test("a colour picked on the light device stays on the light device, and one picked on the dark stays dark", () => {
  const preset = (name: string) => SEED_PRESETS.find((p) => p.name === name)!.seed;
  const nawwara = preset("Nawwara");
  const coral = preset("Coral");
  assert.deepEqual(onDevice(coral, lightSeedOf(nawwara)), lightSeedOf(coral));
  assert.deepEqual(onDevice(coral, nawwara), coral);
  // A pick that is already light is worn as it is, on either device.
  const pale = { accent: "#2AA9A0", chassis: "#E8EEF0", paper: "#1B2426" };
  assert.deepEqual(onDevice(pale, nawwara), pale);
  assert.deepEqual(onDevice(pale, lightSeedOf(nawwara)), pale);
  // So a preset reads as picked on both devices.
  assert.ok(sameSeed(onDevice(coral, lightSeedOf(coral)), lightSeedOf(coral)));
});

test("a style is worn as it is on either device, and the key leaves it for Echo's own on the other", () => {
  const drafting = STYLE_PRESETS.find((p) => p.seed.style === "drafting-index")!.seed;
  const nawwara = SEED_PRESETS[0]!.seed;
  assert.ok(isLightSeed(drafting), "Drafting Index is a light device");
  assert.deepEqual(onDevice(drafting, nawwara), drafting);
  assert.deepEqual(onDevice(drafting, lightSeedOf(nawwara)), drafting);
  // Its own device is light, so the key's other device is Echo's dark one.
  assert.deepEqual(otherDevice(drafting), nawwara);
  // A colour picked while it's worn is Echo's colour, on the light device the style was on.
  assert.deepEqual(onDevice(SEED_PRESETS[2]!.seed, drafting), lightSeedOf(SEED_PRESETS[2]!.seed));
});
