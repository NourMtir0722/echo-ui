/**
 * The tuner's scale, as numbers. Pure: no React, no DOM, so the tick rules
 * and the value arithmetic can be tested on their own.
 *
 * A value lives on the scale as a step index (0 at `min`); positions are
 * index × the spacing between ticks. Working in whole steps is what keeps
 * 0.1 + 0.2 from turning up as 0.30000000000000004 on a readout.
 */

/** How many decimals a step needs: 0.5 → 1, 0.25 → 2, 5 → 0. */
export function decimalsOf(step: number): number {
  const text = String(step);
  if (text.includes("e-")) return Number(text.split("e-")[1]);
  return text.includes(".") ? text.split(".")[1]!.length : 0;
}

/**
 * How many decimals the scale's values need: the step's or `min`'s, whichever
 * has more. 87.5 by 1 reads 87.5, 88.5, 89.5, never 88, 89, 90.
 */
export function decimalsFor(min: number, step: number): number {
  return Math.max(decimalsOf(step), decimalsOf(min));
}

/** The value at a step index, rounded to the scale's decimals. */
export function valueAt(index: number, min: number, step: number): number {
  return Number((min + index * step).toFixed(decimalsFor(min, step)));
}

/**
 * The index of the last step inside the range. A range that isn't a whole
 * number of steps stops short of `max` (0 to 10 by 4 ends on 8), never past
 * it. The tolerance keeps a float quotient like 204.99999999999997 whole.
 */
export function lastIndex(min: number, max: number, step: number): number {
  return Math.max(0, Math.floor((max - min) / step + 1e-9));
}

/** The nearest step index to a value, inside the scale. */
export function indexOf(value: number, min: number, max: number, step: number): number {
  return Math.min(lastIndex(min, max, step), Math.max(0, Math.round((value - min) / step)));
}

/**
 * How far apart the numbered ticks are, in value units: the smallest "nice"
 * number (1, 2, 2.5 or 5 × a power of ten) that is at least eight steps, so
 * a label lands every eight to twenty ticks whatever the step.
 */
export function niceLabelEvery(step: number): number {
  const want = step * 8;
  const power = 10 ** Math.floor(Math.log10(want));
  for (const m of [1, 2, 2.5, 5, 10]) {
    const candidate = m * power;
    if (candidate >= want - 1e-9 && isWhole(candidate / step)) return Number(candidate.toPrecision(12));
  }
  return step * 10;
}

const isWhole = (n: number) => Math.abs(n - Math.round(n)) < 1e-9;

export type TickKind = "minor" | "mid" | "major";

/**
 * What a tick is: `major` where a label goes, `mid` halfway between labels
 * (when that falls on a step), `minor` everywhere else.
 *
 * Labels sit on round values (88, 89, 90 on a radio that starts at 87.5 by
 * 0.1). When no step ever lands on a round value (87.5 by 1), they're counted
 * from `min` instead, so the scale still has numbers.
 */
export function tickKind(index: number, min: number, step: number, labelEvery: number): TickKind {
  const anchor = isWhole(min / step) ? 0 : min;
  const value = min + index * step - anchor;
  if (isWhole(value / labelEvery)) return "major";
  const half = labelEvery / 2;
  if (isWhole(half / step) && isWhole(value / half)) return "mid";
  return "minor";
}

/**
 * Where a flick lands: the release velocity carried on for a moment, the way
 * a thrown dial coasts, then onto the nearest step and inside the scale.
 */
export function projectFlick(position: number, velocity: number, spacing: number, last: number): number {
  const COAST = 0.32;
  const landing = Math.round((position + velocity * COAST) / spacing);
  return Math.min(last, Math.max(0, landing)) * spacing;
}

/**
 * How many cells the readout needs to fit every value on the scale, so its
 * width never changes as the value does. A scale that goes below zero keeps a
 * cell for the minus.
 */
export function digitsFor(min: number, max: number, step: number): number {
  const d = decimalsFor(min, step);
  const widest = Math.max(Math.abs(min), Math.abs(max)).toFixed(d);
  return widest.replace(/[^0-9]/g, "").length + (min < 0 ? 1 : 0);
}
