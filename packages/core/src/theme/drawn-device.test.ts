/**
 * The drawn device: the same parts, drawn in the ink instead of molded and lit,
 * the way a spec sheet draws a key. Outlined, hollow, standing on a hard ink
 * edge; no gloss, no shade, nothing that glows. What a part is, how it's
 * pressed and what it says don't change, and every contrast guarantee holds.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { createEchoTheme } from "./create-echo-theme";
import { contrastRatio } from "./contrast";
import { DRAWN_LINE_WIDTH } from "./device";
import { EchoSeed } from "./seed";
import { SHADOW_RECIPES, shadowValue, type ShadowName } from "./shadow";

const quiet = { quiet: true };

const DRAWN_SEEDS = {
  // A spec sheet: white paper, black ink, an acid highlighter.
  "acid on paper": { accent: "#D3F44F", chassis: "#FBFBFB", paper: "#050505", lcdTint: "#DADCDB" },
  // Echo's own colours, drawn: chalk on a dark body.
  "echo, drawn": {},
  // A deep accent the ink can't read on: the label turns to the body.
  "navy ink": { accent: "#0A33E3", chassis: "#FCFCFC", paper: "#030529" },
  // Drafting Index, the style Echo publishes (registry/styles/drafting-index.json): one black ink.
  "drafting index": { accent: "#050505", chassis: "#FDFDFD", paper: "#050505", radius: 0.3, pills: true },
} as const;

const vars = (css: string) =>
  Object.fromEntries([...css.matchAll(/(--echo-[a-z0-9-]+):\s*([^;]+);/g)].map((m) => [m[1]!, m[2]!.trim()]));

test("render is part of the seed: molded by default, drawn when asked, nothing else", () => {
  assert.equal(EchoSeed.parse({}).render, "molded");
  assert.equal(EchoSeed.parse({ render: "drawn" }).render, "drawn");
  assert.throws(() => EchoSeed.parse({ render: "sketched" as "drawn" }), /render must be one of molded, drawn/);
  assert.equal(createEchoTheme({ render: "drawn" }, quiet).values.device.render, "drawn");
});

test("a molded device draws no line: every outline is 0px and nothing stands on ink", () => {
  const v = vars(createEchoTheme({}, quiet).css);
  assert.equal(v["--echo-drawn"], "0");
  assert.equal(v["--echo-line-width"], "0px");
  // The lit cap's edge is the colour it always was.
  assert.equal(v["--echo-lit-edge"], v["--echo-accent-6"]);
});

for (const [name, input] of Object.entries(DRAWN_SEEDS)) {
  const seed = { ...input, render: "drawn" as const };

  test(`drawn device, ${name}: the parts are hollow, drawn in the ink, with the light off`, () => {
    const { css, values } = createEchoTheme(seed, quiet);
    const r = values.roles;
    const v = vars(css);
    for (const role of ["cap", "cap-highlight", "cap-shadow", "well"] as const) {
      assert.equal(r[role], r.surface, `${role} is the body: a drawn part is hollow`);
    }
    assert.equal(r.seam, r.text, "the seam is the ink");
    assert.equal(v["--echo-line"], r.text, "the line is the ink");
    assert.equal(v["--echo-line-width"], DRAWN_LINE_WIDTH);
    assert.equal(v["--echo-drawn"], "1");
    assert.equal(v["--echo-gloss"], "0", "no highlight");
    assert.equal(v["--echo-shade"], "0", "no shadow");
    // Nothing glows: what's lit on a molded device is solid ink.
    assert.equal(r["accent-glow"], r.text);
    assert.equal(r["accent-ink"], r.text);
    assert.equal(v["--echo-lit-edge"], r.text, "the key stands on an ink edge");
  });

  test(`drawn device, ${name}: every text and label holds AA, and the line is more than 3:1`, () => {
    const { values, report } = createEchoTheme(seed, quiet);
    const r = values.roles;
    assert.deepEqual(report.unsatisfiable, []);
    for (const ground of ["surface", "well", "lcd", "cap"] as const) {
      assert.ok(contrastRatio(r.text, r[ground]) >= 4.5, `text on ${ground}: ${contrastRatio(r.text, r[ground]).toFixed(2)}`);
      assert.ok(contrastRatio(r["text-dim"], r[ground]) >= 4.5, `text-dim on ${ground}`);
    }
    for (const stop of ["primary-cap-top", "primary-cap-mid", "primary-cap-base"] as const) {
      assert.ok(contrastRatio(r["primary-cap-ink"], r[stop]) >= 4.5, `primary label on ${stop}: ${contrastRatio(r["primary-cap-ink"], r[stop]).toFixed(2)}`);
    }
    for (const stop of ["pour-top", "pour-mid", "pour-base"] as const) {
      assert.ok(contrastRatio(r.text, r[stop]) >= 4.5, `text on ${stop}`);
    }
    // The outline is what sets a part off the page (1.4.11).
    assert.ok(contrastRatio(r.text, r.surface) >= 3);
  });
}

test("drawn, a highlighter accent keeps its colour, flat, under the ink", () => {
  const { values, report } = createEchoTheme({ ...DRAWN_SEEDS["acid on paper"], render: "drawn" }, quiet);
  const r = values.roles;
  assert.equal(r["primary-cap-top"], "#d3f44f");
  assert.equal(r["primary-cap-mid"], r["primary-cap-top"]);
  assert.equal(r["primary-cap-base"], r["primary-cap-top"], "flat: a drawing has no light to grade it");
  assert.equal(r["primary-cap-ink"], r.text, "the label is the ink");
  assert.equal(r["pour-mid"], "#d3f44f");
  assert.equal(report.accent, undefined, "the colour wasn't moved where it's seen");
  // Molded, the same accent is held to Echo's lightness band and comes out olive.
  const molded = createEchoTheme(DRAWN_SEEDS["acid on paper"], quiet);
  assert.notEqual(molded.values.roles["primary-cap-top"], "#d3f44f");
  assert.ok(molded.report.accent);
});

test("drawn, an accent too deep for the ink takes the body as its label", () => {
  const r = createEchoTheme({ ...DRAWN_SEEDS["navy ink"], render: "drawn" }, quiet).values.roles;
  assert.equal(r["primary-cap-top"], "#0a33e3");
  assert.equal(r["primary-cap-ink"], r.surface);
});

test("drawn in black and white: the fill is the ink, and what's drawn on it inverts to the paper", () => {
  const v = vars(createEchoTheme({ accent: "#050505", chassis: "#FBFBFB", paper: "#050505", render: "drawn" }, quiet).css);
  assert.equal(v["--echo-drawn-fill"], "#050505", "on is solid ink, not a grey");
  assert.equal(v["--echo-drawn-on-fill"], "#FBFBFB", "a paper thumb on a black track");
  // A fill the ink reads on keeps the ink on top of it.
  const acid = vars(createEchoTheme({ ...DRAWN_SEEDS["acid on paper"], render: "drawn" }, quiet).css);
  assert.equal(acid["--echo-drawn-fill"], "#d3f44f");
  assert.equal(acid["--echo-drawn-on-fill"], "#050505");
  // Molded, neither exists, so components draw what they always drew.
  const molded = vars(createEchoTheme({}, quiet).css);
  assert.equal(molded["--echo-drawn-fill"], "initial");
  assert.equal(molded["--echo-drawn-on-fill"], "initial");
});

test("every recipe draws its line on a drawn device, and only there", () => {
  // Recessed parts are outlined inside, raised and floating ones outside; on a
  // molded device the line is 0px wide, so each of these layers draws nothing.
  for (const name of Object.keys(SHADOW_RECIPES) as ShadowName[]) {
    const { kind } = SHADOW_RECIPES[name];
    if (kind === "focus" || kind === "glow" || name === "edge" || name === "hairline" || name === "chassis") continue;
    assert.match(shadowValue(name), /var\(--echo-line-width, 0px\)/, `${name} has no drawn line`);
  }
  // A drawing has no light: the lit cap's halo and the glow collapse.
  assert.match(shadowValue("cap-lit"), /calc\(20px \* \(1 - var\(--echo-drawn, 0\)\)\)/);
  assert.match(shadowValue("glow"), /calc\(7px \* \(1 - var\(--echo-drawn, 0\)\)\)/);
});

test("drawn, the primary key is the paper key, its label the ink; molded keeps its lit cap", () => {
  const drawn = vars(createEchoTheme({ accent: "#050505", chassis: "#FBFBFB", paper: "#050505", render: "drawn" }, quiet).css);
  assert.equal(drawn["--echo-drawn-key"], "#FBFBFB");
  assert.equal(drawn["--echo-drawn-key-ink"], "#050505");
  const molded = vars(createEchoTheme({}, quiet).css);
  assert.equal(molded["--echo-drawn-key"], "initial");
  assert.equal(molded["--echo-drawn-key-ink"], "initial");
});

test("pills: buttons and segments are pills whatever the radius, and unset they follow radius 1 as before", () => {
  const capRound = (seed: Parameters<typeof createEchoTheme>[0]) => vars(createEchoTheme(seed, quiet).css)["--echo-cap-round"];
  // A spec sheet: pill keys, crisp boxes.
  assert.equal(capRound({ radius: 0.3, pills: true }), "1");
  // Soft boxes, square keys.
  assert.equal(capRound({ radius: 1, pills: false }), "0");
  // Unset: what radius has always done.
  assert.equal(capRound({ radius: 1 }), "1");
  assert.equal(capRound({ radius: 0.5 }), "0");
  assert.throws(() => EchoSeed.parse({ pills: "yes" as unknown as boolean }), /pills must be true or false/);
});
