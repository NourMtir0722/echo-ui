/**
 * The light Echo carries, as the rest of the page sees it: where it is, how
 * strong it's drawn right now (after it's been held down for the text near
 * it), and how it's laid on. LightPool.tsx writes it every frame; a shader
 * field reads it, so a field and the light never add up to more than the text
 * on them can take.
 */
import type { Rgb } from "./contrast";

export interface PoolState {
  /** Centre, viewport px. */
  x: number;
  y: number;
  /** Radius, px. */
  r: number;
  /** Strength at the centre, after the text near it has had its say. */
  amount: number;
  /** "behind": on the ground, under the page's objects. "over": screened over everything. */
  mode: "off" | "behind" | "over";
  colour: Rgb;
  /** Bumped on every change, so a reader knows to draw again. */
  version: number;
}

export const pool: PoolState = { x: -1e4, y: -1e4, r: 0, amount: 0, mode: "off", colour: [0, 0, 0], version: 0 };

/**
 * How much of the light reaches a point `t` radii from the centre: the
 * radial gradient LightPool draws (full at the centre, 45% at 0.42 of the
 * radius, nothing at the edge).
 */
export function falloff(t: number): number {
  if (t < 0.42) return 1 - (0.55 * t) / 0.42;
  if (t < 1) return 0.45 * (1 - (t - 0.42) / 0.58);
  return 0;
}
