/**
 * Style Fit's arithmetic: a product's profile against every style's
 * fingerprint, on the seven axes Design Eye places a style on.
 *
 * The product is a target with a tolerance on each axis: how far a style can
 * drift from it before it costs anything. A tolerance of 0 locks the axis (a
 * medical records tool can't be playful), and a style that misses a locked
 * axis is out, whatever the rest says. The rest is how far past its tolerance
 * a style lands, summed: that orders the shortlist. It orders it, it doesn't
 * decide it. What a style serves and where it strains, which only its
 * foundation says, decides, and that's the agent's reading, not this.
 *
 * Plain arithmetic, in one place, so the CLI and the MCP give the same order.
 */
import { AXES, type Axis, type Fingerprint } from "./style-schema";

export type Tolerance = Record<Axis, number>;

/** The letter each axis goes by in a fingerprint: `W4 V2 D1 F2 E3 C3 O3`. */
export const AXIS_LETTERS: Record<Axis, string> = {
  warmth: "W",
  volume: "V",
  density: "D",
  formality: "F",
  era: "E",
  craft: "C",
  ornament: "O",
};

const AXIS_NAMES = Object.keys(AXES) as Axis[];

/** A fingerprint as the library's index writes it. */
export function fingerprintText(f: Fingerprint): string {
  return AXIS_NAMES.map((axis) => `${AXIS_LETTERS[axis]}${f[axis]}`).join(" ");
}

/**
 * `W4 V2 D1 F2 E3 C3 O3`, in any order, every axis once, each `min` to `max`.
 * Throws with what's wrong, in words.
 */
function readAxes(spec: string, min: number, max: number, what: string): Record<Axis, number> {
  const out: Partial<Record<Axis, number>> = {};
  const tokens = spec.trim().split(/[\s,]+/).filter(Boolean);
  for (const token of tokens) {
    const m = /^([A-Za-z])(\d)$/.exec(token);
    const axis = m ? AXIS_NAMES.find((a) => AXIS_LETTERS[a] === m[1]!.toUpperCase()) : undefined;
    if (!m || !axis) throw new Error(`"${token}" isn't an axis. A ${what} is seven letters with a number each: W4 V2 D1 F2 E3 C3 O3 (Warmth, Volume, Density, Formality, Era, Craft, Ornament).`);
    const n = Number(m[2]);
    if (n < min || n > max) throw new Error(`${token}: a ${what} on ${axis} is ${min} to ${max}.`);
    if (out[axis] !== undefined) throw new Error(`${axis} is given twice in "${spec}".`);
    out[axis] = n;
  }
  const missing = AXIS_NAMES.filter((axis) => out[axis] === undefined);
  if (missing.length) throw new Error(`The ${what} leaves out ${missing.join(", ")}: give all seven, as W4 V2 D1 F2 E3 C3 O3.`);
  return out as Record<Axis, number>;
}

/** The product's target, 1 to 5 on each axis. */
export const parseProfile = (spec: string): Fingerprint => readAxes(spec, 1, 5, "profile");

/** How far each axis may drift, 0 (locked) to 4. Without one, every axis may drift a point. */
export function parseTolerance(spec: string | undefined): Tolerance {
  if (spec === undefined) return Object.fromEntries(AXIS_NAMES.map((axis) => [axis, 1])) as Tolerance;
  return readAxes(spec, 0, 4, "tolerance");
}

export interface FitCandidate {
  name: string;
  title: string;
  essence: string;
  fingerprint: Fingerprint;
  /** Echo's library, or the builder's own. */
  from: "echo" | "yours";
  /** False for a style that's only its foundation document: it needs its Echo part (a style.json) before it can be worn. */
  ready?: boolean;
}

export interface FitResult extends FitCandidate {
  /** The style's position minus the target, on each axis. */
  distance: Record<Axis, number>;
  /** How far past its tolerance the style lands, summed over the axes: 0 is inside everywhere. */
  over: number;
  /** Every axis's distance, summed: the tie-break. */
  total: number;
  /** The locked axes it misses. Any at all puts it out. */
  locked: Axis[];
}

/** Every candidate, measured and ordered: in before out, then least over tolerance, then nearest. */
export function fitStyles(target: Fingerprint, tolerance: Tolerance, candidates: readonly FitCandidate[]): FitResult[] {
  return candidates
    .map((candidate) => {
      const distance = Object.fromEntries(AXIS_NAMES.map((axis) => [axis, candidate.fingerprint[axis] - target[axis]])) as Record<Axis, number>;
      const over = AXIS_NAMES.reduce((sum, axis) => sum + Math.max(0, Math.abs(distance[axis]) - tolerance[axis]), 0);
      const total = AXIS_NAMES.reduce((sum, axis) => sum + Math.abs(distance[axis]), 0);
      const locked = AXIS_NAMES.filter((axis) => tolerance[axis] === 0 && distance[axis] !== 0);
      return { ...candidate, distance, over, total, locked };
    })
    .sort(
      (a, b) =>
        Number(a.locked.length > 0) - Number(b.locked.length > 0) ||
        a.over - b.over ||
        a.total - b.total ||
        a.name.localeCompare(b.name),
    );
}
