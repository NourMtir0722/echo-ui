import { test } from "node:test";
import assert from "node:assert/strict";
import { AA_LARGE, AA_NORMAL, contrastRatio, createEchoTheme, hexToOklch } from "echo-ui-core/theme";
import { FAMILY_ROLES, inkFamily, renderFamilyVars, seedFamily } from "./family";
import { lookOf, STYLE_PRESETS } from "./seeds";
import { siteTheme } from "./site-theme";
import { SEED_PRESETS } from "./theme-store";

/** Every seed the site offers, and the ones a colour picker can reach that have no hue. */
const SEEDS = [...SEED_PRESETS.map((p) => p.seed.accent), "#ffffff", "#000000", "#808080", "#2BD96B", "#F5E663"];

const hueGap = (a: number, b: number) => {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
};

test("text on every family colour meets AA, whatever the seed", () => {
  for (const accent of SEEDS) {
    const family = seedFamily(accent);
    for (const role of FAMILY_ROLES) {
      const { hex, on } = family[role];
      const ratio = contrastRatio(hex, on);
      assert.ok(ratio >= AA_NORMAL - 0.01, `${accent} ${role}: ${on} on ${hex} is ${ratio.toFixed(2)}:1`);
    }
  }
});

test("the family is vivid: no colour is muddy", () => {
  for (const accent of SEEDS) {
    for (const role of FAMILY_ROLES) {
      const { C } = hexToOklch(seedFamily(accent)[role].hex);
      assert.ok(C >= 0.12, `${accent} ${role} has chroma ${C.toFixed(3)}`);
    }
  }
});

test("the family sits round the seed's hue: itself, ±32°, and the spark 135° round", () => {
  for (const { seed } of SEED_PRESETS) {
    const hue = hexToOklch(seed.accent).H;
    const family = seedFamily(seed.accent);
    const turn = { seed: 0, next: 32, prev: -32, spark: 135 } as const;
    for (const role of FAMILY_ROLES) {
      const gap = hueGap(hexToOklch(family[role].hex).H, hue + turn[role]);
      assert.ok(gap < 6, `${seed.accent} ${role} is ${gap.toFixed(1)}° off`);
    }
  }
});

test("the default seed gives violet, magenta, blue and amber", () => {
  const family = seedFamily();
  const near = (role: (typeof FAMILY_ROLES)[number], hue: number) =>
    assert.ok(hueGap(hexToOklch(family[role].hex).H, hue) < 12, `${role} is ${family[role].hex}`);
  near("seed", 291);
  near("next", 323);
  near("prev", 259);
  near("spark", 66);
  // The amber is light and the violet deep: each hue at its own most vivid lightness.
  assert.ok(hexToOklch(family.spark.hex).L > hexToOklch(family.seed.hex).L + 0.15);
});

test("a grey seed has no hue of its own, so its family is purple's", () => {
  const purple = seedFamily();
  for (const grey of ["#ffffff", "#000000", "#808080"]) {
    assert.deepEqual(seedFamily(grey), purple, grey);
  }
});

test("the light stop is lighter and the deep stop deeper than the colour", () => {
  for (const accent of SEEDS) {
    for (const role of FAMILY_ROLES) {
      const c = seedFamily(accent)[role];
      const L = hexToOklch(c.hex).L;
      assert.ok(hexToOklch(c.light).L > L, `${accent} ${role} light`);
      assert.ok(hexToOklch(c.deep).L < L, `${accent} ${role} deep`);
    }
  }
});

test("the CSS has a colour, two stops and a text colour for each role", () => {
  const lines = renderFamilyVars("#3D8EF0");
  assert.equal(lines.length, FAMILY_ROLES.length * 4);
  for (const line of lines) assert.match(line, /^ {2}--family-(seed|next|prev|spark)(-light|-deep|-on)?: #[0-9a-f]{6};$/);
});

test("each family colour reads as large text on its seed's own dark ground, so a title can wear it", () => {
  for (const { seed } of SEED_PRESETS) {
    const ground = createEchoTheme(seed, { quiet: true }).values.roles.surface;
    const family = seedFamily(seed.accent);
    for (const role of FAMILY_ROLES) {
      const ratio = contrastRatio(family[role].hex, ground);
      assert.ok(ratio >= AA_LARGE, `${seed.accent} ${role}: ${family[role].hex} on ${ground} is ${ratio.toFixed(2)}:1`);
    }
  }
});

test("a drawn look in one ink has an ink family: the ink and greys, each with text that reads on it", () => {
  const family = inkFamily("#050505", "#FDFDFD");
  for (const c of Object.values(family)) {
    assert.ok(hexToOklch(c.hex).C < 0.01, `${c.hex} is a grey`);
    assert.ok(contrastRatio(c.hex, c.on) >= 4.5, `${c.on} reads on ${c.hex}`);
  }
  // Wearing Drafting Index, the page's family is that one, not a purple one invented for a hueless seed.
  const drafting = STYLE_PRESETS.find((p) => p.seed.style === "drafting-index")!.seed;
  assert.match(siteTheme(lookOf(drafting)).css, /--family-seed: #050505;/);
});
