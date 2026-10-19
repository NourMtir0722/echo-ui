/**
 * Colours as the browser reports them, for the page check.
 *
 * A computed style says `rgb(…)` for most colours, but `oklch(…)`,
 * `color(srgb …)` or `lab(…)` for a `color-mix()` or a colour written in one
 * of those spaces. Everything here turns them into one form, gamma-encoded
 * sRGB with alpha, and measures in it: compositing (what the eye sees through
 * a translucent layer), WCAG contrast, and how far a colour sits from the
 * colours a theme makes.
 */
import { contrastRatio } from "../theme/contrast";
import { linearRgbToOklab, linearToSrgb, oklabToLinearRgb, srgbToLinear, toHex } from "../theme/oklch";

/** Gamma-encoded sRGB, each channel 0..1, and alpha 0..1. */
export interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

type Vec3 = [number, number, number];

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const mul = (m: readonly Vec3[], v: Vec3): Vec3 => [
  m[0]![0] * v[0] + m[0]![1] * v[1] + m[0]![2] * v[2],
  m[1]![0] * v[0] + m[1]![1] * v[1] + m[1]![2] * v[2],
  m[2]![0] * v[0] + m[2]![1] * v[1] + m[2]![2] * v[2],
];

/* CSS Color 4's matrices: linear RGB spaces to and from CIE XYZ, on daylight's 6500 K white. */
const XYZ_TO_SRGB: Vec3[] = [
  [3.2409699419045213, -1.5373831775700935, -0.4986107602930033],
  [-0.9692436362808798, 1.8759675015077206, 0.04155505740717561],
  [0.05563007969699361, -0.20397695888897657, 1.0569715142428786],
];
const P3_TO_XYZ: Vec3[] = [
  [0.4865709486482162, 0.26566769316909306, 0.1982172852343625],
  [0.2289745640697488, 0.6917385218365064, 0.079286914093745],
  [0, 0.04511338185890264, 1.043944368900976],
];
/** Bradford: from the 5000 K white Lab is defined on, to daylight's. */
const D50_TO_D65: Vec3[] = [
  [0.9554734527042182, -0.023098536874261423, 0.0632593086610217],
  [-0.028369706963208136, 1.0099954580058226, 0.021041398966943008],
  [0.012314001688319899, -0.020507696433477912, 1.3303659366080753],
];
const D50_WHITE: Vec3 = [0.3457 / 0.3585, 1, (1 - 0.3457 - 0.3585) / 0.3585];

const vec = ({ r, g, b }: { r: number; g: number; b: number }): Vec3 => [r, g, b];
const fromLinear = ([r, g, b]: Vec3, a: number): Rgba => ({
  r: clamp01(linearToSrgb(r)),
  g: clamp01(linearToSrgb(g)),
  b: clamp01(linearToSrgb(b)),
  a,
});

function labToXyzD50(L: number, a: number, b: number): Vec3 {
  const k = 24389 / 27;
  const e = 216 / 24389;
  const f1 = (L + 16) / 116;
  const f0 = a / 500 + f1;
  const f2 = f1 - b / 200;
  const x = f0 ** 3 > e ? f0 ** 3 : (116 * f0 - 16) / k;
  const y = L > k * e ? f1 ** 3 : L / k;
  const z = f2 ** 3 > e ? f2 ** 3 : (116 * f2 - 16) / k;
  return [x * D50_WHITE[0], y * D50_WHITE[1], z * D50_WHITE[2]];
}

/** A number, a percentage of `percent`, or `none` (0). */
function amount(token: string | undefined, percent: number): number {
  if (token === undefined || token === "none") return 0;
  const n = parseFloat(token);
  if (Number.isNaN(n)) return NaN;
  return token.endsWith("%") ? (n / 100) * percent : n;
}

/** A hue in degrees, with any of CSS's angle units. */
function hue(token: string | undefined): number {
  if (token === undefined || token === "none") return 0;
  const n = parseFloat(token);
  if (token.endsWith("rad")) return (n * 180) / Math.PI;
  if (token.endsWith("grad")) return n * 0.9;
  if (token.endsWith("turn")) return n * 360;
  return n;
}

function hexColour(text: string): Rgba | undefined {
  const h = text.slice(1);
  if (!/^[0-9a-f]+$/i.test(h) || ![3, 4, 6, 8].includes(h.length)) return undefined;
  const full = h.length <= 4 ? [...h].map((c) => c + c).join("") : h;
  const at = (i: number) => parseInt(full.slice(i, i + 2), 16) / 255;
  return { r: at(0), g: at(2), b: at(4), a: full.length === 8 ? at(6) : 1 };
}

function hslToRgb(h: number, s: number, l: number): Vec3 {
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  };
  return [f(0), f(8), f(4)];
}

/**
 * A CSS colour as sRGB with alpha, or undefined for anything this can't read
 * (`currentcolor`, a system colour, a space nobody computes to).
 */
export function parseColour(input: string): Rgba | undefined {
  const text = input.trim().toLowerCase();
  if (text === "transparent") return { r: 0, g: 0, b: 0, a: 0 };
  if (text.startsWith("#")) return hexColour(text);
  const m = /^([a-z-]+)\((.*)\)$/.exec(text);
  if (!m) return undefined;
  const fn = m[1]!;
  const body = m[2]!.trim();
  let args: string[];
  let alphaToken: string | undefined;
  if (body.includes(",")) {
    const list = body.split(",").map((s) => s.trim());
    args = list.slice(0, 3);
    alphaToken = list[3];
  } else {
    const [main, alpha] = body.split("/");
    args = main!.trim().split(/\s+/);
    alphaToken = alpha?.trim();
  }
  const alpha = alphaToken === undefined ? 1 : clamp01(amount(alphaToken, 1));

  let out: Rgba | undefined;
  switch (fn) {
    case "rgb":
    case "rgba":
      out = { r: amount(args[0], 255) / 255, g: amount(args[1], 255) / 255, b: amount(args[2], 255) / 255, a: alpha };
      break;
    case "hsl":
    case "hsla": {
      const [r, g, b] = hslToRgb(hue(args[0]), amount(args[1], 100) / 100, amount(args[2], 100) / 100);
      out = { r, g, b, a: alpha };
      break;
    }
    case "oklab":
      out = fromLinear(vec(oklabToLinearRgb(amount(args[0], 1), amount(args[1], 0.4), amount(args[2], 0.4))), alpha);
      break;
    case "oklch": {
      const C = amount(args[1], 0.4);
      const H = (hue(args[2]) * Math.PI) / 180;
      out = fromLinear(vec(oklabToLinearRgb(amount(args[0], 1), C * Math.cos(H), C * Math.sin(H))), alpha);
      break;
    }
    case "lab":
      out = fromLinear(mul(XYZ_TO_SRGB, mul(D50_TO_D65, labToXyzD50(amount(args[0], 100), amount(args[1], 125), amount(args[2], 125)))), alpha);
      break;
    case "lch": {
      const C = amount(args[1], 150);
      const H = (hue(args[2]) * Math.PI) / 180;
      out = fromLinear(mul(XYZ_TO_SRGB, mul(D50_TO_D65, labToXyzD50(amount(args[0], 100), C * Math.cos(H), C * Math.sin(H)))), alpha);
      break;
    }
    case "color": {
      const [space, ...channels] = args;
      const v = channels.map((c) => amount(c, 1)) as Vec3;
      if (space === "srgb") out = { r: v[0], g: v[1], b: v[2], a: alpha };
      else if (space === "srgb-linear") out = fromLinear(v, alpha);
      else if (space === "display-p3") out = fromLinear(mul(XYZ_TO_SRGB, mul(P3_TO_XYZ, v.map(srgbToLinear) as Vec3)), alpha);
      else if (space === "xyz" || space === "xyz-d65") out = fromLinear(mul(XYZ_TO_SRGB, v), alpha);
      else if (space === "xyz-d50") out = fromLinear(mul(XYZ_TO_SRGB, mul(D50_TO_D65, v)), alpha);
      break;
    }
  }
  if (!out || [out.r, out.g, out.b, out.a].some(Number.isNaN)) return undefined;
  return { r: clamp01(out.r), g: clamp01(out.g), b: clamp01(out.b), a: out.a };
}

/** `top` seen over `bottom`, as the browser composites them (in gamma-encoded sRGB). */
export function over(top: Rgba, bottom: Rgba): Rgba {
  const a = top.a + bottom.a * (1 - top.a);
  if (a === 0) return { r: 0, g: 0, b: 0, a: 0 };
  const mix = (t: number, b: number) => (t * top.a + b * bottom.a * (1 - top.a)) / a;
  return { r: mix(top.r, bottom.r), g: mix(top.g, bottom.g), b: mix(top.b, bottom.b), a };
}

/** `#rrggbb`, alpha dropped: what a person reads the colour as. */
export const hexOf = (c: Rgba) => toHex(c.r, c.g, c.b);

/** WCAG contrast between two opaque colours, with the theme's own formula. */
export const contrast = (a: Rgba, b: Rgba) => contrastRatio(hexOf(a), hexOf(b));

/** OKLab, alpha ignored. */
export function oklab(c: Rgba): Vec3 {
  const { L, a, b } = linearRgbToOklab({ r: srgbToLinear(c.r), g: srgbToLinear(c.g), b: srgbToLinear(c.b) });
  return [L, a, b];
}

const distance = (p: Vec3, q: Vec3) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);

/** Where along a → b the point nearest `p` is, 0..1. */
function along(p: Vec3, a: Vec3, b: Vec3): number {
  const d: Vec3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const len = d[0] * d[0] + d[1] * d[1] + d[2] * d[2];
  if (len === 0) return 0;
  return clamp01(((p[0] - a[0]) * d[0] + (p[1] - a[1]) * d[1] + (p[2] - a[2]) * d[2]) / len);
}

/**
 * How far `c` is from any mix of `a` and `b`, as OKLab ΔE. A `color-mix()`
 * of two theme colours lands on the line between them in the space it mixes
 * in, so both of the spaces mixes are written in are tried: sRGB and OKLab.
 * (OKLCH's mixes curve round the hue, but between two colours of one family
 * they stay within a step of the OKLab line.)
 */
export function mixDistance(c: Rgba, a: Rgba, b: Rgba): number {
  const p = oklab(c);
  const [la, lb] = [oklab(a), oklab(b)];
  const t = along(p, la, lb);
  const inOklab = distance(p, [la[0] + (lb[0] - la[0]) * t, la[1] + (lb[1] - la[1]) * t, la[2] + (lb[2] - la[2]) * t]);
  const s = along([c.r, c.g, c.b], [a.r, a.g, a.b], [b.r, b.g, b.b]);
  const inSrgb = distance(p, oklab({ r: a.r + (b.r - a.r) * s, g: a.g + (b.g - a.g) * s, b: a.b + (b.b - a.b) * s, a: 1 }));
  return Math.min(inOklab, inSrgb);
}

/** OKLab ΔE between two colours, alpha ignored. */
export const deltaE = (a: Rgba, b: Rgba) => distance(oklab(a), oklab(b));
