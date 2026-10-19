/**
 * Pure motion resolution for useTactile. Kept free of the GSAP
 * runtime and React so it can be unit-tested directly: given an interaction
 * phase and a motion spec, it returns the GSAP tween vars to run — or null when
 * motion should be suppressed (prefers-reduced-motion collapse).
 */
import { motion, type MotionName, type MotionToken } from "../motion/motion";

/**
 * A bag of GSAP tween vars. Kept as a loose record here so the pure resolver
 * carries no GSAP type dependency; useTactile casts to gsap.TweenVars at the
 * one call site that touches GSAP.
 */
export type TweenVars = Record<string, unknown>;

/**
 * A phase's motion: a token name (timing from the token + the phase's default
 * gesture) OR raw GSAP vars as a fully-controlled escape hatch.
 */
export type PhaseMotion = MotionName | TweenVars;

/** Default transform gesture per conventional phase, using the token's timing. */
export const PHASE_GESTURE: Record<string, TweenVars> = {
  press: { scale: 0.96, y: 1 },
  release: { scale: 1, y: 0 },
  hover: { scale: 1.02 },
  leave: { scale: 1 },
};

const TRANSFORM_KEYS = [
  "x",
  "y",
  "scale",
  "scaleX",
  "scaleY",
  "rotation",
  "rotate",
  "skewX",
  "skewY",
];

export interface ResolvedMotion {
  /** GSAP tween vars, including `duration` (seconds) and `ease`. */
  vars: TweenVars;
}

const toSeconds = (ms: number | undefined, fallback = 0.3): number =>
  ms == null ? fallback : ms / 1000;

export function isMotionName(m: unknown): m is MotionName {
  return typeof m === "string" && m in motion;
}

function hasTransform(vars: TweenVars): boolean {
  return TRANSFORM_KEYS.some((k) => k in vars);
}

export function resolveMotion(
  phase: string,
  m: PhaseMotion | undefined,
  opts: { reduced: boolean },
): ResolvedMotion | null {
  if (m == null) return null;

  // Escape hatch: raw GSAP vars. Under reduced motion we still suppress
  // transforms (safety), but allow opacity-only tweens through.
  if (!isMotionName(m)) {
    if (opts.reduced && hasTransform(m)) return null;
    return { vars: { ...m } };
  }

  const token: MotionToken = motion[m];
  const gesture = PHASE_GESTURE[phase] ?? {};

  if (opts.reduced) {
    const reduced = token.reduced ?? "none";
    if (reduced === "none") return null; // collapse to no motion
    return {
      vars: { opacity: 1, duration: toSeconds(reduced.duration ?? token.duration), ease: "none" },
    };
  }

  return { vars: { ...gesture, duration: toSeconds(token.duration), ease: token.ease } };
}

/** Space or Enter — the keys that mirror a pointer press (keyboard parity). */
export function isActivationKey(key: string): boolean {
  return key === " " || key === "Enter" || key === "Spacebar";
}
