import { test } from "node:test";
import assert from "node:assert/strict";

import {
  hexToOklch,
  oklchToHex,
  parseHex,
  deltaEHex,
  inGamut,
} from "./oklch";
import { createEchoTheme, __resetThemeWarnings } from "./create-echo-theme";
import { ECHO_ROLES } from "./roles";
import { contrastRatio, ensureContrast, ensureBackgroundContrast, worstGradientContrast } from "./contrast";

/**
 * Documented reproduction tolerance.
 * Every default-seed role reproduces its reference colors.ts value within this
 * Euclidean OKLab distance. Measured max at authoring time: 0.0142 (cap≈slate).
 */
const DELTA_E_TOLERANCE = 0.02;

/* ------------------------------------------------------------------ oklch math */

test("hex parsing handles 3/6/8-digit forms", () => {
  assert.deepEqual(parseHex("#fff"), { r: 1, g: 1, b: 1, a: 1 });
  assert.equal(parseHex("#DE3B74").a, 1);
  assert.equal(Math.round(parseHex("#00000080").a * 255), 128);
  assert.throws(() => parseHex("#xyz"));
});

test("OKLCH roundtrip is lossless for in-gamut colors", () => {
  for (const hex of ["#DE3B74", "#26222B", "#F5EDE0", "#1FA8A0", "#E8952A", "#0E0B11"]) {
    const back = oklchToHex(hexToOklch(hex));
    assert.ok(deltaEHex(hex, back) < 1e-4, `${hex} roundtrip drifted to ${back}`);
  }
});

test("inGamut flags reachable vs unreachable OKLCH", () => {
  assert.ok(inGamut(hexToOklch("#DE3B74")));
  assert.ok(!inGamut({ L: 0.6, C: 0.4, H: 4 })); // chroma beyond sRGB
});

/* --------------------------------------------- reference reproduction */

/**
 * The seed the first Echo device was drawn in. The engine was calibrated on
 * it, so it must reproduce that device exactly; the default is now purple.
 */
const RASPBERRY = { accent: "#DE3B74", chassis: "#26222B", paper: "#F5EDE0" };

test("the default seed is Echo's purple", () => {
  const { values } = createEchoTheme();
  assert.ok(deltaEHex(values.roles.accent, "#8B6FE8") < 0.005, `default accent is ${values.roles.accent}`);
  assert.ok(deltaEHex(values.roles.surface, "#232130") <= DELTA_E_TOLERANCE, `default surface is ${values.roles.surface}`);
  assert.equal(values.roles.text, "#EFEBFA");
});

test("the raspberry reference reproduces the first Echo device's look within ΔE tolerance", () => {
  const { values } = createEchoTheme(RASPBERRY);
  const expect: Array<[string, string]> = [
    [values.roles.surface, "#26222B"],
    [values.roles.cap, "#3A343F"],
    [values.roles["cap-highlight"], "#565060"],
    [values.roles["cap-shadow"], "#1A1620"],
    [values.roles.well, "#0E0B11"],
    [values.roles.accent, "#DE3B74"],
    [values.roles["accent-highlight"], "#F0A6C0"],
    [values.roles["accent-pressed"], "#A61E4D"],
    [values.roles["accent-glow"], "#E64980"],
    [values.roles.text, "#F5EDE0"],
    [values.roles["text-dim"], "#B3A99A"],
  ];
  for (const [got, ref] of expect) {
    const dE = deltaEHex(got, ref);
    assert.ok(dE <= DELTA_E_TOLERANCE, `${got} vs ${ref}: ΔE ${dE.toFixed(4)} > ${DELTA_E_TOLERANCE}`);
  }
});

test("the raspberry reference reproduces the original accent ramp", () => {
  const { values } = createEchoTheme(RASPBERRY);
  const ref = ["#F7D0DE", "#EC9BB6", "#E64980", "#C93168", "#A61E4D", "#741538", "#40101F"];
  ref.forEach((r, i) => {
    const dE = deltaEHex(values.accentRamp[i]!, r);
    assert.ok(dE <= DELTA_E_TOLERANCE, `ramp[${i}] ${values.accentRamp[i]} vs ${r}: ΔE ${dE.toFixed(4)}`);
  });
});

/* ----------------------------------------------------- dual output */

test("dual output: css block and values mirror agree on every role", () => {
  const { css, values } = createEchoTheme();
  assert.match(css, /^:root \{/);
  for (const role of ECHO_ROLES) {
    assert.ok(values.roles[role], `missing value for role ${role}`);
    assert.ok(css.includes(`--echo-${role}: ${values.roles[role]};`), `css missing --echo-${role}`);
  }
  // Ramp + key angle also mirrored.
  assert.ok(css.includes("--echo-accent-1:"));
  assert.ok(css.includes(`--echo-key-angle: ${values.keyAngle}deg;`));
});

test("scoped selector is honored", () => {
  const { css } = createEchoTheme({ accent: "#E8952A" }, { selector: ".amber" });
  assert.match(css, /^\.amber \{/);
});

test("a scoped theme's fallback for older browsers stays in its scope", () => {
  const scoped = createEchoTheme({ accent: "#E8952A" }, { selector: ".amber", quiet: true });
  const guard = scoped.css.slice(scoped.css.indexOf("@supports not"));
  assert.doesNotMatch(guard, /\bbody\s*\{/, "a theme scoped to .amber never paints the page's body");
  assert.match(guard, new RegExp(`\\.amber \\{\\s*background: ${scoped.values.roles.well};\\s*color: ${scoped.values.roles.text};`));
  // A theme for the whole page still paints the page.
  const root = createEchoTheme({ accent: "#E8952A" }, { quiet: true });
  assert.match(root.css.slice(root.css.indexOf("@supports not")), /\bbody \{\s*background:/);
});

/* ------------------------------------------ retheme, no residue */

test("teal and amber seeds relight the device with zero raspberry residue", () => {
  const RASPBERRY_H = hexToOklch("#DE3B74").H;
  for (const [accent, expectedH] of [
    ["#1FA8A0", hexToOklch("#1FA8A0").H],
    ["#E8952A", hexToOklch("#E8952A").H],
  ] as const) {
    const { values } = createEchoTheme({ accent }, { quiet: true });
    // Every accent-family role must carry the seed hue, never raspberry.
    for (const role of ["accent", "accent-pressed", "accent-glow"] as const) {
      const h = hexToOklch(values.roles[role]).H;
      const seedDist = Math.abs(((h - expectedH + 540) % 360) - 180);
      const raspDist = Math.abs(((h - RASPBERRY_H + 540) % 360) - 180);
      assert.ok(seedDist < 12, `${role} hue ${h.toFixed(1)} strayed from seed ${expectedH.toFixed(1)}`);
      assert.ok(raspDist > 30, `${role} still near raspberry hue (${h.toFixed(1)})`);
    }
    for (const stop of values.accentRamp) {
      assert.ok(Math.abs(((hexToOklch(stop).H - RASPBERRY_H + 540) % 360) - 180) > 25, `ramp stop ${stop} near raspberry`);
    }
  }
});

/* ------------------------------------- contrast guardrail fires */

test("default theme passes WCAG AA for text on every surface", () => {
  const { values } = createEchoTheme();
  assert.ok(contrastRatio(values.roles.text, values.roles.surface) >= 4.5);
  assert.ok(contrastRatio(values.roles.text, values.roles.well) >= 4.5);
  assert.ok(contrastRatio(values.roles.text, values.roles.lcd) >= 4.5);
});

/**
 * EngravedPlate is the only surface in the library that puts dark text on the
 * PAPER colour rather than paper text on dark plastic, so its pairing is not
 * covered by the surface sweep above. The engraving is var(--echo-accent-pressed)
 * on var(--echo-text) — both derived, so the check has to hold across seeds.
 */
test("engraved text stays legible on paper for every seed", () => {
  const seeds = [{}, { accent: "#2AA9A0" }, { accent: "#E8952A" }, { accent: "#8B7FD4" }];
  for (const seed of seeds) {
    const { values } = createEchoTheme(seed, { quiet: true });
    const ratio = contrastRatio(values.roles["accent-pressed"], values.roles.text);
    assert.ok(ratio >= 4.5, `accent-pressed on paper is ${ratio.toFixed(2)}:1 for ${JSON.stringify(seed)}`);
  }
});

test("failing-contrast seed auto-corrects and warns", () => {
  const warnings: string[] = [];
  const original = console.warn;
  console.warn = (msg?: unknown) => void warnings.push(String(msg));
  try {
    // Near-black paper on dark chassis: text would be unreadable without correction.
    const { values } = createEchoTheme({ paper: "#2A2A2A", chassis: "#26222B" });
    assert.ok(contrastRatio(values.roles.text, values.roles.surface) >= 4.5, "text still fails AA after correction");
  } finally {
    console.warn = original;
  }
  assert.equal(warnings.length, 1);
  assert.match(warnings[0]!, /WCAG AA/);
  assert.match(warnings[0]!, /text/);
});

test("the result reports what the contrast guarantee changed, so a tool can say it", () => {
  const quiet = { quiet: true };
  const plain = createEchoTheme({}, quiet).report;
  assert.deepEqual([plain.corrected, plain.unsatisfiable], [[], []]);
  // Past AA, the default seed has only notes (its dim text), nothing hard to read.
  assert.deepEqual(plain.readability.filter((n) => n.level === "fail"), []);
  const { report } = createEchoTheme({ paper: "#2A2A2A", chassis: "#26222B" }, quiet);
  assert.ok(report.corrected.some((line) => /^text \(→ \d\.\d\d:1\)$/.test(line)), report.corrected.join(", "));
  assert.deepEqual(report.unsatisfiable, []);
});

/**
 * Every accent is held to one lightness band, so an acid yellow
 * comes out olive, and the report said nothing: `style use` told a builder
 * the theme had corrected nothing while their accent changed colour.
 */
test("the report says when the accent is moved into Echo's lightness band", () => {
  const quiet = { quiet: true };
  assert.equal(createEchoTheme({}, quiet).report.accent, undefined, "the default accent sits in the band");
  assert.equal(createEchoTheme({ accent: "#DE3B74" }, quiet).report.accent, undefined, "and so does the reference raspberry");
  const { report, values } = createEchoTheme({ accent: "#F1FF01" }, quiet);
  assert.ok(report.accent, "an acid yellow is moved, and the report says so");
  assert.match(report.accent.from, /^#F1FF01$/i);
  assert.equal(report.accent.to, values.roles.accent);
  assert.notEqual(report.accent.to.toLowerCase(), "#f1ff01");
});

test("ensureContrast leaves already-passing colors untouched", () => {
  const fix = ensureContrast("#F5EDE0", "#26222B", 4.5);
  assert.equal(fix.adjusted, false);
  assert.equal(fix.color, "#F5EDE0");
});

/**
 * Both corrections chose their direction at luminance 0.5, but black
 * and white give a colour equal contrast at about 0.18. A mid grey ground
 * (0.25) was corrected toward white, where the best it can reach is 3.5:1,
 * when black reaches 5.9:1. In the theme it lightened a primary cap into a
 * mid-tone label and shipped the button at 1.00:1.
 */
test("a correction heads for whichever of black or white can pass", () => {
  const text = ensureContrast("#8A8A8A", "#888888", 4.5);
  assert.ok(text.ratio >= 4.5, `text reached only ${text.ratio.toFixed(2)}:1 (${text.color})`);

  const cap = ensureBackgroundContrast("#A0A0A0", "#64B953", 4.5);
  assert.ok(cap.ratio >= 4.5, `the cap reached only ${cap.ratio.toFixed(2)}:1 (${cap.color})`);

  const { values } = createEchoTheme({ accent: "#48A5D1", chassis: "#101018", paper: "#E096C9" }, { quiet: true });
  const label = worstGradientContrast(values.roles.text, [
    [values.roles["primary-cap-top"], 0],
    [values.roles["primary-cap-mid"], 0.45],
    [values.roles["primary-cap-base"], 1],
  ]);
  assert.ok(label.ratio >= 4.5, `the primary label reads ${label.ratio.toFixed(2)}:1 on ${label.background}`);
});

/**
 * The guardrail solves each foreground role against ALL of its backgrounds at
 * once. Applying the pairs one after another — the obvious loop — lets each
 * correction overwrite the last, so `text` fixed against a light surface is
 * then re-fixed against a dark screen and ends up failing the surface it was
 * corrected for. Dark seeds hid it: every ground pulls the same direction.
 */
test("a corrected role satisfies every one of its backgrounds, not just the last", () => {
  const seeds = [
    {},
    { paper: "#2A2A2A", chassis: "#26222B" }, // near-black paper: needs correcting
    { accent: "#1FA8A0", chassis: "#1F2A2A", paper: "#EAF3F1" },
    { accent: "#E8952A", chassis: "#2A2620", paper: "#F6EEDF" },
    { chassis: "#101014", paper: "#3A3A3A" },
  ];
  for (const seed of seeds) {
    const { values } = createEchoTheme(seed, { quiet: true });
    const { text, surface, well, lcd } = values.roles;
    for (const [name, bg] of [["surface", surface], ["well", well], ["lcd", lcd]] as const) {
      const ratio = contrastRatio(text, bg);
      assert.ok(
        ratio >= 4.5,
        `text on ${name} is ${ratio.toFixed(2)}:1 for ${JSON.stringify(seed)}`,
      );
    }
    // text-dim is small text everywhere it is used, so it is held to AA_NORMAL.
    const dim = contrastRatio(values.roles["text-dim"], surface);
    assert.ok(dim >= 4.5, `text-dim on surface is ${dim.toFixed(2)}:1 for ${JSON.stringify(seed)}`);
  }
});

/**
 * A light chassis with a dark screen has no single `text` that is legible on
 * both. The theme must SAY so rather than emit a token that quietly fails —
 * and must say it even under `quiet`, which silences routine auto-correction,
 * not an unsatisfiable palette.
 */
test("an unsatisfiable seed is reported, not silently shipped", () => {
  const warnings: string[] = [];
  const original = console.warn;
  console.warn = (msg?: unknown) => void warnings.push(String(msg));
  let values;
  try {
    values = createEchoTheme(
      { chassis: "#E8E3DA", paper: "#1A1720", lcdTint: "#151119" },
      { quiet: true },
    ).values;
  } finally {
    console.warn = original;
  }

  assert.equal(warnings.length, 1, "expected exactly one unsatisfiable warning");
  assert.match(warnings[0]!, /No colour satisfies/);
  assert.match(warnings[0]!, /text on/);
  // It names every ground it cannot meet, so the seed can be fixed not guessed.
  // Held to the chassis and the three cap stops as well, the text
  // settles legible on those light grounds and fails the dark one: on a light
  // device, a dark screen tint is the ground no text can share with the body.
  assert.match(warnings[0]!, /text on lcd \(/);
  assert.ok(values, "a theme is still returned; it is reported, not thrown");
});

/** The dark default must be untouched by the guardrail rewrite. */
test("the shipped dark seed needs no correction at all", () => {
  const warnings: string[] = [];
  const original = console.warn;
  console.warn = (msg?: unknown) => void warnings.push(String(msg));
  try {
    const { values } = createEchoTheme();
    assert.equal(values.roles.text, "#EFEBFA");
    assert.equal(createEchoTheme(RASPBERRY).values.roles["text-dim"], "#b1a99d");
  } finally {
    console.warn = original;
  }
  assert.deepEqual(warnings, []);
});

/* ------------------------------------------------- derivation bugs */

/**
 * `accent-highlight` used to subtract an ABSOLUTE 0.109 of chroma, a number
 * calibrated against raspberry (C = 0.2019). Teal's chroma is 0.109 exactly,
 * so it landed on C = 0.000 — a pure grey highlight (#CFCFCF) on a teal
 * device. Any seed at or below ~0.109 chroma got the same neutral.
 */
test("accent-highlight keeps its colour for low-chroma seeds", () => {
  const hostile: Array<[string, string]> = [
    ["teal, the exact failure case", "#1FA8A0"],
    ["chroma just under the old subtraction", "#4E9A93"],
    ["near-grey", "#8A8A88"],
    ["very low chroma", "#7E8286"],
    ["default raspberry", "#DE3B74"],
  ];
  for (const [label, accent] of hostile) {
    const { values } = createEchoTheme({ accent }, { quiet: true });
    const highlight = hexToOklch(values.roles["accent-highlight"]);
    const seedChroma = hexToOklch(accent).C;
    assert.ok(
      highlight.C > 0,
      `${label} (${accent}): accent-highlight is a neutral grey, C=${highlight.C.toFixed(4)}`,
    );
    // Proportional, not absolute: the highlight keeps a fixed FRACTION of the
    // seed's chroma, so no seed can be driven to zero however low it starts.
    assert.ok(
      highlight.C >= seedChroma * 0.4,
      `${label}: highlight chroma ${highlight.C.toFixed(4)} collapsed against seed ${seedChroma.toFixed(4)}`,
    );
  }
});

/** The reference must be bit-for-bit unchanged by the proportional rewrite. */
test("the proportional highlight still reproduces the reference for the raspberry seed", () => {
  const { values } = createEchoTheme(RASPBERRY);
  assert.ok(
    deltaEHex(values.roles["accent-highlight"], "#F0A6C0") < 0.005,
    `accent-highlight drifted to ${values.roles["accent-highlight"]}`,
  );
});

/**
 * The accent role was the only derived value passed straight through from the
 * seed, so its lightness was whatever the user typed — raspberry 0.610, teal
 * 0.662, amber 0.738, purple 0.626. The same component read as a different
 * emphasis level depending on the seed.
 */
test("accent lightness is normalised into a band across every seed", () => {
  const seeds = [
    "#DE3B74", "#1FA8A0", "#E8952A", "#8B6FE8",
    "#FFFCE0", // near-white: far above the band
    "#150308", // near-black: far below it
    "#00FF00", // maximum-lightness primary
  ];
  const lightnesses = seeds.map((accent) => {
    const { values } = createEchoTheme({ accent }, { quiet: true });
    return hexToOklch(values.roles.accent).L;
  });
  // The band is enforced in OKLCH, but the role is emitted as an 8-bit hex, so
  // reading it back costs up to one quantisation step (~0.003 in L).
  const QUANTISATION = 0.005;
  for (const [i, L] of lightnesses.entries()) {
    assert.ok(
      L >= 0.56 - QUANTISATION && L <= 0.66 + QUANTISATION,
      `${seeds[i]} emitted accent L=${L.toFixed(3)}, outside the 0.56-0.66 band`,
    );
  }
  // The point of the band is that the spread collapses. Before it, the
  // four shipped seeds alone spanned 0.610-0.738.
  const spread = Math.max(...lightnesses) - Math.min(...lightnesses);
  assert.ok(
    spread <= 0.1 + 2 * QUANTISATION,
    `accent lightness still varies by ${spread.toFixed(3)} across seeds`,
  );
});

/** The default and the reference sit inside the band, so normalising must not move them. */
test("the default accent and the raspberry reference are untouched by the lightness band", () => {
  const { values } = createEchoTheme();
  assert.ok(
    deltaEHex(values.roles.accent, "#8B6FE8") < 0.005,
    `the default accent moved to ${values.roles.accent}`,
  );
  const reference = createEchoTheme(RASPBERRY).values.roles.accent;
  assert.ok(deltaEHex(reference, "#DE3B74") < 0.005, `the raspberry reference moved to ${reference}`);
});

/* ------------------------------------- the warning where it is seen */

/**
 * `quiet` defaulted to false and was then passed `true` at nearly every call
 * site, including the root layout — so the one runtime signal the theme engine
 * emits was off in the one place anybody would notice it. Console hygiene is
 * reasonable; achieving it by having every caller opt out is how a warning
 * stops existing.
 */
test("a correcting seed warns by default outside production", () => {
  const original = process.env.NODE_ENV;
  const warnings: string[] = [];
  const warn = console.warn;
  console.warn = (msg?: unknown) => void warnings.push(String(msg));
  try {
    process.env.NODE_ENV = "development";
    __resetThemeWarnings();
    createEchoTheme({ paper: "#2A2A2A", chassis: "#26222B" });
  } finally {
    console.warn = warn;
    process.env.NODE_ENV = original;
  }
  assert.equal(warnings.length, 1, "no warning was emitted in development");
  assert.match(warnings[0]!, /auto-corrected/);
});

test("production stays quiet", () => {
  const original = process.env.NODE_ENV;
  const warnings: string[] = [];
  const warn = console.warn;
  console.warn = (msg?: unknown) => void warnings.push(String(msg));
  try {
    process.env.NODE_ENV = "production";
    __resetThemeWarnings();
    createEchoTheme({ paper: "#2A2A2A", chassis: "#26222B" });
  } finally {
    console.warn = warn;
    process.env.NODE_ENV = original;
  }
  assert.deepEqual(warnings, []);
});

/**
 * A theme is derived on every render of every themed component — the generator
 * re-derives on each keystroke — so warning per call would produce hundreds of
 * identical lines and train everyone to ignore the console.
 */
test("the warning surfaces once per theme, not once per render", () => {
  const original = process.env.NODE_ENV;
  const warnings: string[] = [];
  const warn = console.warn;
  console.warn = (msg?: unknown) => void warnings.push(String(msg));
  try {
    process.env.NODE_ENV = "development";
    __resetThemeWarnings();
    for (let i = 0; i < 40; i++) createEchoTheme({ paper: "#2A2A2A", chassis: "#26222B" });
  } finally {
    console.warn = warn;
    process.env.NODE_ENV = original;
  }
  assert.equal(warnings.length, 1, `${warnings.length} warnings for 40 identical derivations`);
});

/** An explicit `quiet: true` still wins — test and prod paths rely on it. */
test("an explicit quiet still silences the correction notice", () => {
  const original = process.env.NODE_ENV;
  const warnings: string[] = [];
  const warn = console.warn;
  console.warn = (msg?: unknown) => void warnings.push(String(msg));
  try {
    process.env.NODE_ENV = "development";
    __resetThemeWarnings();
    createEchoTheme({ paper: "#2A2A2A", chassis: "#26222B" }, { quiet: true });
  } finally {
    console.warn = warn;
    process.env.NODE_ENV = original;
  }
  assert.deepEqual(warnings, []);
});
