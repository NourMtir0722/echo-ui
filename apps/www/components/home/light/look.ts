/**
 * The page's light: one look
 * for every field, the hero's arch, the road's rising light, the foot's, and
 * the light Echo carries.
 */

/** Every field's gradient: shades of the seed (shades.ts) and how the light moves in them. */
export const GRADIENT = {
  /** How far the shades turn from the seed, deep to glow, degrees. */
  hueDrift: 18,
  /** How wide the waves are: bigger is smoother. */
  size: 2.4,
  /** How much the waves bend the shades. */
  bend: 0.45,
  /** A fine, still grain. */
  grain: 0.05,
  /** How far the waves drift for a window's height of scroll. */
  drift: 0.5,
  /** How far the light climbs the sides of a rising field. */
  bow: 0.7,
} as const;

/**
 * The hero: an arch of light rising behind the device, wide and low. It rises into place as the page
 * opens (landing.css), and then follows the scroll a little, as the road's does: `follow` px down
 * against the page for each px scrolled, back up as you return to the top.
 */
export const HERO = { amount: 1, height: 0.41, roundness: 1.98, edge: 0.4, follow: 0.3 } as const;

/**
 * The road: light rising from below the title, round the first card. It follows the scroll a little:
 * `follow` px against the page for each px scrolled (down as you go down, back up as you go up), in its
 * place when the first card is framed, and never further from it than `reach` of a window.
 */
export const ROAD = { amount: 1, glow: 0.5, fade: [0.3, 0.12] as [number, number], follow: 0.3, reach: 0.3 } as const;

/**
 * The foot of the page: light rising high round its panel. It follows the scroll a little, as the road's
 * does: higher while the page is still coming, drifting down into its place as the page reaches its end.
 */
export const FOOT = { amount: 1, glow: 0.72, fade: [0.18, 0] as [number, number], follow: 0.3, reach: 0.3 } as const;

/** The light Echo carries: screened over the page, held down wherever text near it would stop reading. */
export const CARRIED = { mode: "Over", amount: 0.37, size: 590 } as const;
