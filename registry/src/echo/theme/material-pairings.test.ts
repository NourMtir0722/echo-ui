import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { createEchoTheme, oklchToHex } from "echo-ui-core/theme";
import { contrastRatio, worstGradientContrast, sampleGradient } from "echo-ui-core/theme";
import { TEXT_PAIRINGS, NON_TEXT_PAIRINGS } from "./material-pairings";
import type { EchoSeedInput } from "echo-ui-core/theme";

/**
 * The contrast contract, swept.
 *
 * Every pairing with a test used to pass, and every pairing without one
 * failed. This file is the answer to that: it holds every
 * declared pairing, at every point of every gradient, on every shipped seed.
 *
 * There is deliberately no `quiet` escape anywhere in here. `quiet` silences
 * the auto-correction notice; it must never silence a failure.
 */
const SHIPPED_SEEDS: ReadonlyArray<readonly [string, EchoSeedInput]> = [
  ["Nawwara", { accent: "#8B6FE8", chassis: "#232130", paper: "#EFEBFA" }],
  ["Raspberry", { accent: "#DE3B74", chassis: "#26222B", paper: "#F5EDE0" }],
  ["Coral", { accent: "#F2674E", chassis: "#2B2224", paper: "#F9ECE7" }],
  ["Sky", { accent: "#3D8EF0", chassis: "#1F2330", paper: "#E9F0FA" }],
];

/**
 * Seeds chosen to break the derivation rather than to look nice: a low-chroma
 * accent (the one that once derived a grey highlight), a near-grey one, an extremely
 * light accent, a very dark chassis and a very light paper.
 */
const HOSTILE_SEEDS: ReadonlyArray<readonly [string, EchoSeedInput]> = [
  ["low-chroma", { accent: "#1FA8A0" }],
  ["near-grey accent", { accent: "#8A8A88" }],
  ["very light accent", { accent: "#FFE9A0" }],
  ["very dark accent", { accent: "#2A0D18" }],
  ["dark chassis", { chassis: "#0A0A0C" }],
  ["light paper", { paper: "#FFFFFF" }],
];

/**
 * The light device: the site's four presets in light plastic (lightSeedOf in
 * apps/www), and the light bodies the engine's own tests use. Until these were
 * swept, every pairing held on the dark device and nothing looked at the light
 * one: its primary label, its lit text and its fills were never measured here.
 */
const LIGHT_SEEDS: ReadonlyArray<readonly [string, EchoSeedInput]> = [
  ["Nawwara, light", { accent: "#8B6FE8", chassis: "#F0EFF8", paper: "#1D1A2A" }],
  ["Raspberry, light", { accent: "#DE3B74", chassis: "#F8EDEF", paper: "#29171B" }],
  ["Coral, light", { accent: "#F2674E", chassis: "#F8EDEB", paper: "#291814" }],
  ["Sky, light", { accent: "#3D8EF0", chassis: "#EBF1F8", paper: "#131E2B" }],
  ["chalk", { accent: "#0594F9", chassis: "#EBEBEB", paper: "#1D1D1D" }],
  ["paper", { accent: "#A2BF2E", chassis: "#F6F5F1", paper: "#301A1F", lcdTint: "#89F4DB" }],
  ["blue paper", { accent: "#1E38FB", chassis: "#EEF5FD", paper: "#0F1497" }],
  ["pale grey", { accent: "#8ED753", chassis: "#E0E4E7", paper: "#040302" }],
  ["ceramic", { accent: "#6E7FD6", chassis: "#F0E7E3", paper: "#2B2A33" }],
  ["acid field", { accent: "#0594F9", chassis: "#F1FF01", paper: "#040302" }],
];

const ALL_SEEDS = [...SHIPPED_SEEDS, ...HOSTILE_SEEDS, ...LIGHT_SEEDS];

/* ------------------------------------------------------------ enforced text pairs */

for (const [seedName, seed] of ALL_SEEDS) {
  test(`every enforced text pairing clears its target across the whole gradient: ${seedName}`, () => {
    const { values } = createEchoTheme(seed);
    const failures: string[] = [];

    for (const pairing of TEXT_PAIRINGS) {
      if (pairing.kind !== "enforced") continue;
      const fg = pairing.foreground(values);
      const stops = pairing.background(values);
      // 40 samples, plus every declared stop, so a narrow band cannot be
      // stepped over — one pairing was first written up as a middle-band problem
      // when the top stop was in fact the worst point on the gradient.
      const worst = worstGradientContrast(fg, stops, 40);
      if (worst.ratio < pairing.target) {
        failures.push(
          `${pairing.name}: ${worst.ratio.toFixed(2)}:1 at t=${worst.position.toFixed(2)} ` +
            `(${fg} on ${worst.background}), needs ${pairing.target} — ${pairing.where}`,
        );
      }
    }
    assert.deepEqual(failures, [], `\n  ${failures.join("\n  ")}\n`);
  });
}

/**
 * The regression this whole ticket exists for. Stated as its own test, with
 * the measured before-values in the message, so that if anybody ever points
 * the cap back at the raw ramp stops the failure explains itself.
 */
test("the primary button label clears AA at every point, on every shipped seed", () => {
  for (const [name, seed] of SHIPPED_SEEDS) {
    const { values } = createEchoTheme(seed);
    const worst = worstGradientContrast(
      values.roles.text,
      [
        [values.roles["primary-cap-top"], 0],
        [values.roles["primary-cap-mid"], 0.45],
        [values.roles["primary-cap-base"], 1],
      ],
      40,
    );
    assert.ok(
      worst.ratio >= 4.5,
      `${name}: primary label is ${worst.ratio.toFixed(2)}:1 at t=${worst.position.toFixed(2)}. ` +
        `Before the cap was held to AA this ran 1.74-1.82:1 at the top stop and 2.82-3.20:1 at 45%.`,
    );
  }
});

/**
 * The cap used to be fitted to the paper as typed, and the text role
 * corrected against the chassis only afterwards: a dark paper on a dark chassis
 * fitted the cap for dark text, then turned the text light, and the label read
 * 1.00:1 with no warning. The correction also stopped at the chassis, so the
 * lighter neutral caps under the same text read 2.20:1.
 */
test("caps are fitted to the text the theme emits, not the paper typed", () => {
  const { values } = createEchoTheme({ accent: "#EE8787", chassis: "#303038", paper: "#0B2547" });
  const failures: string[] = [];
  for (const name of [
    "hardware-button/primary label",
    "hardware-button/neutral label",
    "badge/accent",
    "segmented/selected option",
    "text-dim on cap",
  ]) {
    const pairing = TEXT_PAIRINGS.find((p) => p.name === name)!;
    const worst = worstGradientContrast(pairing.foreground(values), pairing.background(values), 40);
    if (worst.ratio < pairing.target) failures.push(`${name}: ${worst.ratio.toFixed(2)}:1`);
  }
  assert.deepEqual(failures, []);
});

/**
 * The destructive confirm prints the ramp's palest stop on its two
 * deepest. The ramp is a fixed lightness envelope, and at the same OKLCH
 * lightness a green is far brighter than a violet, so on greens the label read
 * 4.38:1 — one accent in ten, on any chassis and paper.
 */
test("the destructive confirm's label reads on every accent hue", () => {
  const pairing = TEXT_PAIRINGS.find((p) => p.name === "alert-dialog/destructive confirm")!;
  const failures: string[] = [];
  for (let hue = 0; hue < 360; hue += 5) {
    for (const chroma of [0.08, 0.16, 0.25]) {
      const accent = oklchToHex({ L: 0.62, C: chroma, H: hue });
      const { values } = createEchoTheme({ accent });
      const worst = worstGradientContrast(pairing.foreground(values), pairing.background(values), 20);
      if (worst.ratio < pairing.target) failures.push(`${accent} (H${hue}): ${worst.ratio.toFixed(2)}:1`);
    }
  }
  const { values } = createEchoTheme({ accent: "#0AC642" });
  const worst = worstGradientContrast(pairing.foreground(values), pairing.background(values), 20);
  if (worst.ratio < pairing.target) failures.push(`#0AC642: ${worst.ratio.toFixed(2)}:1`);
  assert.deepEqual(failures, []);
});

/* ---------------------------------------------------------- decorative treatments */

/**
 * Engraved type is allowed to fail AA — that is the physical effect. What it
 * is not allowed to do is drift, or be mistaken for legible text. Pinning the
 * measured floor means a change to the material shows up here as a decision
 * rather than as a silent degradation.
 */
test("decorative treatments stay within their documented range and are never mistaken for text", () => {
  for (const [seedName, seed] of [...SHIPPED_SEEDS, ...LIGHT_SEEDS]) {
    const { values } = createEchoTheme(seed);
    for (const pairing of TEXT_PAIRINGS) {
      if (pairing.kind !== "decorative") continue;
      const worst = worstGradientContrast(pairing.foreground(values), pairing.background(values), 40);
      assert.ok(
        worst.ratio >= pairing.target,
        `${seedName} ${pairing.name}: ${worst.ratio.toFixed(2)}:1 is below even the ` +
          `decorative floor of ${pairing.target}`,
      );
      assert.ok(
        worst.ratio < 4.5,
        `${seedName} ${pairing.name}: ${worst.ratio.toFixed(2)}:1 now PASSES AA. ` +
          `If engraving became legible text, promote it to an enforced pairing ` +
          `and revisit HardwareButton's engraved-primary warning.`,
      );
      assert.ok(pairing.note, `${pairing.name} is decorative but does not say what it costs`);
    }
  }
});

/* ------------------------------------------------------- non-text contrast (1.4.11) */

test("control boundaries meet 1.4.11, or declare the rim exception they rely on", () => {
  for (const [seedName, seed] of SHIPPED_SEEDS) {
    const { values } = createEchoTheme(seed);
    for (const pairing of NON_TEXT_PAIRINGS) {
      const worst = worstGradientContrast(pairing.foreground(values), pairing.background(values), 20);
      if (pairing.rimException) {
        // Documented as not meeting it on fill. Assert that is still true, so
        // a pairing that quietly starts passing loses its excuse.
        assert.ok(
          worst.ratio < pairing.target,
          `${seedName} ${pairing.name}: ${worst.ratio.toFixed(2)}:1 now meets ${pairing.target} ` +
            `on fill alone — delete its rimException.`,
        );
        continue;
      }
      assert.ok(
        worst.ratio >= pairing.target,
        `${seedName} ${pairing.name}: ${worst.ratio.toFixed(2)}:1, needs ${pairing.target} — ` +
          `${pairing.where}. Either meet it or declare a rimException saying what carries ` +
          `the boundary instead.`,
      );
    }
  }
});

/**
 * On a light device the fills carry their own boundary: what's lit and the
 * primary fill are held to 3:1 on the ground they sit on, with no rim to lean
 * on. The white rim itself is invisible on white plastic, so it isn't measured
 * here: a light cap's edge is its seam and the shadow it casts, and a well's
 * is its inset shade, as the rim exceptions say.
 */
test("on a light device, what's lit and the primary fill meet 1.4.11 on fill alone", () => {
  const failures: string[] = [];
  for (const [seedName, seed] of LIGHT_SEEDS) {
    const { values } = createEchoTheme(seed);
    for (const pairing of NON_TEXT_PAIRINGS) {
      if (pairing.rimException || pairing.name === "cap rim vs cap face") continue;
      const worst = worstGradientContrast(pairing.foreground(values), pairing.background(values), 20);
      if (worst.ratio < pairing.target) failures.push(`${seedName} ${pairing.name}: ${worst.ratio.toFixed(2)}:1`);
    }
  }
  assert.deepEqual(failures, [], "on a light device nothing lends these a rim");
});

/**
 * The composited key-light rim is the entire basis on which WCAG 1.4.11 counts
 * as met here. If it ever stops clearing 3:1, the concession collapses and
 * every rimException above becomes a real failure.
 */
test("the key-light rim carries the boundary the fills do not", () => {
  for (const [name, seed] of SHIPPED_SEEDS) {
    const { values } = createEchoTheme(seed);
    const rim = NON_TEXT_PAIRINGS.find((p) => p.name === "cap rim vs cap face")!;
    const ratio = contrastRatio(rim.foreground(values), sampleGradient(rim.background(values), 0));
    assert.ok(
      ratio >= 3,
      `${name}: the cap rim is ${ratio.toFixed(2)}:1 against the cap face. The whole ` +
        `1.4.11 argument in material-pairings.ts rests on this clearing 3:1.`,
    );
  }
});

/* ------------------------------------ the declared pairings match the painted CSS */

const HERE = path.dirname(fileURLToPath(import.meta.url));
const css = (file: string) => readFileSync(path.join(HERE, "..", file), "utf8");

/**
 * The inventory above is only worth anything if it describes what is actually
 * painted. These parse the component CSS so that repointing a gradient at a
 * different role fails here instead of silently leaving the pairing unchecked.
 */
test("the primary cap still paints the three guarded roles", () => {
  const sheet = css("hardware-button/hardware-button.css");
  const block = sheet.slice(sheet.indexOf('.echo-hw__cap[data-variant="primary"]'));
  const gradient = block.slice(0, block.indexOf("}"));
  for (const role of ["--echo-primary-cap-top", "--echo-primary-cap-mid", "--echo-primary-cap-base"]) {
    assert.ok(gradient.includes(role), `the primary cap no longer uses ${role}`);
  }
  for (const stale of ["--echo-accent-2)", "--echo-accent-glow)", "--echo-accent-pressed)"]) {
    assert.ok(
      !gradient.includes(stale),
      `the primary cap is painted with ${stale} again — that is the 1.74:1 label that was fixed`,
    );
  }
});

test("the small accent caps wear the primary cap, not a second pink", () => {
  for (const [file, selector] of [
    ["badge/badge.css", '.echo-badge[data-variant="accent"]'],
    ["count-badge/count-badge.css", '.echo-count-badge[data-variant="accent"]'],
    ["pagination/pagination.css", ".echo-pagination__page[data-current]"],
  ] as const) {
    const sheet = css(file);
    const block = sheet.slice(sheet.indexOf(selector));
    const rule = block.slice(0, block.indexOf("}"));
    assert.ok(rule.includes("var(--echo-primary-cap-ink, var(--echo-text))"), `${selector} no longer prints the primary cap's own label`);
    for (const role of ["--echo-primary-cap-top", "--echo-primary-cap-mid", "--echo-primary-cap-base"]) {
      assert.ok(rule.includes(role), `${selector} no longer paints ${role}`);
    }
    assert.ok(!rule.includes("accent-fill"), `${selector} is back on the bubblegum accent fill`);
  }
});

test("the destructive confirm still paints the pairing declared for it", () => {
  const sheet = css("alert-dialog/alert-dialog.css");
  const block = sheet.slice(sheet.indexOf(".echo-alert__confirm[data-destructive] {"));
  const rule = block.slice(0, block.indexOf("}"));
  assert.match(rule, /color: var\(--echo-accent-1\)/);
  assert.match(rule, /var\(--echo-accent-5\) 0%, var\(--echo-accent-6\) 100%/);
});

/**
 * Every `--echo-*` colour role a component references has to be a role the
 * engine actually emits. A reference to a token that does not exist falls
 * through to `inherit`/`initial` silently — which is exactly how 60 font
 * declarations shipped with no typeface.
 */
test("no component CSS references a colour role nothing defines", () => {
  const { css: emitted } = createEchoTheme();
  const themeRoles = new Set([...emitted.matchAll(/--echo-[a-z0-9-]+/g)].map((m) => m[0]));
  const root = path.join(HERE, "..", "..", "..");
  const manifest = readFileSync(path.join(root, "registry.json"), "utf8");
  const files = [...new Set([...manifest.matchAll(/"(src\/echo\/[^"]+\.css)"/g)].map((m) => m[1]!))];

  const sheets = new Map<string, string>();
  for (const file of files) {
    try {
      sheets.set(file, readFileSync(path.join(root, file), "utf8"));
    } catch {
      /* a manifest entry with no file on disk is registry.json's problem, not this test's */
    }
  }

  /*
   * A token is legitimate if the theme emits it, if some component CSS
   * DECLARES it, or if a component SETS it — the per-component tunables are
   * local variables, not theme roles, and several of them
   * (`--echo-skeleton-width`, `--echo-texture-image`) are written as inline
   * styles from props and so never appear in a stylesheet at all.
   */
  const declared = new Set(themeRoles);
  for (const text of sheets.values()) {
    for (const m of text.matchAll(/(--echo-[a-z0-9-]+)\s*:/g)) declared.add(m[1]!);
  }
  const sources = [...new Set([...manifest.matchAll(/"(src\/echo\/[^"]+\.tsx?)"/g)].map((m) => m[1]!))];
  for (const file of sources) {
    let text: string;
    try {
      text = readFileSync(path.join(root, file), "utf8");
    } catch {
      continue;
    }
    for (const m of text.matchAll(/["'`](--echo-[a-z0-9-]+)["'`]/g)) declared.add(m[1]!);
  }

  const missing: string[] = [];
  for (const [file, text] of sheets) {
    for (const m of text.matchAll(/var\((--echo-[a-z0-9-]+)/g)) {
      const token = m[1]!;
      // Font tokens are the type contract's, and are asserted there.
      if (token.startsWith("--echo-font")) continue;
      if (!declared.has(token)) missing.push(`${token} (${file})`);
    }
  }
  assert.deepEqual(
    [...new Set(missing)],
    [],
    "component CSS references tokens that neither the theme nor any stylesheet defines",
  );
});

/**
 * Focus rings are drawn in `accent-glow`: inside a well for text inputs, and
 * outside a surface-coloured gap for caps and holes. WCAG 1.4.11 asks 3:1 of
 * the indicator against what it sits on, for any seed (a text input's ring
 * mixed down to 70% reaches only 2.6:1).
 */
for (const [seedName, seed] of ALL_SEEDS) {
  test(`the focus glow has 3:1 against the well and the surface: ${seedName}`, () => {
    const { roles } = createEchoTheme(seed).values;
    for (const ground of ["well", "surface"] as const) {
      const ratio = contrastRatio(roles["accent-glow"], roles[ground]);
      assert.ok(ratio >= 3, `accent-glow on ${ground}: ${ratio.toFixed(2)}:1, needs 3`);
    }
  });
}
