/**
 * WCAG contrast guardrails. Derived text/surface pairs are
 * checked against AA; anything below threshold is auto-corrected by nudging
 * lightness, and the adjusted roles are reported. A generated theme can never
 * be inaccessible.
 */
import { parseHex, toHex, hexToOklch, oklchToHex, type OKLCH } from "./oklch";

/** WCAG AA for normal-size text. */
export const AA_NORMAL = 4.5;
/** WCAG AA for large text / UI. */
export const AA_LARGE = 3.0;
/** WCAG 2.2 SC 1.4.11: the parts of a control or a graphic that show its state or meaning. */
export const AA_NON_TEXT = 3.0;

/**
 * The luminance at which black and white give a colour the same contrast,
 * √(1.05 × 0.05) − 0.05 ≈ 0.179. Above it, dark goes further; below it, light.
 * Not 0.5: a grey at 0.3 reaches 7:1 against black and 3:1 against
 * white, and heading for white left it failing when it could have passed.
 */
const EQUAL_CONTRAST_LUMINANCE = Math.sqrt(1.05 * 0.05) - 0.05;

const linearize = (c: number): number =>
  c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

/** WCAG relative luminance of a hex color. */
export function relativeLuminance(hex: string): number {
  const { r, g, b } = parseHex(hex);
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

/** WCAG contrast ratio (1..21) between two hex colors. */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * The APCA lightness contrast a small label needs: Lc 60 is APCA's floor for
 * text people read, not just notice. The WCAG 2 ratio overrates bright,
 * saturated text on a dark ground: a lit blue on black passes at 5.3:1 and
 * reads at Lc 36, which is what a person's eyes caught on the travel test
 *. Echo holds both.
 */
export const APCA_SMALL_TEXT = 60;

/**
 * APCA-W3 lightness contrast (0.0.98G), as a magnitude: 0 to about 108, the
 * same scale whichever of the two is lighter. Text first, then its ground:
 * APCA reads the two differently, as eyes do.
 */
export function apcaContrast(text: string, ground: string): number {
  const screenY = (hex: string) => {
    const { r, g, b } = parseHex(hex);
    return 0.2126729 * r ** 2.4 + 0.7151522 * g ** 2.4 + 0.072175 * b ** 2.4;
  };
  // A soft clamp near black, where screens and eyes stop telling greys apart.
  const soft = (y: number) => (y > 0.022 ? y : y + (0.022 - y) ** 1.414);
  const t = soft(screenY(text));
  const g = soft(screenY(ground));
  if (Math.abs(g - t) < 0.0005) return 0;
  if (g > t) {
    const s = (g ** 0.56 - t ** 0.57) * 1.14;
    return s < 0.1 ? 0 : (s - 0.027) * 100;
  }
  const s = (g ** 0.65 - t ** 0.62) * 1.14;
  return s > -0.1 ? 0 : -(s + 0.027) * 100;
}

export interface ContrastFix {
  /** The (possibly adjusted) foreground color. */
  color: string;
  /** True if lightness had to move to meet the target. */
  adjusted: boolean;
  /** Final achieved ratio. */
  ratio: number;
}

/**
 * Ensure `fg` meets `target` contrast against `bg` by walking its OKLCH
 * lightness away from the background (up on dark backgrounds, down on light).
 * Chroma/hue are preserved. Returns the original color untouched if it already
 * passes.
 */
export function ensureContrast(
  fgHex: string,
  bgHex: string,
  target = AA_NORMAL,
): ContrastFix {
  const initial = contrastRatio(fgHex, bgHex);
  if (initial >= target) {
    return { color: fgHex, adjusted: false, ratio: initial };
  }

  const bgLum = relativeLuminance(bgHex);
  const fg: OKLCH = hexToOklch(fgHex);
  // Move toward white on dark backgrounds, toward black on light ones.
  const step = bgLum < EQUAL_CONTRAST_LUMINANCE ? 0.02 : -0.02;

  let best = fgHex;
  let bestRatio = initial;
  let L = fg.L;
  for (let i = 0; i < 60; i++) {
    L += step;
    if (L <= 0 || L >= 1) break;
    const candidate = oklchToHex({ L, C: fg.C, H: fg.H });
    const ratio = contrastRatio(candidate, bgHex);
    if (ratio > bestRatio) {
      bestRatio = ratio;
      best = candidate;
    }
    if (ratio >= target) break;
  }

  return { color: best, adjusted: true, ratio: bestRatio };
}

/* ------------------------------------------------------------ gradients */

/**
 * A gradient stop: a colour and its position along the axis, 0..1.
 *
 * Every Echo surface is a gradient, which is precisely why the contrast
 * contract missed the primary button for four seeds: axe skips
 * `color-contrast` on a gradient background and reports "incomplete", and
 * `CONTRAST_PAIRS` only ever knew about flat roles.
 */
export type GradientStop = readonly [color: string, position: number];

/**
 * Samples a gradient at `t` (0..1).
 *
 * Interpolation is in gamma-encoded sRGB because that is what
 * `linear-gradient(180deg, ...)` does when no interpolation space is named,
 * and the whole point of this module is to measure what the browser paints
 * rather than what the derivation intended.
 */
export function sampleGradient(stops: readonly GradientStop[], t: number): string {
  if (stops.length === 0) throw new Error("sampleGradient: no stops");
  const clamped = Math.min(1, Math.max(0, t));
  const first = stops[0]!;
  const last = stops[stops.length - 1]!;
  if (clamped <= first[1]) return first[0];
  if (clamped >= last[1]) return last[0];

  for (let i = 0; i < stops.length - 1; i++) {
    const [c0, p0] = stops[i]!;
    const [c1, p1] = stops[i + 1]!;
    if (clamped < p0 || clamped > p1) continue;
    const f = p1 === p0 ? 0 : (clamped - p0) / (p1 - p0);
    const a = parseHex(c0);
    const b = parseHex(c1);
    return toHex(a.r + (b.r - a.r) * f, a.g + (b.g - a.g) * f, a.b + (b.b - a.b) * f);
  }
  return last[0];
}

export interface GradientContrast {
  /** Position along the gradient, 0..1. */
  position: number;
  /** The sampled background at that position. */
  background: string;
  ratio: number;
}

/**
 * Walks a gradient and returns the contrast of `fg` at every declared stop AND
 * at `samples` evenly spaced positions between them.
 *
 * Both halves matter. Evaluating only the declared stops is how the primary cap
 * was once written up as a middle-band problem when the top stop is worse; evaluating
 * only an even sample can step straight over a narrow stop.
 */
export function gradientContrast(
  fgHex: string,
  stops: readonly GradientStop[],
  samples = 20,
): GradientContrast[] {
  const positions = new Set<number>(stops.map(([, p]) => p));
  for (let i = 0; i <= samples; i++) positions.add(i / samples);

  return [...positions]
    .sort((a, b) => a - b)
    .map((position) => {
      const background = sampleGradient(stops, position);
      return { position, background, ratio: contrastRatio(fgHex, background) };
    });
}

/** The worst contrast `fg` reaches anywhere along the gradient. */
export function worstGradientContrast(
  fgHex: string,
  stops: readonly GradientStop[],
  samples = 20,
): GradientContrast {
  return gradientContrast(fgHex, stops, samples).reduce((worst, point) =>
    point.ratio < worst.ratio ? point : worst,
  );
}

/**
 * Darkens (or lightens) a background until `fg` clears `target` against it,
 * preserving hue and chroma.
 *
 * This is `ensureContrast` with the roles reversed: there the text moves, here
 * the material does. The primary cap needs the second one — moving the label
 * off `--echo-text` would give the library two different text colours
 * depending on what is behind them.
 */
export function ensureBackgroundContrast(
  bgHex: string,
  fgHex: string,
  target = AA_NORMAL,
): ContrastFix {
  const initial = contrastRatio(fgHex, bgHex);
  if (initial >= target) return { color: bgHex, adjusted: false, ratio: initial };

  const bg: OKLCH = hexToOklch(bgHex);
  // Move the material away from the text: down when the text is light.
  const step = relativeLuminance(fgHex) >= EQUAL_CONTRAST_LUMINANCE ? -0.01 : 0.01;

  let best = bgHex;
  let bestRatio = initial;
  let L = bg.L;
  for (let i = 0; i < 120; i++) {
    L += step;
    if (L <= 0 || L >= 1) break;
    const candidate = oklchToHex({ L, C: bg.C, H: bg.H });
    const ratio = contrastRatio(fgHex, candidate);
    if (ratio > bestRatio) {
      bestRatio = ratio;
      best = candidate;
    }
    if (ratio >= target) break;
  }
  return { color: best, adjusted: true, ratio: bestRatio };
}
