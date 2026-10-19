/**
 * Readability beyond the WCAG 2 ratio: what a person with tired eyes, or
 * colour blindness, can read at a label's size. Found on a screen that passed
 * every AA check and still hurt to read: its button and its table.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { APCA_SMALL_TEXT, apcaContrast, contrastRatio } from "./contrast";
import { createEchoTheme } from "./create-echo-theme";
import { hexToOklch } from "./oklch";
import { readability, simulate } from "./readability";
import type { EchoSeedInput } from "./seed";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = JSON.parse(readFileSync(path.join(HERE, "dark-device.fixture.json"), "utf8")) as Record<string, { seed: EchoSeedInput }>;
/** Deep navy with one cobalt: the seed the travel test wore, where its unreadable roles showed. */
const NAVY: EchoSeedInput = { accent: "#0A33E3", chassis: "#030529", paper: "#FCFCFC", finish: 0.1 };
const DARK: Record<string, EchoSeedInput> = { ...Object.fromEntries(Object.entries(FIXTURE).map(([k, v]) => [k, v.seed])), "deep navy": NAVY };

test("APCA matches its reference values", () => {
  // From the APCA-W3 documentation (0.0.98G).
  assert.equal(Math.round(apcaContrast("#888888", "#ffffff") * 10) / 10, 63.1);
  assert.equal(Math.round(apcaContrast("#ffffff", "#888888") * 10) / 10, 68.5);
  assert.equal(Math.round(apcaContrast("#000000", "#ffffff")), 106);
  assert.equal(Math.round(apcaContrast("#ffffff", "#000000")), 108);
  assert.equal(apcaContrast("#777777", "#777777"), 0);
});

for (const [name, seed] of Object.entries(DARK)) {
  // Dim text reads at Lc 48 to 56 on these grounds too, but lifting it moves the first Echo
  // device's calibrated dim text, which stays as designed. The readability report says it instead.
  test(`small lit text reads at APCA ${APCA_SMALL_TEXT} on every dark ground: ${name}`, () => {
    const r = createEchoTheme(seed, { quiet: true }).values.roles as Record<string, string>;
    for (const ground of ["lcd", "surface", "cap", "well"]) {
      const lc = apcaContrast(r["accent-ink"]!, r[ground]!);
      assert.ok(lc >= APCA_SMALL_TEXT, `accent-ink ${r["accent-ink"]} on ${ground} ${r[ground]}: Lc ${lc.toFixed(1)}`);
    }
  });
}

test("the light that isn't text keeps its colour: LEDs, rails and halos are the glow, as before", () => {
  for (const seed of Object.values(DARK)) {
    const r = createEchoTheme(seed, { quiet: true }).values.roles as Record<string, string>;
    assert.equal(r["lcd-glow"], r["accent-glow"], "the halo is the glow");
    assert.notEqual(r["accent-ink"], r["accent-glow"], "lit text is lifted from the glow");
  }
});

test("on a near-black chassis a cap still stands off the body, and its lit rim off the cap", () => {
  for (const seed of [NAVY, FIXTURE["dark chassis"]!.seed]) {
    const r = createEchoTheme(seed, { quiet: true }).values.roles as Record<string, string>;
    assert.ok(contrastRatio(r.cap!, r.surface!) >= 1.35, `cap ${r.cap} on the body ${r.surface}: ${contrastRatio(r.cap!, r.surface!).toFixed(2)}:1`);
    assert.ok(contrastRatio(r["cap-highlight"]!, r.cap!) >= 1.43, `rim ${r["cap-highlight"]} on the cap ${r.cap}: ${contrastRatio(r["cap-highlight"]!, r.cap!).toFixed(2)}:1`);
  }
});

test("roundness 1 makes caps pills; anything under it keeps the molding", () => {
  assert.match(createEchoTheme({ radius: 1 }, { quiet: true }).css, /--echo-cap-round: 1;/);
  assert.match(createEchoTheme({ radius: 0.9 }, { quiet: true }).css, /--echo-cap-round: 0;/);
  assert.match(createEchoTheme({}, { quiet: true }).css, /--echo-cap-round: 0;/);
});

test("the readability report catches what the travel screen showed, before the fix", () => {
  // The roles the deep navy seed's theme made before the fix, as measured on that screen.
  const before = readability(
    { surface: "#030529", cap: "#121b41", "cap-highlight": "#25325d", well: "#01000e", lcd: "#01000b", text: "#FCFCFC", "text-dim": "#b8b8b8", "accent-ink": "#427dff", "primary-cap-ink": "#FCFCFC", "primary-cap-top": "#3168fd", "primary-cap-mid": "#2a61ff" },
    "dark",
  );
  const fails = before.filter((n) => n.level === "fail").map((n) => `${n.kind}: ${n.message}`);
  assert.ok(fails.some((f) => /^text: lit text \(#427dff\) reads at APCA Lc 3\d on the/.test(f)), fails.join("\n"));
  assert.ok(fails.some((f) => /^edge: a cap \(#121b41\) stands off the body \(#030529\) at 1\.\d\d:1/.test(f)), fails.join("\n"));
  assert.ok(fails.some((f) => /^colour-blind: with deuteranopia, lit text on the screen reads at APCA Lc 3\d/.test(f)), fails.join("\n"));
});

test("after the fix, no seed Echo was tuned on, and not the deep navy one, has anything hard to read", () => {
  for (const [name, seed] of Object.entries(DARK)) {
    const { readability: notes } = createEchoTheme(seed, { quiet: true }).report;
    assert.deepEqual(notes.filter((n) => n.level === "fail").map((n) => n.message), [], name);
  }
});

test("dim text on a dark device is said as a note, not fixed: the calibrated look stays", () => {
  const { readability: notes } = createEchoTheme({}, { quiet: true }).report;
  assert.ok(notes.some((n) => n.level === "note" && /^dim text \(#[0-9a-f]{6}\) reads at APCA Lc \d\d on the cap/.test(n.message)), notes.map((n) => n.message).join("\n"));
});

test("a colour as someone with colour blindness sees it: greys stay grey, reds and greens meet", () => {
  assert.equal(simulate("#808080", "deuteranopia").toLowerCase(), "#808080");
  const red = hexToOklch(simulate("#d03030", "deuteranopia"));
  const green = hexToOklch(simulate("#30a030", "deuteranopia"));
  assert.ok(Math.abs(red.H - green.H) < 40, `red ${red.H.toFixed(0)}° and green ${green.H.toFixed(0)}° land close in hue`);
});
