/**
 * The light device: a body molded in light plastic, decided by the chassis.
 * The same guarantees as the dark device, on the seeds a light style brings:
 * paper, bone, ceramic, a pale grey, an acid field.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { createEchoTheme, devicePolarity, LIGHT_CHASSIS_L } from "./create-echo-theme";
import { contrastRatio } from "./contrast";
import { hexToOklch } from "./oklch";
import { SEED_DEFAULTS } from "./seed";

const LIGHT_SEEDS = {
  chalk: { accent: "#0594F9", chassis: "#EBEBEB", paper: "#1D1D1D" },
  paper: { accent: "#A2BF2E", chassis: "#F6F5F1", paper: "#301A1F", lcdTint: "#89F4DB" },
  "blue paper": { accent: "#1E38FB", chassis: "#EEF5FD", paper: "#0F1497" },
  "pale grey": { accent: "#8ED753", chassis: "#E0E4E7", paper: "#040302" },
  ceramic: { accent: "#6E7FD6", chassis: "#F0E7E3", paper: "#2B2A33" },
  "acid field": { accent: "#0594F9", chassis: "#F1FF01", paper: "#040302" },
} as const;

const quiet = { quiet: true };
const L = (hex: string) => hexToOklch(hex).L;

test("the chassis decides the device: light above the line, dark below it", () => {
  assert.equal(devicePolarity(SEED_DEFAULTS.chassis), "dark");
  assert.equal(devicePolarity("#EBEBEB"), "light");
  assert.equal(devicePolarity("#1E38FB"), "dark", "a saturated blue body is dark plastic");
  assert.equal(LIGHT_CHASSIS_L, 0.6);
  assert.equal(createEchoTheme({}, quiet).values.polarity, "dark");
  for (const seed of Object.values(LIGHT_SEEDS)) assert.equal(createEchoTheme(seed, quiet).values.polarity, "light");
});

for (const [name, seed] of Object.entries(LIGHT_SEEDS)) {
  test(`light device, ${name}: the plastic keeps its bevel and its depth`, () => {
    const r = createEchoTheme(seed, quiet).values.roles;
    // The page's ground is the well. On a light device it's the body barely set in, so the page
    // is light: at 0.055 below the body it was a mid grey.
    assert.ok(L(r.surface) - L(r.well) <= 0.035, `the ground is ${(L(r.surface) - L(r.well)).toFixed(3)} below the body`);
    // Lit rim over cap over body, then the recess, the shadow side and the seam, each darker.
    assert.ok(L(r["cap-highlight"]) > L(r.cap), "rim lighter than cap");
    assert.ok(L(r.cap) > L(r.surface), "cap lighter than body");
    assert.ok(L(r.surface) > L(r.well), "well set into the body");
    assert.ok(L(r.well) > L(r["cap-shadow"]), "cap's underside darker than the well");
    assert.ok(L(r["cap-shadow"]) > L(r.seam), "seam darkest");
    assert.notEqual(r.cap.toLowerCase(), "#ffffff", "a cap never clips to white");
  });

  test(`light device, ${name}: every text holds AA on every ground it sits on`, () => {
    const { values, report } = createEchoTheme(seed, quiet);
    const r = values.roles;
    assert.deepEqual(report.unsatisfiable, []);
    for (const ground of ["surface", "well", "lcd", "cap", "cap-highlight", "cap-shadow"] as const) {
      assert.ok(contrastRatio(r.text, r[ground]) >= 4.5, `text on ${ground}: ${contrastRatio(r.text, r[ground]).toFixed(2)}`);
    }
    for (const ground of ["surface", "cap", "well", "lcd"] as const) {
      assert.ok(contrastRatio(r["text-dim"], r[ground]) >= 4.5, `text-dim on ${ground}: ${contrastRatio(r["text-dim"], r[ground]).toFixed(2)}`);
    }
    // Dim text is quieter than text: nearer the ground, never past it.
    assert.ok(L(r["text-dim"]) > L(r.text), "dim text is lighter than text on a light device");
  });

  test(`light device, ${name}: what's lit is the accent, and what's printed lit is its ink`, () => {
    const r = createEchoTheme(seed, quiet).values.roles;
    for (const ground of ["surface", "cap", "well", "lcd"] as const) {
      // An LED, a rail: the parts of a graphic, 3:1 (WCAG 1.4.11).
      assert.ok(contrastRatio(r["accent-glow"], r[ground]) >= 3, `accent-glow on ${ground}: ${contrastRatio(r["accent-glow"], r[ground]).toFixed(2)}`);
      // A readout, a count, a current tab's text: text, AA. It's the focus ring too, which lands
      // where a focused cap's shadow was: 6:1 on the ground holds 3:1 there (focus-contrast.spec.ts).
      assert.ok(contrastRatio(r["accent-ink"], r[ground]) >= 6, `accent-ink on ${ground}: ${contrastRatio(r["accent-ink"], r[ground]).toFixed(2)}`);
    }
    // On is brighter than its print: a lit LED drawn in the ink read as a hole.
    assert.ok(L(r["accent-glow"]) > L(r["accent-ink"]), "the light is lighter than its ink");
    // Nothing glows on paper glass: the halo is the glass's own colour.
    assert.equal(r["lcd-glow"], r.lcd);
  });

  test(`light device, ${name}: the primary cap is the accent, with a light label`, () => {
    const r = createEchoTheme(seed, quiet).values.roles;
    // A dark label on the cap slid it up the ramp to a pastel, weaker than a badge. It's the
    // accent itself now, as on a dark device: most of the seed's chroma, and a light label.
    assert.ok(L(r["primary-cap-ink"]) > L(r["primary-cap-top"]), "the label is lighter than the cap");
    for (const stop of ["primary-cap-top", "primary-cap-mid", "primary-cap-base"] as const) {
      assert.ok(contrastRatio(r["primary-cap-ink"], r[stop]) >= 4.5, `label on ${stop}: ${contrastRatio(r["primary-cap-ink"], r[stop]).toFixed(2)}`);
    }
    assert.ok(hexToOklch(r["primary-cap-top"]).C >= hexToOklch(r.accent).C * 0.6, `the cap's chroma is ${hexToOklch(r["primary-cap-top"]).C.toFixed(3)}`);
    // Progress cells and loader dots are the same plastic, and read on the page's ground.
    assert.ok(contrastRatio(r["primary-cap-top"], r.well) >= 3, `the fill on the ground: ${contrastRatio(r["primary-cap-top"], r.well).toFixed(2)}`);
    // The pour sits under a neutral cap's label too: the dark text reads on it.
    for (const stop of ["pour-top", "pour-mid", "pour-base"] as const) {
      assert.ok(contrastRatio(r.text, r[stop]) >= 4.5, `text on ${stop}: ${contrastRatio(r.text, r[stop]).toFixed(2)}`);
    }
    // The bright fill takes the body's colour as its label, so on a light device it's the deep one.
    for (const stop of ["accent-fill-top", "accent-fill-base"] as const) {
      assert.ok(contrastRatio(r.surface, r[stop]) >= 4.5, `fill label on ${stop}`);
    }
  });

  test(`light device, ${name}: screens are paper glass, and shadows are drawn lighter`, () => {
    const { css, values } = createEchoTheme(seed, quiet);
    const r = values.roles;
    assert.ok(L(r.lcd) > LIGHT_CHASSIS_L, "a light device's screen is light glass");
    assert.match(css, new RegExp(`--echo-screen-glass: ${r.lcd};`));
    assert.match(css, new RegExp(`--echo-screen-ink: ${r.text};`));
    const shade = Number(/--echo-shade: ([\d.]+);/.exec(css)![1]);
    const darkShade = Number(/--echo-shade: ([\d.]+);/.exec(createEchoTheme({ finish: values.device.finish }, quiet).css)![1]);
    assert.ok(Math.abs(shade - darkShade * 0.5) < 0.002, `${shade} is half of ${darkShade}`);
  });
}

/*
 * The site's four presets on their light device (lightSeedOf in apps/www). Dim
 * text on their ground reads as it does on the dark device, about 6:1: at
 * 4.66:1 on a grey page, running copy was washed out.
 */
const LIGHT_PRESETS = {
  Nawwara: { accent: "#8B6FE8", chassis: "#F0EFF8", paper: "#1D1A2A" },
  Raspberry: { accent: "#DE3B74", chassis: "#F8EDEF", paper: "#29171B" },
  Coral: { accent: "#F2674E", chassis: "#F8EDEB", paper: "#291814" },
  Sky: { accent: "#3D8EF0", chassis: "#EBF1F8", paper: "#131E2B" },
} as const;

for (const [name, seed] of Object.entries(LIGHT_PRESETS)) {
  test(`${name}'s light device: a light page, and dim text as strong as the dark device's`, () => {
    const r = createEchoTheme(seed, quiet).values.roles;
    assert.ok(L(r.well) >= 0.9, `the ground's lightness is ${L(r.well).toFixed(3)}`);
    assert.ok(contrastRatio(r["text-dim"], r.well) >= 6, `dim text on the ground: ${contrastRatio(r["text-dim"], r.well).toFixed(2)}`);
  });
}

test("paper things on a light device: the stock is the lit rim's near-white, and ink and engraving read on it", () => {
  for (const seed of Object.values(LIGHT_SEEDS)) {
    const { css, values } = createEchoTheme(seed, quiet);
    const r = values.roles;
    assert.match(css, new RegExp(`--echo-paper-stock: ${r["cap-highlight"]};`));
    assert.match(css, new RegExp(`--echo-paper-ink: ${r.text};`));
    assert.ok(contrastRatio(r.text, r["cap-highlight"]) >= 4.5, "Receipt and Ticket's ink");
    assert.ok(contrastRatio(r["accent-pressed"], r["cap-highlight"]) >= 4.5, `EngravedPlate's engraving: ${contrastRatio(r["accent-pressed"], r["cap-highlight"]).toFixed(2)}`);
    assert.match(css, new RegExp(`--echo-shade-ink: ${r.seam};`));
  }
});

test("a light body's shadows are its own colour, deep; a dark body's are black", () => {
  for (const seed of Object.values(LIGHT_SEEDS)) {
    const { css, values } = createEchoTheme(seed, quiet);
    const ink = /--echo-cast-ink: (#[0-9a-f]{6});/.exec(css)?.[1];
    assert.ok(ink, "the shadow ink is emitted");
    const body = hexToOklch(values.roles.surface);
    assert.ok(L(ink) < 0.3, "deep enough to shade");
    // A grey body's shadow is grey; a tinted one's leans the way the body does.
    if (body.C > 0.005) assert.ok(Math.abs(((hexToOklch(ink).H - body.H + 540) % 360) - 180) < 5, `${ink} leans away from the body's hue`);
  }
  assert.match(createEchoTheme({}, quiet).css, /--echo-cast-ink: black;/);
});

test("a dark theme resets the screen values, so a light theme outside can't reach into it", () => {
  const { css } = createEchoTheme({}, quiet);
  for (const name of ["screen-glass", "screen-well", "screen-ink", "screen-ink-dim", "paper-stock", "paper-ink", "bloom"]) assert.match(css, new RegExp(`--echo-${name}: initial;`));
  assert.match(css, /--echo-shade-ink: black;/);
});
