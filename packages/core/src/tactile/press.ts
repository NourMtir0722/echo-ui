/**
 * The press of a molded cap, as numbers. useCapPhysics plays it; nothing here
 * touches the DOM, so the shape of the press can be tested on its own.
 *
 * A cap is a key switch, not a sponge:
 *   1. It resists for the first third of its travel,
 *   2. gives way at the threshold and lands on the seam (the click),
 *   3. bounces a hair off the bottom and sits there.
 *   4. Held past the click, it keeps loading: a slow last fraction of travel.
 *   5. Let go, it comes home faster than it went down, and harder the longer
 *      it was loaded, overshooting once. The second click is it topping out.
 */
import type { SpringConfig } from "./spring";
import { sound, type SoundRecipe } from "../sound/sound";

/** Depth keyframes of the way down, in fractions of travel and seconds. */
export const PRESS_STROKE = [
  { d: 0.32, duration: 0.05, ease: "power1.out" }, // the resistance
  { d: 1, duration: 0.032, ease: "power3.in" }, // gives, and lands: the click
  { d: 0.93, duration: 0.03, ease: "power1.out" }, // a hair off the bottom
  { d: 1, duration: 0.05, ease: "power1.in" }, // and back onto it
] as const;

/** Index of the stroke keyframe that ends on the seam. */
export const BOTTOM_OUT = 1;

/** Held past the click, how long the cap takes to load fully. */
export const LOAD_DURATION = 0.9;

/** How far a fully loaded cap sinks past its travel, as a fraction of travel. */
export const LOAD_DEPTH = 0.28;

/** The spring that brings the cap home, and the push it leaves with. */
export function releaseSpring(load: number): { config: SpringConfig; velocity: number } {
  const l = Math.min(1, Math.max(0, load));
  return {
    config: { duration: 0.13 + 0.05 * l, bounce: 0.3 + 0.1 * l },
    velocity: -(12 + 10 * l),
  };
}

export interface CapPose {
  /** Vertical offset, px (positive is down). */
  y: number;
  /** --press for the cap's CSS, clamped so a seam never turns inside out. */
  press: number;
  /** --lift for the cap's CSS. */
  lift: number;
}

/**
 * Where the cap sits for a hover `h` (0..1) and a depth `d` (fractions of
 * travel: 0 rest, 1 on the seam, above 1 loaded, below 0 overshooting home).
 */
export function capPose(h: number, d: number, lift: number, travel: number): CapPose {
  const sunk = Math.min(1, Math.max(0, d));
  return {
    y: -lift * h * (1 - sunk) + travel * d,
    press: Math.min(1, Math.max(-0.4, d)),
    lift: h * (1 - 0.6 * sunk),
  };
}

/** The top-out click: the plain release, brighter and louder the harder it was loaded. */
export function releaseClick(load: number): SoundRecipe {
  const l = Math.min(1, Math.max(0, load));
  if (l < 0.05) return sound.release;
  return { ...sound.release, freq: sound.release.freq + 700 * l, gain: sound.release.gain + 0.04 * l };
}
