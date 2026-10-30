/**
 * The landing's colour family: four vivid colours made from the seed, as
 * `--family-*` CSS variables.
 *
 * The components stay on the seed alone. The family is for the page around
 * them: the puzzle pieces, the shader grounds, the gradients through the big
 * type. It's the seed's own hue, its two neighbours on the wheel (±32°) and
 * one contrast (+135°), the spark: close enough to read as one family, not a
 * rainbow. Echo's purple gives
 * violet, magenta, blue and amber.
 *
 * "Vivid" means each hue sits near the most saturated colour sRGB can show
 * for it (its cusp), pulled a third of the way toward a middle lightness so
 * no colour turns neon or navy. That's why the family isn't one lightness:
 * a lime at a violet's lightness is olive, and a blue at a lime's is washed
 * out. Each colour also carries a light and a deep stop for gradients and
 * side walls, and the text colour that reads on it (`-on`), which always
 * meets WCAG AA. If neither ink nor white would, the colour moves until one
 * does, never the text.
 *
 * A near-grey seed has no dependable hue, so its family is purple's.
 */
import { AA_NORMAL, clampToGamut, contrastRatio, defaultSeed, ensureBackgroundContrast, hexToOklch, inGamut, oklchToHex } from "echo-ui-core/theme";

export const FAMILY_ROLES = ["seed", "next", "prev", "spark"] as const;
export type FamilyRole = (typeof FAMILY_ROLES)[number];

/** How far round the wheel each role sits from the seed, in degrees. */
const TURN: Record<FamilyRole, number> = { seed: 0, next: 32, prev: -32, spark: 135 };

/** The two text colours the family chooses between: the chassis ink and white. */
export const FAMILY_INK = "#15121c";
export const FAMILY_WHITE = "#ffffff";

export interface FamilyColour {
  hex: string;
  /** A lighter stop, for a gradient's highlight. */
  light: string;
  /** A deeper stop, for a gradient's shadow and a piece's side wall. */
  deep: string;
  /** The text colour that reads on `hex` at AA. */
  on: string;
}

export type Family = Record<FamilyRole, FamilyColour>;

/** Below this chroma a seed reads as grey, and its hue is noise. */
const GREY = 0.04;

const wrap = (h: number) => ((h % 360) + 360) % 360;

/** The most chroma sRGB can show at this lightness and hue. */
function maxChroma(L: number, H: number): number {
  let lo = 0;
  let hi = 0.4;
  for (let i = 0; i < 20; i++) {
    const mid = (lo + hi) / 2;
    if (inGamut({ L, C: mid, H })) lo = mid;
    else hi = mid;
  }
  return lo;
}

/** The lightness at which a hue is most saturated. Coarse, then fine. */
function cuspLightness(H: number): number {
  let best = { L: 0.5, C: -1 };
  const scan = (from: number, to: number, step: number) => {
    for (let L = from; L <= to; L += step) {
      const C = maxChroma(L, H);
      if (C > best.C) best = { L, C };
    }
  };
  scan(0.3, 0.97, 0.02);
  scan(Math.max(0.3, best.L - 0.02), Math.min(0.97, best.L + 0.02), 0.004);
  return best.L;
}

const at = (L: number, H: number, share: number) => oklchToHex(clampToGamut({ L, C: maxChroma(L, H) * share, H }));

function colour(H: number): FamilyColour {
  const cusp = cuspLightness(H);
  const L = cusp + (0.7 - cusp) * 0.35;
  let hex = at(L, H, 0.92);
  const light = at(L + (0.95 - L) * 0.5, H, 0.8);
  const deep = at(L * 0.72, H, 0.9);

  const ink = contrastRatio(hex, FAMILY_INK);
  const white = contrastRatio(hex, FAMILY_WHITE);
  const on = ink >= white ? FAMILY_INK : FAMILY_WHITE;
  if (Math.max(ink, white) < AA_NORMAL) hex = ensureBackgroundContrast(hex, on, AA_NORMAL).color;
  return { hex, light, deep, on };
}

export function seedFamily(accent: string = defaultSeed.accent): Family {
  const seed = hexToOklch(accent);
  const hue = seed.C < GREY || Number.isNaN(seed.H) ? hexToOklch(defaultSeed.accent).H : seed.H;
  return Object.fromEntries(FAMILY_ROLES.map((role) => [role, colour(wrap(hue + TURN[role]))])) as Family;
}

/**
 * A drawn look in one ink (Ink Instrument) has no colours to make a family
 * from, and a purple one would be the only colour on the page. Its family is
 * the ink and three greys between the ink and the paper, each with the text
 * that reads on it.
 */
export function inkFamily(ink: string, paper: string): Family {
  const tone = (share: number): FamilyColour => {
    const hex = oklchToHex(clampToGamut({ L: hexToOklch(ink).L + (hexToOklch(paper).L - hexToOklch(ink).L) * share, C: 0, H: 0 }));
    const on = contrastRatio(hex, paper) >= contrastRatio(hex, ink) ? paper : ink;
    const light = oklchToHex(clampToGamut({ L: Math.min(0.97, hexToOklch(hex).L + 0.2), C: 0, H: 0 }));
    const deep = oklchToHex(clampToGamut({ L: Math.max(0.05, hexToOklch(hex).L - 0.15), C: 0, H: 0 }));
    return { hex, light, deep, on };
  };
  return { seed: tone(0), next: tone(0.28), prev: tone(0.45), spark: tone(0.6) };
}

/** The `--family-*` declarations for a seed, one per line; for a drawn look in one ink, its ink family. */
export function renderFamilyVars(accent?: string, ink?: { ink: string; paper: string }): string[] {
  const family = ink ? inkFamily(ink.ink, ink.paper) : seedFamily(accent);
  return FAMILY_ROLES.flatMap((role) => {
    const c = family[role];
    return [
      `  --family-${role}: ${c.hex};`,
      `  --family-${role}-light: ${c.light};`,
      `  --family-${role}-deep: ${c.deep};`,
      `  --family-${role}-on: ${c.on};`,
    ];
  });
}
