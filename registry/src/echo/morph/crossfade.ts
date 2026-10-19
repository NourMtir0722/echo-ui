/**
 * The labels' crossfade during a morph: the old labels fade out as the new
 * ones fade in. Kept apart from morph.tsx so the timing can be checked on its
 * own (crossfade.test.ts): at no point may both be faint at once.
 */

/** The old labels leaving. */
export const LABEL_OUT = { duration: 0.2, bounce: 0 };
/** The new labels arriving. */
export const LABEL_IN = { duration: 0.2, bounce: 0 };
/**
 * How long after the old labels start to fade the new ones start to show, s.
 * None: with a lag, both were faint at the handover and a frame that landed
 * there showed no text at all. Starting together, the two curves
 * mirror each other, so one of them is always at least half there.
 */
export const LABEL_LAG = 0;
