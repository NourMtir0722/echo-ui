import { test } from "node:test";
import assert from "node:assert/strict";
import { createEchoTheme } from "echo-ui-core/theme";

import { darkSeedOf, isLightSeed, lightSeedOf, onDevice, otherDevice } from "./device-seed";
import { SEED_PRESETS, STYLE_PRESETS, lookOf, sameSeed } from "./seeds";

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

test("a style opens on its own device, whichever device Echo was on", () => {
  const drafting = STYLE_PRESETS.find((p) => p.seed.style === "drafting-index")!.seed;
  const nawwara = SEED_PRESETS[0]!.seed;
  assert.ok(isLightSeed(drafting), "Drafting Index is a light device");
  assert.deepEqual(onDevice(drafting, nawwara), drafting);
  assert.deepEqual(onDevice(drafting, lightSeedOf(nawwara)), drafting);
  // A colour picked while it's worn is Echo's colour, on the light device the style was on.
  assert.deepEqual(onDevice(SEED_PRESETS[2]!.seed, drafting), lightSeedOf(SEED_PRESETS[2]!.seed));
});

test("the key turns a style over and leaves it that style: the ink and the paper change places, and back", () => {
  const drafting = STYLE_PRESETS.find((p) => p.seed.style === "drafting-index")!.seed;
  const turned = otherDevice(drafting);
  assert.equal(turned.style, "drafting-index");
  assert.equal(isLightSeed(turned), false);
  assert.equal(turned.chassis, drafting.paper);
  assert.equal(turned.paper, drafting.chassis);
  assert.equal(turned.accent, drafting.chassis, "one ink: its accent is the ink, so it turns too");
  assert.deepEqual(otherDevice(turned), drafting);
});

test("a style with a colour of its own keeps that colour when the key turns it over", () => {
  const own = { accent: "#3D8EF0", chassis: "#F2EEE6", paper: "#1A1A1A", style: "drafting-index" };
  assert.deepEqual(otherDevice(own), { accent: "#3D8EF0", chassis: "#1A1A1A", paper: "#F2EEE6", style: "drafting-index" });
});

test("a style turned over reads as well as the style itself: nothing the theme can't make legible", () => {
  for (const { name, seed } of STYLE_PRESETS) {
    assert.deepEqual(createEchoTheme(lookOf(otherDevice(seed)), { quiet: true }).report.unsatisfiable, [], name);
  }
});
