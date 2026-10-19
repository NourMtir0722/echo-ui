/**
 * Echo's skin on the homepage: the seed alone, glazed (a skin that ran
 * through the family's hues read as childish). Light where the key light falls and deep where the
 * body turns away, under a glossy coat, with its rim in the seed's own light;
 * no speckles. The eyes stay printed, as on every Echo. The heap at the foot
 * of the page keeps the plain marble (palette.ts). Every colour comes from the
 * page's family (family.ts), so the skin relights with the seed like
 * everything else.
 */

/** The page's family, as the stage read it. */
export interface FamilyColours {
  seed: string;
  seedLight: string;
  seedDeep: string;
  next: string;
  prev: string;
  spark: string;
}

export interface Skin {
  a: string;
  b: string;
  c: string;
  rim: string;
  rimAmt: number;
  glow: number;
  speck: number;
  /** The coat: smoother is glossier. */
  roughness: number;
  coatRoughness: number;
  iridescence: number;
}

/** Glaze: one colour, like the drawing on the device's screen. */
export function glaze(f: FamilyColours, { rim = 0.7, glow = 0.12 }: { rim?: number; glow?: number } = {}): Skin {
  return { a: f.seedLight, b: f.seed, c: f.seedDeep, rim: f.seedLight, rimAmt: rim, glow, speck: 0, roughness: 0.34, coatRoughness: 0.05, iridescence: 0.08 };
}
