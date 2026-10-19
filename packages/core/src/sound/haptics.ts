/**
 * Echo haptics: what a phone does in your hand when something happens.
 *
 * Used sparingly, the way a phone's own interface uses them: a tick when a
 * choice changes, and a pattern for a completion, a warning or an error. A
 * plain press doesn't buzz. They ride on the sound tokens, so a component
 * that plays `select` or `error` gets its haptic with no code of its own
 * (see `HAPTIC_FOR_SOUND`), and they don't depend on sound being on: sound
 * starts muted, haptics don't.
 *
 * Where it works: browsers with the Vibration API, which today means Android.
 * iOS Safari has none, so an iPhone gets nothing. A device's own vibration
 * setting still wins, and nothing buzzes before the person has touched the
 * page (browsers refuse it, and say so in the console) or on a device with no
 * touch screen.
 *
 * `SoundProvider` does the buzzing: `play` buzzes for the sounds that carry a
 * haptic, and `buzz` for a haptic on its own. Its `haptics` prop turns them
 * off.
 *
 * Pure data plus one guarded call: SSR-safe.
 */
import type { SoundName } from "./sound";

/** Vibration patterns in milliseconds: on, off, on… */
export const haptic = {
  /** A choice changed: a checkbox, a radio, a tab, a segment. */
  tick: [8],
  /** Something finished well. */
  success: [12, 70, 18],
  /** About to do something that can't be undone. */
  warn: [24, 90, 24],
  /** Something went wrong. */
  error: [30, 60, 30, 60, 30],
} as const satisfies Record<string, readonly number[]>;

export type HapticName = keyof typeof haptic;

export const HAPTIC_NAMES = Object.keys(haptic) as HapticName[];

/** The sounds that carry a haptic. The rest (a tap, a press, a transition) don't. */
export const HAPTIC_FOR_SOUND: Partial<Record<SoundName, HapticName>> = {
  select: "tick",
  notify: "success",
  celebrate: "success",
  caution: "warn",
  error: "error",
};

/**
 * Buzz, if this device can and the person has touched the page. Returns
 * whether it asked the device to; never throws.
 */
export function vibrate(name: HapticName): boolean {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return false;
  // Only a device you hold: a laptop's browser has the API and no motor.
  if (typeof matchMedia !== "function" || !matchMedia("(pointer: coarse)").matches) return false;
  // Browsers refuse a vibration before the first touch, and warn about it.
  if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return false;
  try {
    return navigator.vibrate([...haptic[name]]);
  } catch {
    return false;
  }
}
