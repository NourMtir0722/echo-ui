/**
 * Colours for the 3D creatures.
 *
 * Echo itself wears the seed, like every other drawing of it: its marble is
 * the engine's accent, highlight and pressed colours, read off the page so a
 * reseed relights it, veined with a neighbour of the seed's hue.
 *
 * The crowd in the footer are its neighbours around the colour wheel. Each is
 * the seed's hue turned by a fixed step, veined with the next step along, and
 * lighter or deeper by turns, so the crowd relights with the seed too. The
 * turns skip the arc from yellow through green to teal: Echo's palette has
 * none of those.
 *
 * Worked in OKLCH, where a turn of hue keeps the lightness a person sees.
 */

export interface Marble {
  /** The body's colour. */
  base: string;
  /** Where the marble runs light. */
  light: string;
  /** Where it runs deep. */
  deep: string;
  /** The vein swirled through it: a neighbouring hue. */
  vein: string;
  /** How much of the vein shows, 0..1. */
  veins: number;
  /** Where in the noise this creature's marble is cut from. */
  grain: number;
}

type Lch = [l: number, c: number, h: number];

const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toGamma = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

export function hexToOklch(hex: string): Lch {
  const n = parseInt(hex.slice(1), 16);
  const r = toLinear(((n >> 16) & 255) / 255);
  const g = toLinear(((n >> 8) & 255) / 255);
  const b = toLinear((n & 255) / 255);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return [L, Math.hypot(A, B), ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360];
}

function oklchToRgb([L, C, h]: Lch): [number, number, number] {
  const a = C * Math.cos((h * Math.PI) / 180);
  const b = C * Math.sin((h * Math.PI) / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

/** An OKLCH colour as hex, its chroma reduced until it fits in sRGB. */
export function oklchToHex([L, C, h]: Lch): string {
  const fits = (c: number) => oklchToRgb([L, c, h]).every((v) => v >= -1e-4 && v <= 1 + 1e-4);
  let c = C;
  if (!fits(c)) {
    let lo = 0;
    let hi = C;
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2;
      if (fits(mid)) lo = mid;
      else hi = mid;
    }
    c = lo;
  }
  const rgb = oklchToRgb([L, c, h]).map((v) => Math.round(Math.min(1, Math.max(0, toGamma(Math.min(1, Math.max(0, v))))) * 255));
  return `#${rgb.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

/** Hues Echo doesn't wear, in OKLCH degrees: yellow, lime, green, mint, teal and cyan. */
export const UNWORN = [58, 225] as const;

/** A hue moved out of the unworn arc to whichever end of it is nearer. */
export function wearable(h: number): number {
  const hue = ((h % 360) + 360) % 360;
  const [from, to] = UNWORN;
  if (hue <= from || hue >= to) return hue;
  return hue - from < to - hue ? from : to;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function marbleOf([L, C, h]: Lch, vein: number, veins: number, grain: number): Marble {
  return {
    base: oklchToHex([L, C, wearable(h)]),
    light: oklchToHex([clamp(L + 0.15, 0, 0.93), C * 0.72, wearable(h + 12)]),
    deep: oklchToHex([clamp(L - 0.17, 0.26, 1), C * 1.05, wearable(h - 16)]),
    vein: oklchToHex([clamp(L + 0.04, 0.4, 0.86), Math.max(C, 0.12) * 1.05, wearable(vein)]),
    veins,
    grain,
  };
}

/**
 * Echo's own marble, from the engine's colours for the seed. `accent`,
 * `highlight` and `pressed` are what the page resolved them to.
 */
export function echoMarble(accent: string, highlight: string, pressed: string): Marble {
  const [L, C, h] = hexToOklch(accent);
  return {
    base: accent,
    light: highlight,
    deep: pressed,
    vein: oklchToHex([clamp(L + 0.06, 0.45, 0.85), Math.max(C, 0.12), wearable(h + 38)]),
    veins: 0.6,
    grain: 0,
  };
}

/** The steps around the wheel the crowd takes from the seed, nearest first. */
const STEPS = [0, 40, -40, 80, -80, 120, -120, 160, -160, 200];

/**
 * `count` marbles for the crowd, for the seed `accent`. The first is the
 * seed's own hue; each is veined with the next step round, and each has its
 * own cut of the noise so no two swirl alike.
 */
export function crowdMarbles(accent: string, count: number): Marble[] {
  const [L, C, h] = hexToOklch(accent);
  const chroma = Math.max(C, 0.13);
  const out: Marble[] = [];
  for (let i = 0; i < count; i++) {
    const step = STEPS[i % STEPS.length]!;
    const round = Math.floor(i / STEPS.length);
    const hue = wearable(h + step + round * 17);
    const tone = [0, 0.07, -0.06, 0.12][i % 4]! - round * 0.03;
    const next = wearable(hue + (i % 2 ? -1 : 1) * 55);
    out.push(marbleOf([clamp(L + tone, 0.46, 0.84), chroma * (1 - (i % 3) * 0.08), hue], next, 0.35 + (i % 5) * 0.09, (i + 1) * 7.31));
  }
  return out;
}

/**
 * Marbles for a drawn look in one ink: no hue to turn round the wheel, so
 * Echo is the paper, and the crowd runs from the paper through the greys to
 * the ink, each drawn with its line.
 */
export function inkMarbles(ink: string, paper: string, count: number): Marble[] {
  const [Lp] = hexToOklch(paper);
  const [Li] = hexToOklch(ink);
  const shares = [0, 0.12, 0.3, 0, 0.5, 0.72, 0.08, 1];
  return Array.from({ length: count }, (_, i) => {
    const L = Lp + (Li - Lp) * shares[i % shares.length]!;
    return {
      base: oklchToHex([L, 0, 0]),
      light: oklchToHex([clamp(L + 0.08, 0, 0.99), 0, 0]),
      deep: oklchToHex([clamp(L - 0.1, 0.04, 1), 0, 0]),
      vein: oklchToHex([clamp(L - 0.04, 0.04, 1), 0, 0]),
      veins: 0,
      grain: (i + 1) * 7.31,
    };
  });
}
