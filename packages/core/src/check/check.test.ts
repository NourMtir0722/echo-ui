import { test } from "node:test";
import assert from "node:assert/strict";

import { createEchoTheme } from "../theme/create-echo-theme";
import { ECHO_ROLES } from "../theme/roles";
import { contrast, over, parseColour, type Rgba } from "./colour";
import { Palette } from "./palette";
import { parseGradient, sampleGradient } from "./gradient";
import { gradientLayers, isLarge, smallTextHardToRead, textContrast, topLevel, type TextGeometry } from "./text-contrast";

const near = (actual: Rgba | undefined, expected: Partial<Rgba>, within = 0.01) => {
  assert.ok(actual, "didn't parse");
  for (const [k, v] of Object.entries(expected)) {
    assert.ok(Math.abs(actual[k as keyof Rgba] - (v as number)) <= within, `${k}: ${actual[k as keyof Rgba]} is not ${v}`);
  }
};

test("it reads every colour form a computed style reports", () => {
  near(parseColour("rgb(255, 0, 0)"), { r: 1, g: 0, b: 0, a: 1 });
  near(parseColour("rgba(0, 0, 0, 0.5)"), { r: 0, a: 0.5 });
  near(parseColour("rgb(0 128 255 / 50%)"), { g: 128 / 255, b: 1, a: 0.5 });
  near(parseColour("color(srgb 1 0.5 0 / 0.25)"), { r: 1, g: 0.5, b: 0, a: 0.25 });
  near(parseColour("oklch(0.628 0.2577 29.23)"), { r: 1, g: 0, b: 0 });
  near(parseColour("oklab(1 0 0)"), { r: 1, g: 1, b: 1 });
  near(parseColour("lab(54.29 80.8 69.89)"), { r: 1, g: 0, b: 0 }, 0.02);
  near(parseColour("hsl(120, 100%, 25%)"), { r: 0, g: 0.5, b: 0 });
  // Wider than sRGB: clipped to what an sRGB screen can show.
  near(parseColour("color(display-p3 1 0 0)"), { r: 1, g: 0, b: 0 });
  near(parseColour("#8b6fe8"), { r: 0x8b / 255, g: 0x6f / 255, b: 0xe8 / 255, a: 1 });
  near(parseColour("#fff8"), { r: 1, a: 0x88 / 255 });
  near(parseColour("transparent"), { a: 0 });
  assert.equal(parseColour("currentcolor"), undefined);
  assert.equal(parseColour("color(rec2100-pq 1 0 0)"), undefined);
});

test("layers composite the way the browser paints them", () => {
  const black = { r: 0, g: 0, b: 0, a: 1 };
  near(over({ r: 1, g: 1, b: 1, a: 0.5 }, black), { r: 0.5, g: 0.5, b: 0.5, a: 1 });
  near(over({ r: 1, g: 0, b: 0, a: 0 }, black), black);
  assert.equal(Math.round(contrast({ r: 1, g: 1, b: 1, a: 1 }, black)), 21);
});

const theme = createEchoTheme(undefined, { quiet: true }).values;
const palette = new Palette(
  new Map(ECHO_ROLES.map((role) => [`--echo-${role}`, parseColour(theme.roles[role])!])),
  [parseColour("#1da1f2")!],
);
const role = (name: (typeof ECHO_ROLES)[number]) => parseColour(theme.roles[name])!;

test("a theme colour is the theme's with any alpha, and so is a mix of two", () => {
  assert.deepEqual(palette.match(role("accent")), { ours: true });
  assert.deepEqual(palette.match({ ...role("text"), a: 0.4 }), { ours: true });
  const [a, b] = [role("text"), role("surface")];
  const srgbMix = { r: (a.r + b.r) / 2, g: (a.g + b.g) / 2, b: (a.b + b.b) / 2, a: 1 };
  assert.deepEqual(palette.match(srgbMix), { ours: true });
  // The team's own colour, on purpose.
  assert.deepEqual(palette.match(parseColour("#1da1f2")!), { ours: true });
});

test("a colour written by hand isn't, and a role is named only when it's plainly standing in for one", () => {
  assert.deepEqual(palette.match(parseColour("#ff0000")!), { ours: false, nearest: undefined });
  assert.equal(palette.match(parseColour("#00ff00")!).ours, false);
  // The accent, nudged: a hand-copied hex that drifted.
  const accent = role("accent");
  const drifted = { ...accent, r: Math.min(1, accent.r + 0.06), b: Math.max(0, accent.b - 0.06) };
  const match = palette.match(drifted);
  assert.ok(!match.ours && match.nearest?.startsWith("--echo-accent"), JSON.stringify(match));
});

test("a background-image splits into its layers, and an image can't be read", () => {
  assert.deepEqual(topLevel("linear-gradient(rgb(0, 0, 0), rgb(1, 1, 1)), rgb(2, 2, 2)"), [
    "linear-gradient(rgb(0, 0, 0), rgb(1, 1, 1))",
    "rgb(2, 2, 2)",
  ]);
  const layers = gradientLayers("linear-gradient(rgb(255, 0, 0) 0%, rgba(0, 0, 0, 0.5) 100%), radial-gradient(transparent, oklch(1 0 0))");
  assert.equal(layers?.length, 2);
  assert.equal(layers?.[0]?.length, 2);
  assert.equal(gradientLayers('url("grain.png"), linear-gradient(red, blue)'), undefined);
  assert.deepEqual(gradientLayers("none"), []);
});

/* textContrast walks parents and reads styles: a stand-in for each is enough. */
type Fake = { parentElement: Fake | null; style: Record<string, string> };
const node = (style: Record<string, string>, parentElement: Fake | null = null): Fake => ({ parentElement, style });
const styleOf = (el: Element) => {
  const s = (el as unknown as Fake).style;
  const all: Record<string, string> = {
    color: "rgb(0, 0, 0)",
    backgroundColor: "rgba(0, 0, 0, 0)",
    backgroundImage: "none",
    backdropFilter: "none",
    filter: "none",
    mixBlendMode: "normal",
    opacity: "1",
    backgroundClip: "border-box",
    backgroundSize: "auto",
    backgroundPosition: "0% 0%",
    backgroundRepeat: "repeat",
    backgroundOrigin: "padding-box",
    fontSize: "16px",
    fontWeight: "400",
    ...s,
  };
  return { ...all, getPropertyValue: (name: string) => all[name] ?? "" } as unknown as CSSStyleDeclaration;
};
const white = { r: 1, g: 1, b: 1, a: 1 };
const measure = (el: Fake) => textContrast(el as unknown as Element, styleOf, white);

test("text is measured against the nearest ground, through translucent layers", () => {
  const page = node({ backgroundColor: "rgb(0, 0, 0)" });
  assert.equal(Math.round(measure(node({ color: "rgb(255, 255, 255)" }, page))!.ratio), 21);
  // #777 on the white canvas: just under AA.
  const grey = measure(node({ color: "rgb(119, 119, 119)" }))!;
  assert.ok(grey.ratio < 4.5 && grey.ratio > 4.4, String(grey.ratio));
  assert.equal(grey.needed, 4.5);
  // Half-white over black is mid grey, and white text on it drops.
  const veil = node({ backgroundColor: "rgba(255, 255, 255, 0.5)" }, page);
  const onVeil = measure(node({ color: "rgb(255, 255, 255)" }, veil))!;
  assert.ok(onVeil.ratio < 5, String(onVeil.ratio));
});

test("a gradient counts at its worst stop, and large text needs 3:1", () => {
  const cap = node({ backgroundImage: "linear-gradient(rgb(0, 0, 0), rgb(150, 150, 150))" });
  const text = measure(node({ color: "rgb(255, 255, 255)" }, cap))!;
  assert.ok(text.ratio < 3.2, String(text.ratio));
  assert.equal(measure(node({ color: "rgb(255, 255, 255)", fontSize: "24px" }, cap))!.needed, 3);
  assert.ok(isLarge(styleOf(node({ fontSize: "19px", fontWeight: "700" }) as unknown as Element)));
  assert.ok(!isLarge(styleOf(node({ fontSize: "19px" }) as unknown as Element)));
});

test("what styles can't say isn't guessed", () => {
  const glass = node({ backgroundColor: "rgba(0, 0, 0, 0.4)", backdropFilter: "blur(12px)" });
  assert.equal(measure(node({ color: "rgb(255, 255, 255)" }, glass)), undefined);
  const photo = node({ backgroundImage: 'url("a.jpg")' });
  assert.equal(measure(node({ color: "rgb(255, 255, 255)" }, photo)), undefined);
  assert.equal(measure(node({ color: "rgb(255, 255, 255)", backgroundClip: "text" })), undefined);
  assert.equal(measure(node({ color: "rgba(0, 0, 0, 0)" })), undefined);
});

/** A sampled grey, as 0..255, within one step of rounding. */
const isGrey = (c: Rgba | undefined, expected: number) =>
  assert.ok(Math.abs((c?.r ?? NaN) * 255 - expected) <= 1, `${(c?.r ?? NaN) * 255} is not ${expected}`);

test("a gradient is sampled where the point is: linear, to a corner, radial, conic, repeating", () => {
  const down = parseGradient("linear-gradient(rgb(0, 0, 0), rgb(255, 255, 255))")!;
  isGrey(sampleGradient(down, 100, 40, 50, 0), 0);
  isGrey(sampleGradient(down, 100, 40, 50, 20), 128);
  isGrey(sampleGradient(down, 100, 40, 50, 40), 255);
  const right = parseGradient("linear-gradient(90deg, rgb(0, 0, 0) 0%, rgb(255, 255, 255) 50%)")!;
  isGrey(sampleGradient(right, 100, 40, 25, 10), 128);
  isGrey(sampleGradient(right, 100, 40, 90, 10), 255);
  const corner = parseGradient("linear-gradient(to bottom right, rgb(0, 0, 0), rgb(255, 255, 255))")!;
  isGrey(sampleGradient(corner, 100, 40, 50, 20), 128);
  isGrey(sampleGradient(corner, 100, 40, 100, 40), 255);
  // A pillow of light at the top edge: bright there, gone by the middle.
  const pillow = parseGradient("radial-gradient(115% 85% at 32% 0%, rgb(255, 255, 255) 0%, rgba(0, 0, 0, 0) 72%)")!;
  assert.equal(sampleGradient(pillow, 100, 40, 32, 0)?.a, 1);
  assert.ok(sampleGradient(pillow, 100, 40, 50, 30)!.a < 0.2);
  const conic = parseGradient("conic-gradient(from 90deg, rgb(0, 0, 0), rgb(255, 255, 255))")!;
  isGrey(sampleGradient(conic, 100, 100, 100, 50), 0);
  const stripes = parseGradient("repeating-linear-gradient(90deg, rgb(0, 0, 0) 0px, rgb(255, 255, 255) 10px)")!;
  isGrey(sampleGradient(stripes, 100, 40, 25, 0), 128);
});

test("text on a soft-molded cap is measured where it sits, not against the highlight at the top", () => {
  const cap = node({
    backgroundImage:
      "radial-gradient(115% 85% at 32% 0%, rgba(255, 255, 255, 0.34) 0%, rgba(0, 0, 0, 0) 72%), linear-gradient(rgb(110, 105, 125) 0%, rgb(58, 54, 70) 40%, rgb(58, 54, 70) 62%, rgb(40, 37, 50) 100%)",
  });
  const label = node({ color: "rgb(239, 235, 250)" }, cap);
  const geometry: TextGeometry = {
    points: [30, 50, 70].map((x) => ({ x, y: 20 })),
    box: () => ({ left: 0, top: 0, width: 100, height: 40 }),
  };
  const everywhere = measure(label)!;
  const whereItIs = textContrast(label as unknown as Element, styleOf, white, geometry)!;
  assert.ok(everywhere.ratio < 4.5, `every stop at once: ${everywhere.ratio}`);
  assert.ok(whereItIs.ratio >= 4.5, `where the label sits: ${whereItIs.ratio}`);
});

test("small text that passes AA and reads under APCA's floor is said; large text and readable text aren't", () => {
  // The travel screen's badge: a lit blue on black, 5.3:1 by WCAG 2, Lc 36 by APCA.
  assert.match(smallTextHardToRead("#507bf5", "#050615", 5.26, false)!, /passes AA at 5\.3:1 and still reads at APCA Lc 3\d/);
  assert.equal(smallTextHardToRead("#507bf5", "#050615", 5.26, true), undefined, "large text is read with less");
  assert.equal(smallTextHardToRead("#fcfcfc", "#121839", 16.5, false), undefined);
  // Echo's own lit text, after the fix, on its screen.
  const r = createEchoTheme({}, { quiet: true }).values.roles;
  assert.equal(smallTextHardToRead(r["accent-ink"], r.lcd, 7, false), undefined);
});
