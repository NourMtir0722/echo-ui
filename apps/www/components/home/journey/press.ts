/**
 * Where Echo is while it plays a demo card's presses, for a moment of the
 * demo.
 *
 * Each press lands at its beat (seconds into the demo, the card's own: Make's
 * questions come quicker than its Send, say). Echo hops from the button it
 * pressed last to the next, landing on it on the beat, holds the cap down for
 * a moment, and stays on it a while what it opened is read; then it sets off
 * for the next. Before the first press it stands on the first button, and
 * gives a small hop onto it.
 *
 * Pure: the targets' boxes, the beats and a moment in, a pose out. The card
 * measures and moves the marker (DemoCard.tsx).
 */

/** A button's box, relative to the stage it's in, px. */
export interface Target {
  left: number;
  top: number;
  width: number;
  height: number;
  /** `press`: Echo lands on it. `point`: Echo stands beside it, leaning toward it, and never touches it. */
  mode: "press" | "point";
  /** Where along its top edge Echo lands, 0 (left) to 1 (right). */
  at: number;
  /** Which side Echo points from: its left (the default) or, where the room is there, its right. */
  side?: "left" | "right";
}

export interface PerchPose {
  /** Echo's feet: the middle of the bottom of the perch, px in the stage. */
  x: number;
  y: number;
  /** Radians, into the direction of travel (the stage reads `data-guide-lean`). */
  lean: number;
  /** The press that's held down right now, or null. */
  held: number | null;
  /** On its way from one button to the next (what the last press opened can close). */
  travelling: boolean;
  /** How many presses have landed: what the card shows. */
  step: number;
}

/** Presses one PER_PRESS apart, the first one PER_PRESS in: the beats of a card that doesn't set its own. */
export const evenBeats = (n: number, every: number) => Array.from({ length: n }, (_, k) => (k + 1) * every);

/**
 * How long a cap stays down, how long Echo stays on a button it pressed before
 * it sets off for the next, and how long the hop onto the first button takes,
 * as shares of the time to the next beat (or, for the hop, to the first), and
 * never longer than these seconds.
 */
const HOLD = 0.22;
const HOLD_MAX = 0.42;
const DWELL = 0.62;
const DWELL_MAX = 1.2;
const FIRST_HOP = 0.4;
const FIRST_HOP_MAX = 0.75;
/** Echo sinks with the cap while it's held, px: a HardwareButton's travel, near enough. */
const SINK = 4;
/** How far beside a button Echo stands when it only points at it, px. */
const BESIDE = 10;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const ease = (t: number) => 0.5 - Math.cos(Math.PI * t) / 2;

/** Where Echo's feet go on a target, and how wide Echo is there. */
function footing(t: Target, size: number): { x: number; y: number } {
  // Beside it, on its left (or its right, if asked); where there's no room for that (a phone), on its top-left corner instead.
  if (t.mode === "point") {
    if (t.side === "right") return { x: t.left + t.width + BESIDE + size / 2, y: t.top + t.height };
    const x = t.left - BESIDE - size / 2;
    return x - size / 2 >= 0 ? { x, y: t.top + t.height } : { x: t.left + size / 2 + 6, y: t.top };
  }
  return { x: t.left + t.width * t.at, y: t.top };
}

/** How many presses have landed by `t`, seconds. */
export function stepAt(t: number, beats: readonly number[]): number {
  let s = 0;
  beats.forEach((b, k) => {
    if (t >= b) s = k + 1;
  });
  return s;
}

/**
 * The pose at `t` seconds into a demo whose presses land on `beats` (seconds,
 * one per target, in press order) and which runs `length` seconds in all.
 * `size` is Echo's width on the marker.
 */
export function poseAt(t: number, targets: readonly Target[], size: number, beats: readonly number[], length: number): PerchPose {
  const n = targets.length;
  const step = stepAt(t, beats);
  if (n === 0) return { x: 0, y: 0, lean: 0, held: null, travelling: false, step };
  const beat = (k: number) => beats[k] ?? length;
  /** The time from press k to the next (or to the end). */
  const after = (k: number) => Math.max(0, beat(k + 1) - beat(k));
  const hold = (k: number) => Math.min(HOLD_MAX, HOLD * after(k));
  const dwell = (k: number) => Math.min(DWELL_MAX, DWELL * after(k));

  // Held: from the press until the cap comes back up.
  let held: number | null = null;
  for (let k = 0; k < n; k++) {
    if (t >= beat(k) && t < beat(k) + hold(k) && targets[k]!.mode === "press") held = k;
  }

  // Which hop we're on: into press k, from the one before (or on the spot, for the first).
  let k = 0;
  while (k < n - 1 && t >= beat(k) + dwell(k)) k++;
  const to = footing(targets[k]!, size);
  const land = beat(k);
  const from = k === 0 ? to : footing(targets[k - 1]!, size);
  const start = k === 0 ? land - Math.min(FIRST_HOP_MAX, FIRST_HOP * land) : beat(k - 1) + dwell(k - 1);
  const travelling = k > 0 && t >= start && t < land;

  let x = to.x;
  let y = to.y;
  let lean = 0;
  if (t < land) {
    const u = clamp((t - start) / Math.max(1e-6, land - start), 0, 1);
    const q = ease(u);
    const dist = Math.hypot(to.x - from.x, to.y - from.y);
    const arc = Math.sin(Math.PI * q);
    x = mix(from.x, to.x, q);
    y = mix(from.y, to.y, q) - Math.min(150, 26 + dist * 0.32) * arc;
    lean = clamp((to.x - from.x) / 700, -0.32, 0.32) * arc;
  } else if (targets[k]!.mode === "point") {
    // Leaning in toward what it's showing you (positive leans right, as in journey.ts).
    lean = targets[k]!.side === "right" ? -0.12 : 0.12;
  }
  // Never up out of the stage: under the site's bar, Echo would be cut off.
  y = Math.max(y, size + 4);
  if (held !== null && held === k) y += SINK;
  return { x, y, lean, held, travelling, step };
}
