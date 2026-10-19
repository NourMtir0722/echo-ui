import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { createEchoTheme } from "echo-ui-core/theme";
import { contrastRatio } from "echo-ui-core/theme";
import { deltaEUnder, worstDeltaE, VISIONS } from "./cvd";
import type { EchoSeedInput } from "echo-ui-core/theme";

/**
 * State signals under colour-vision deficiency.
 *
 * Echo derives every semantic tone from one seed hue. That is deliberate and
 * it is a strength — there is no red/green pair to confuse. The cost is that
 * hue is spent, so any state difference has to be bought with LUMINANCE,
 * SHAPE or ICONOGRAPHY. These tests are what stop that being a slogan.
 */
const SHIPPED_SEEDS: ReadonlyArray<readonly [string, EchoSeedInput]> = [
  ["Nawwara", { accent: "#8B6FE8", chassis: "#232130", paper: "#EFEBFA" }],
  ["Raspberry", { accent: "#DE3B74", chassis: "#26222B", paper: "#F5EDE0" }],
  ["Coral", { accent: "#F2674E", chassis: "#2B2224", paper: "#F9ECE7" }],
  ["Sky", { accent: "#3D8EF0", chassis: "#1F2330", paper: "#E9F0FA" }],
];

/** The floor: ≈0.1 or below is functionally the same colour. */
const MIN_DELTA_E = 0.15;
/** WCAG 1.4.11 for a non-text state difference. */
const MIN_STATE_LUMINANCE = 3;

const HERE = path.dirname(fileURLToPath(import.meta.url));
const css = (file: string) => readFileSync(path.join(HERE, "..", file), "utf8");

/* ------------------------------------------------------------------ StatusDot */

/**
 * The old dot signalled state by fill colour alone at 1.81:1, and ΔE 0.070
 * under protanopia — a 72% loss against normal vision. For a protanope it was
 * two identical grey dots.
 */
test("StatusDot's two states differ by luminance on every shipped seed", () => {
  for (const [name, seed] of SHIPPED_SEEDS) {
    const { values } = createEchoTheme(seed);
    const on = values.roles["accent-glow"];
    const off = values.roles.well;
    const ratio = contrastRatio(on, off);
    assert.ok(
      ratio >= MIN_STATE_LUMINANCE,
      `${name}: StatusDot on/off is ${ratio.toFixed(2)}:1, needs ${MIN_STATE_LUMINANCE} (was 1.81:1)`,
    );
  }
});

test("StatusDot's two states survive every colour-vision deficiency", () => {
  for (const [name, seed] of SHIPPED_SEEDS) {
    const { values } = createEchoTheme(seed);
    const on = values.roles["accent-glow"];
    const off = values.roles.well;
    for (const vision of VISIONS) {
      const deltaE = deltaEUnder(on, off, vision);
      assert.ok(
        deltaE >= MIN_DELTA_E,
        `${name} under ${vision}: StatusDot on/off is ΔE ${deltaE.toFixed(3)}, needs ${MIN_DELTA_E}`,
      );
    }
  }
});

/**
 * Luminance is necessary but was never sufficient — the ticket asks for a
 * difference that is not a colour at all. Off is a hollow socket, on is a
 * filled one, and that has to stay true in the stylesheet.
 */
test("StatusDot signals state by fill-vs-hollow, not only by colour", () => {
  const sheet = css("status-dot/status-dot.css");
  const base = sheet.slice(sheet.indexOf(".echo-status-dot {"), sheet.indexOf(".echo-status-dot[data-on]"));
  const on = sheet.slice(sheet.indexOf(".echo-status-dot[data-on]"));

  assert.match(base, /border:\s*var\(--echo-border-fine, 1\.5px\) solid/, "the off state has no rim, so it cannot read as a socket");
  assert.match(base, /background:\s*var\(--echo-well\)/, "the off state is not a dark, dead socket");
  assert.match(on, /background:\s*var\(--echo-accent-glow\)/, "the on state is not filled with the lit accent");
  // The bloom was a third, decorative signal and went with every other outer
  // glow (2026-09-18). Guard that it does not creep back as the ONLY
  // difference someone relies on: the on state must stay filled, not haloed.
  assert.doesNotMatch(on, /box-shadow:\s*0 0 \d+px/, "the on state has grown an outer glow again");
});

/** The component must not be constructible in a state where it signals nothing. */
test("StatusDot cannot be built without a label or an explicit decorative claim", () => {
  const source = css("status-dot/status-dot.tsx");
  // A union type, so the choice is enforced at compile time rather than hoped for.
  assert.match(source, /label:\s*string;/, "there is no required-label branch");
  assert.match(source, /decorative:\s*true;/, "there is no explicit decorative branch");
  assert.match(source, /warnUnlabelledDot/, "nothing warns at runtime when both are missing");
});

/* --------------------------------------------------------------------- Banner */

const TONES = ["info", "active", "warn", "danger"] as const;

/**
 * `info` vs `warn` was ΔE 0.105 normal, 0.029 under protanopia, 0.026 in
 * greyscale, 1.10:1 in luminance. They were the same banner.
 *
 * This asserts the thing that actually fixes it: every tone has its own
 * SHAPE. Colour cannot do this job within one hue — measured below — so the
 * shape is load-bearing, and a change that quietly removes it fails here.
 */
test("every Banner tone is a different shape, not just a different colour", () => {
  const sheet = css("banner/banner.css");
  const shapes = new Map<string, string>();

  for (const tone of TONES) {
    const marker = `.echo-banner[data-tone="${tone}"] .echo-banner__pip`;
    const at = sheet.indexOf(marker);
    assert.ok(at >= 0, `${tone} has no pip rule at all`);
    shapes.set(tone, sheet.slice(at, sheet.indexOf("}", at)));
  }

  assert.match(shapes.get("info")!, /background:\s*transparent/, "info is not hollow");
  assert.match(shapes.get("info")!, /border:\s*var\(--echo-border-fine, 1\.5px\) solid/, "info has no ring");
  // Active was told apart by a bloom until outer glows left the library
  // (2026-09-18); it is now the one FILLED, lit disc among the tones.
  // A domed LED is a radial gradient; a flat one a linear one. Either is lit.
  assert.match(shapes.get("active")!, /background:\s*(linear|radial)-gradient/, "active is not a filled, lit disc");
  assert.match(shapes.get("warn")!, /clip-path:\s*polygon/, "warn is not a triangle — it is a pip colour again");
  assert.match(shapes.get("danger")!, /border-radius:\s*var\(--echo-radius-xs\)/, "danger is not a square");

  // And no two tones share a geometry.
  const geometry = TONES.map((tone) => {
    const rule = shapes.get(tone)!;
    return [
      /clip-path:\s*polygon/.test(rule) ? "triangle" : "",
      /border-radius:\s*var\(--echo-radius-xs\)/.test(rule) ? "square" : "",
      /background:\s*transparent/.test(rule) ? "hollow" : "",
      /background:\s*(linear|radial)-gradient/.test(rule) ? "lit" : "",
    ].join("|");
  });
  assert.equal(new Set(geometry).size, TONES.length, `two tones share a geometry: ${geometry.join(", ")}`);
});

/**
 * The measurement behind the decision above, asserted so it stays true.
 *
 * If a future seed ever DID let pip colour alone clear 0.15 across every
 * vision, that would be worth knowing — but it would not change the design,
 * because the shape has to work for the other three seeds too.
 */
test("pip colour alone cannot separate the tones, which is why shape carries it", () => {
  let best = 0;
  for (const [, seed] of SHIPPED_SEEDS) {
    const { values, accentRamp } = { ...createEchoTheme(seed), accentRamp: createEchoTheme(seed).values.accentRamp };
    const info = values.roles["text-dim"];
    const active = accentRamp[2];
    best = Math.max(best, worstDeltaE(info, active).deltaE);
  }
  assert.ok(
    best < MIN_DELTA_E,
    `pip colour now reaches ΔE ${best.toFixed(3)} across every vision. That is above the ${MIN_DELTA_E} ` +
      `floor, so the claim in banner.css that colour cannot do this is out of date — recheck it.`,
  );
});

/**
 * Danger's severity is carried structurally, and it has to be.
 *
 * The repaint alone measures ΔE 0.047 from an ordinary strip under protanopia
 * on Raspberry — a protanope sees deep raspberry as very dark, which puts it on
 * top of the chassis grey. No stop on the ramp fixes that: one dark enough for
 * the light label sits near the cap under CVD, one far enough from the cap
 * cannot carry the label. So the strip keeps the repaint AND gets a 4px
 * leading edge, which no deficiency can take away.
 */
test("danger carries severity structurally, not only by repainting its surface", () => {
  const sheet = css("banner/banner.css");
  const rule = sheet.slice(sheet.indexOf('.echo-banner[data-tone="danger"] {'));
  const block = rule.slice(0, rule.indexOf("}"));

  assert.match(block, /background:\s*linear-gradient/, "danger no longer repaints the strip");
  assert.match(
    block,
    /border-inline-start:\s*var\(--echo-border-heavy, 4px\) solid/,
    "danger has lost its structural edge — the repaint alone is ΔE 0.047 under protanopia",
  );
});

/**
 * The measurement that forced the decision above. Pinned so that if a future
 * change makes the repaint survive CVD on its own, somebody has to come back
 * and re-read the argument rather than inheriting it.
 */
test("the danger repaint on its own does not survive every colour-vision deficiency", () => {
  let best = 0;
  for (const [, seed] of SHIPPED_SEEDS) {
    const { values } = createEchoTheme(seed);
    best = Math.max(best, worstDeltaE(values.accentRamp[4], values.roles.cap).deltaE);
  }
  assert.ok(
    best < MIN_DELTA_E,
    `the danger strip now reaches ΔE ${best.toFixed(3)} against an ordinary one across every ` +
      `vision. If that holds on all four seeds the structural edge may no longer be load-bearing — ` +
      `re-read the note in banner.css before removing it.`,
  );
});
