/**
 * What a creature is drawn from. Pure data: no React, no DOM.
 *
 * A character is one drawing in two forms. The vector form is paths: a body,
 * the whites of its eyes, its pupils. The dot form is rows of text, for the
 * dot matrix of a screen:
 *
 *   #  body       lit in the accent
 *   o  eye white  lit in paper
 *   *  pupil      dark
 *   .  nothing    dark
 *
 * Echo supplies the materials (the body is the accent's molded plastic, the
 * whites are paper, the pupils are the seam), so a character never carries a
 * colour of its own and relights with every theme.
 */

export interface CreatureCharacter {
  /** The drawing's viewBox. */
  viewBox: string;
  /** The body: one path, or several. */
  body: string | readonly string[];
  /** The whites of the eyes. They close toward `eyeLine` when it blinks. */
  eyes?: readonly string[];
  /** The pupils, over the whites. They follow the pointer. */
  pupils?: readonly string[];
  /** Small catch-lights on the pupils, as [x, y] points. */
  catchLights?: readonly (readonly [number, number])[];
  /** Where it breathes from and sways about: near the bottom of the body. */
  origin: readonly [number, number];
  /** The eyes' height: what a blink closes toward. */
  eyeLine: number;
  /** The same character in dots. Left out, it's drawn from the paths. */
  dots?: readonly string[];
}

/*
 * Echo itself. These are the canonical vectors, one drawing for the creature,
 * the logo's O and the boot reveal; the silhouette and the eyes are never
 * altered, only filled. Two knots of tracing noise at the right and top-right
 * notches, which a rim stroke drew as burrs, are each the single step they
 * amounted to; no point of the silhouette moved.
 */
export const ECHO_VIEWBOX = "102.5 4 56 56";
export const ECHO_BODY =
  "m148 24.6-0.1-0.5c2-5.1-1.8-11.7-8.1-11.8-1 0-2 0.1-2.4 0.3l-0.1 0.1c-1.2-2.6-3.9-5-8.2-5-2.7 0-5.8 1.6-7.5 5-2-0.4-6.1-1.8-10.1 3.1-1.7 2.1-2.4 5.4-1.2 8.4l-2.2 1.4c-1.1 1-2.8 3.2-2.9 5.8-0.2 4 1.9 7 5.1 8.2-1.6 3.9-0.2 9 4.9 11 1.7 0.7 3.9 0.8 6.3 0 1.2 2.7 4 5 7.6 5 3.2 0.1 6.5-1.3 8.2-5 0.7 0.2 1.8 0.5 3.4 0.5 5.2-0.1 9.2-5.4 7.2-11.1 6.7-2.5 7.6-12.3 0.1-15.4z";
export const ECHO_EYE_WHITE_L =
  "m123.6 25.8h-2.2c-2.1 0-4 1.8-4 4.1v4.2c0 2 1.4 3.8 3.6 3.8h2.6c2.5 0 3.9-1.8 3.9-3.9v-3.9c0-2.2-1.6-4.3-3.9-4.3z";
export const ECHO_EYE_WHITE_R =
  "m137.4 25.8h-2.2c-2.2 0-4.2 1.5-4.3 3.8l-0.1 4.4c0.1 2 1.4 3.9 3.7 3.9h2.9c1.8-0.1 3.7-1.4 4-3.3v-4.5c0-2.1-1.8-4.2-4-4.3z";
export const ECHO_PUPIL_L =
  "m125.5 27.7h-1.1c-1.2 0-2 0.9-2 2.2v4.8c0 1.3 0.9 2 2 2h1.1c1.3 0 2-0.6 2-2v-4.7c0-1.3-0.4-2.4-2-2.3z";
export const ECHO_PUPIL_R =
  "m139 27.7h-0.9c-1.6-0.1-2 0.9-2 2.2v4.8c0.1 1.5 0.9 2 2 2h1c1.8-0.1 2.2-1.1 2.3-2.2v-4.3c0-1.5-0.6-2.5-2.4-2.5z";
/** Vertical centre of the eyes: the blink closes toward it. */
export const ECHO_EYE_CY = 32;
export const ECHO_EYE_CATCH = [
  [123.9, 29.4],
  [137.5, 29.4],
] as const;

/**
 * Echo in dots: the silhouette sampled at 22 × 22 by how much of each dot
 * the body covers, so its eight petals keep their lobes on a screen.
 */
export const ECHO_DOTS = [
  ".........####.........",
  "........######........",
  "....#############.....",
  "...################...",
  "..#################...",
  "..##################..",
  "..##################..",
  "..##################..",
  ".######oo####oo######.",
  "######oo**##oo**#####.",
  "######oo**##oo**######",
  "######oo**##oo**######",
  "######oo**##oo**######",
  ".#####oooo##oooo#####.",
  "..##################..",
  "..##################..",
  "..##################..",
  "..#################...",
  "...################...",
  "....##############....",
  "........######........",
  ".........####.........",
] as const;

/** Echo, the creature the library is named for. */
export const echo: CreatureCharacter = {
  viewBox: ECHO_VIEWBOX,
  body: ECHO_BODY,
  eyes: [ECHO_EYE_WHITE_L, ECHO_EYE_WHITE_R],
  pupils: [ECHO_PUPIL_L, ECHO_PUPIL_R],
  catchLights: ECHO_EYE_CATCH,
  origin: [129, 38],
  eyeLine: ECHO_EYE_CY,
  dots: ECHO_DOTS,
};
