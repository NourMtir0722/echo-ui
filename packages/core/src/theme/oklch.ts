/**
 * Zero-dependency OKLCH color math (Björn Ottosson's OKLab).
 *
 * The Echo theme engine derives every material shade by moving in OKLCH space —
 * perceptually uniform lightness/chroma steps keep the molded-plastic physics
 * correct across any accent hue. Runtime stays zero-dep by
 * hand-rolling the conversions here rather than pulling in culori.
 *
 * Pure functions only; no `window`, no module-scope side effects (SSR-safe).
 */

export interface OKLCH {
  /** Perceptual lightness, 0..1. */
  L: number;
  /** Chroma, 0..~0.37 for sRGB. */
  C: number;
  /** Hue in degrees, 0..360. */
  H: number;
}

interface LinearRGB {
  r: number;
  g: number;
  b: number;
}

/* ------------------------------------------------------------------ sRGB gamma */

/** sRGB gamma to linear light, per channel (0..1). Used by the page check too. */
export const srgbToLinear = (c: number): number =>
  c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

export const linearToSrgb = (c: number): number =>
  c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;

const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x);

/* ------------------------------------------------------------------ hex <-> rgb */

/** Parse `#rgb`, `#rrggbb`, or `#rrggbbaa` into 0..1 sRGB channels (+ alpha). */
export function parseHex(hex: string): { r: number; g: number; b: number; a: number } {
  let h = hex.trim().replace(/^#/, "");
  if (h.length === 3 || h.length === 4) {
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  }
  if ((h.length !== 6 && h.length !== 8) || !/^[0-9a-fA-F]+$/.test(h)) {
    throw new Error(`Invalid hex color: "${hex}"`);
  }
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
  return { r, g, b, a };
}

const channelToHex = (c: number): string =>
  Math.round(clamp01(c) * 255)
    .toString(16)
    .padStart(2, "0");

/** Format 0..1 sRGB channels as `#rrggbb`. */
export function toHex(r: number, g: number, b: number): string {
  return `#${channelToHex(r)}${channelToHex(g)}${channelToHex(b)}`;
}

/* ------------------------------------------------------------------ OKLab core */

export function linearRgbToOklab({ r, g, b }: LinearRGB): { L: number; a: number; b: number } {
  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;

  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);

  return {
    L: 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
    a: 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
    b: 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_,
  };
}

export function oklabToLinearRgb(L: number, a: number, b: number): LinearRGB {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  return {
    r: 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    g: -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    b: -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  };
}

/* ------------------------------------------------------------------ public API */

/** Convert a hex color to OKLCH. */
export function hexToOklch(hex: string): OKLCH {
  const { r, g, b } = parseHex(hex);
  const lab = linearRgbToOklab({
    r: srgbToLinear(r),
    g: srgbToLinear(g),
    b: srgbToLinear(b),
  });
  const C = Math.sqrt(lab.a * lab.a + lab.b * lab.b);
  let H = (Math.atan2(lab.b, lab.a) * 180) / Math.PI;
  if (H < 0) H += 360;
  return { L: lab.L, C, H };
}

/**
 * Convert OKLCH to a hex string. Out-of-gamut colors are clipped per channel
 * (documented v0.1 behavior — derivation stays within reasonable ranges, so
 * clipping is imperceptible; a chroma-reduction gamut map can come later).
 */
export function oklchToHex({ L, C, H }: OKLCH): string {
  const hr = (H * Math.PI) / 180;
  const a = C * Math.cos(hr);
  const b = C * Math.sin(hr);
  const lin = oklabToLinearRgb(L, a, b);
  return toHex(
    linearToSrgb(clamp01(lin.r)),
    linearToSrgb(clamp01(lin.g)),
    linearToSrgb(clamp01(lin.b)),
  );
}

/** True if this OKLCH color sits inside the sRGB gamut (no channel clipping). */
export function inGamut({ L, C, H }: OKLCH, epsilon = 1e-4): boolean {
  const hr = (H * Math.PI) / 180;
  const lin = oklabToLinearRgb(L, C * Math.cos(hr), C * Math.sin(hr));
  return (
    lin.r >= -epsilon &&
    lin.r <= 1 + epsilon &&
    lin.g >= -epsilon &&
    lin.g <= 1 + epsilon &&
    lin.b >= -epsilon &&
    lin.b <= 1 + epsilon
  );
}

/** Perceptual distance between two colors as Euclidean OKLab ΔE. */
export function deltaEOK(a: OKLCH, b: OKLCH): number {
  const ar = (a.H * Math.PI) / 180;
  const br = (b.H * Math.PI) / 180;
  const dL = a.L - b.L;
  const da = a.C * Math.cos(ar) - b.C * Math.cos(br);
  const db = a.C * Math.sin(ar) - b.C * Math.sin(br);
  return Math.sqrt(dL * dL + da * da + db * db);
}

export const deltaEHex = (a: string, b: string): number =>
  deltaEOK(hexToOklch(a), hexToOklch(b));

/** Nudge lightness/chroma/hue, returning a new OKLCH (values are not clamped to gamut). */
export function adjust(
  color: OKLCH,
  { dL = 0, dC = 0, dH = 0 }: { dL?: number; dC?: number; dH?: number },
): OKLCH {
  return {
    L: color.L + dL,
    C: Math.max(0, color.C + dC),
    H: (((color.H + dH) % 360) + 360) % 360,
  };
}

/**
 * Reduces chroma until the colour is reachable in sRGB, preserving L and H.
 *
 * Clamping lightness is only half a constraint: an OKLCH colour can sit at the
 * lightness you asked for and still be unreachable, in which case `oklchToHex`
 * clips per channel and the hex reads back at a different lightness entirely.
 * Pure green normalised to L 0.66 came back at 0.681 that way. Chroma is the
 * axis to give up, because hue is the seed's identity and lightness is the
 * thing being normalised.
 */
export function clampToGamut(color: OKLCH, epsilon = 1e-4): OKLCH {
  if (inGamut(color, epsilon)) return color;
  let lo = 0;
  let hi = color.C;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (inGamut({ ...color, C: mid }, epsilon)) lo = mid;
    else hi = mid;
  }
  return { ...color, C: lo };
}
