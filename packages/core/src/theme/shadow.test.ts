import { test } from "node:test";
import assert from "node:assert/strict";

import { createEchoTheme } from "./create-echo-theme";
import { SHADOW_RECIPES, shadowValue, type ShadowName } from "./shadow";

const names = Object.keys(SHADOW_RECIPES) as ShadowName[];

test("the theme declares every shadow recipe, with the gloss and shade it reads", () => {
  const { css } = createEchoTheme({}, { quiet: true });
  for (const name of names) {
    assert.ok(css.includes(`  --echo-shadow-${name}: ${shadowValue(name)};`), `--echo-shadow-${name} is missing or changed`);
  }
  // Declared in the same block as what they read, so they resolve with its values.
  const block = css.slice(0, css.indexOf("}"));
  assert.match(block, /--echo-gloss:/);
  assert.match(block, /--echo-shade:/);
  assert.match(block, /--echo-shadow-well:/);
});

test("a scoped theme carries the recipes too, so they read its own roles", () => {
  const { css } = createEchoTheme({ accent: "#F2674E" }, { selector: ".coral-device", quiet: true });
  const block = css.slice(css.indexOf(".coral-device {"), css.indexOf("}"));
  for (const name of names) assert.ok(block.includes(`--echo-shadow-${name}:`), name);
});

test("a recipe is its layers, in order", () => {
  assert.equal(shadowValue("ring"), "0 0 0 2px var(--echo-surface), 0 0 0 4px var(--echo-accent-ink, var(--echo-accent-glow))");
  for (const name of names) assert.ok(SHADOW_RECIPES[name].layers.length > 0, name);
});
