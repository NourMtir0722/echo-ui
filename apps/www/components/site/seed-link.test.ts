import { test } from "node:test";
import assert from "node:assert/strict";

import { generatorLink } from "@registry/agent/generator-link";

import { seedFromSearch, seedLink } from "./seed-link";
import { DEFAULT_SEED, SEED_PRESETS, STYLE_PRESETS } from "./seeds";
import { createEchoTheme } from "echo-ui-core/theme";
import { formatRatio, primaryLabelContrast } from "./label-contrast";

test("a seed survives the round trip through its link", () => {
  for (const { seed } of SEED_PRESETS) {
    const link = new URL(seedLink("https://example.com", seed));
    assert.equal(link.pathname, "/generator");
    assert.deepEqual(seedFromSearch(link.search), {
      accent: seed.accent.toUpperCase(),
      chassis: seed.chassis.toUpperCase(),
      paper: seed.paper.toUpperCase(),
    });
  }
});

test("the link Echo's MCP server hands a builder opens the site on that style's colours", () => {
  // The hosted server's wear_style builds its links in the registry; the site reads them here.
  const seed = { accent: "#3D8EF0", chassis: "#F2EEE6", paper: "#1A1A1A" };
  const link = new URL(generatorLink(seed));
  assert.equal(link.pathname, "/generator");
  assert.deepEqual(seedFromSearch(link.search), seed);
  // A style that leaves a colour out gets Echo's, as the theme would give it.
  assert.deepEqual(seedFromSearch(new URL(generatorLink({ accent: "#3D8EF0" })).search), { ...DEFAULT_SEED, accent: "#3D8EF0" });
});

test("the link Echo's MCP server hands a builder for a style Echo publishes opens the site on the style, whole", () => {
  const { seed } = STYLE_PRESETS.find((p) => p.seed.style === "drafting-index")!;
  assert.deepEqual(seedFromSearch(new URL(generatorLink(seed, seed.style)).search), seed);
});

test("the link carries no '#', so pasting it can't turn the colours into a fragment", () => {
  assert.doesNotMatch(seedLink("https://example.com", DEFAULT_SEED), /#|%23/);
});

test("a link naming only the accent takes the rest from the default seed", () => {
  assert.deepEqual(seedFromSearch("?accent=3d8ef0"), { ...DEFAULT_SEED, accent: "#3D8EF0" });
  assert.deepEqual(seedFromSearch("?accent=%233D8EF0"), { ...DEFAULT_SEED, accent: "#3D8EF0" });
});

test("a link with no seed, or a broken colour, is ignored whole", () => {
  assert.equal(seedFromSearch(""), null);
  assert.equal(seedFromSearch("?utm_source=x"), null);
  assert.equal(seedFromSearch("?accent=3d8ef0&paper=nope"), null);
  assert.equal(seedFromSearch("?accent=3d8"), null);
});

test("the readout rounds down, so it never shows a fail as a pass", () => {
  assert.equal(formatRatio(4.4999), "4.49");
  assert.equal(formatRatio(4.5), "4.50");
  assert.equal(formatRatio(12.345), "12.34");
});

test("the primary label clears 4.5:1 on every preset, measured as the contract test measures it", () => {
  for (const { name, seed } of SEED_PRESETS) {
    const ratio = primaryLabelContrast(createEchoTheme(seed).values);
    assert.ok(ratio >= 4.5, `${name}: ${ratio.toFixed(2)}:1`);
  }
});

test("a style travels by name: its link opens it whole, and a style Echo doesn't publish is ignored", () => {
  for (const { seed } of STYLE_PRESETS) {
    const link = new URL(seedLink("https://example.com", seed));
    assert.equal(link.searchParams.get("style"), seed.style);
    assert.deepEqual(seedFromSearch(link.search), seed);
    // The name alone is enough: its colours come with it.
    assert.deepEqual(seedFromSearch(`?style=${seed.style}`), seed);
  }
  assert.equal(seedFromSearch("?style=bokeh-garden"), null);
  assert.equal(seedFromSearch("?style=bokeh-garden&accent=3d8ef0"), null);
});
