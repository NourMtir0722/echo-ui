/**
 * The colours a theme makes, and whether a colour on the page is one of them.
 *
 * Read from the page, not recomputed from a seed: the `--echo-*` values in
 * effect at an element are the theme that element is in, whatever seed,
 * scope or override put them there.
 *
 * A theme colour counts with any alpha, and so does a mix of two of them:
 * `color-mix(in oklch, var(--echo-text) 60%, var(--echo-surface))` is the
 * seed's, as `check` treats it in the source. White, black and every other
 * colour written by hand are not.
 */
import { ECHO_ROLES } from "../theme/roles";

import { deltaE, mixDistance, type Rgba } from "./colour";

/** Every custom property that holds one of the theme's colours. */
export const THEME_COLOUR_TOKENS: readonly string[] = [
  ...ECHO_ROLES.map((role) => `--echo-${role}`),
  ...[1, 2, 3, 4, 5, 6, 7].map((step) => `--echo-accent-${step}`),
];

/** About the smallest step a person sees between two colours (the static check's threshold too). */
const SAME = 0.02;

/** Close enough that the colour is plainly standing in for that token. */
const STANDING_IN = 0.08;

/** The theme's, or not; when not, the token it's plainly standing in for, if there is one. */
export type PaletteMatch = { ours: true } | { ours: false; nearest?: string };

export class Palette {
  private readonly seen = new Map<string, PaletteMatch>();

  constructor(
    /** The theme's colours, by token. */
    readonly colours: ReadonlyMap<string, Rgba>,
    /** Colours the team allows on top (a logo's). */
    readonly extra: readonly Rgba[] = [],
  ) {}

  match(c: Rgba): PaletteMatch {
    if (c.a === 0) return { ours: true };
    const key = `${c.r},${c.g},${c.b}`;
    const known = this.seen.get(key);
    if (known) return known;
    const result = this.compute(c);
    this.seen.set(key, result);
    return result;
  }

  private compute(c: Rgba): PaletteMatch {
    const theme = [...this.colours.values()];
    if (theme.some((t) => deltaE(c, t) < SAME) || this.extra.some((t) => deltaE(c, t) < SAME)) return { ours: true };
    for (let i = 0; i < theme.length; i++) {
      for (let j = i + 1; j < theme.length; j++) {
        if (mixDistance(c, theme[i]!, theme[j]!) < SAME) return { ours: true };
      }
    }
    let nearest: string | undefined;
    let best = STANDING_IN;
    for (const [token, t] of this.colours) {
      const d = deltaE(c, t);
      if (d < best) [nearest, best] = [token, d];
    }
    return { ours: false, nearest };
  }
}
