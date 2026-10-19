/**
 * The bloom — Echo growing from a dot into its own mark.
 *
 * The mark is measured, not redrawn: its outline, sampled as a radius per
 * angle around its centroid, turns out to be eight circles (each petal fits a
 * circle to within 0.04 units) round a core. So the bloom is built from those
 * circles: a seed swells from nothing, and each petal buds out of its rim — a
 * small circle sliding out and growing into the petal's fitted circle. The
 * circles are joined with a smooth maximum, which gives a bud a soft neck
 * where it leaves the rim instead of a cut corner (the same crisp-outline
 * rule as the Morph work: no blur filter).
 *
 * Every frame is round and petal-shaped, and the shape only ever grows. As a
 * petal settles, the few hundredths of a unit between the circles and the
 * real drawing blend in, so the last frame IS the mark's outline; the caller
 * then swaps in `BODY` itself and nothing moves.
 *
 * Four variants ship (BLOOMS) and differ only in their timing: Unfurl, the
 * default, then Nested, Divide and One breath.
 *
 * Motion is springs (./springs), solved in closed form: the boot is a script,
 * not a hand, and a closed form can be scrubbed, replayed and tested at any
 * instant.
 *
 * Angles are measured from straight up, clockwise, like a clock. Pure: no
 * DOM, no window.
 */
import { flatten } from "./outline";
import { BODY } from "./paths";
import { springAt, springSettle, type SpringCfg } from "./springs";

const TAU = Math.PI * 2;
/** Points round the outline per frame. */
export const SAMPLES = 480;

/* --- the mark, measured -------------------------------------------------- */

export interface Petal {
  /** Direction of the fitted circle's centre. */
  angle: number;
  /** Distance of that centre from the mark's centre, viewBox units. */
  d: number;
  /** The circle's radius. */
  r: number;
}

export interface Mark {
  cx: number;
  cy: number;
  /** The real outline's radius at each of SAMPLES angles. */
  radii: Float64Array;
  /** Eight petals, clockwise from the top. */
  petals: Petal[];
  /** The narrowest notch: the core can grow to just under it. */
  notch: number;
}

const angleOf = (dx: number, dy: number) => {
  const a = Math.atan2(dx, -dy);
  return a < 0 ? a + TAU : a;
};

/** Kasa least-squares circle through points given relative to the centre. */
function fitCircle(pts: [number, number][]): { x: number; y: number; r: number } {
  let sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0, sxz = 0, syz = 0, sz = 0;
  for (const [x, y] of pts) {
    const z = x * x + y * y;
    sx += x; sy += y; sxx += x * x; syy += y * y; sxy += x * y; sxz += x * z; syz += y * z; sz += z;
  }
  const m = [
    [sxx, sxy, sx, -sxz],
    [sxy, syy, sy, -syz],
    [sx, sy, pts.length, -sz],
  ];
  for (let c = 0; c < 3; c++) {
    let p = c;
    for (let r = c + 1; r < 3; r++) if (Math.abs(m[r]![c]!) > Math.abs(m[p]![c]!)) p = r;
    [m[c], m[p]] = [m[p]!, m[c]!];
    for (let r = 0; r < 3; r++) {
      if (r === c) continue;
      const f = m[r]![c]! / m[c]![c]!;
      for (let k = c; k < 4; k++) m[r]![k]! -= f * m[c]![k]!;
    }
  }
  const x = -m[0]![3]! / m[0]![0]! / 2;
  const y = -m[1]![3]! / m[1]![1]! / 2;
  const f = m[2]![3]! / m[2]![2]!;
  return { x, y, r: Math.sqrt(x * x + y * y - f) };
}

function measure(): Mark {
  const poly = flatten(BODY, 48)[0]!;
  // Area centroid.
  let a2 = 0, cx = 0, cy = 0;
  for (let k = 0; k < poly.length; k++) {
    const [x1, y1] = poly[k]!;
    const [x2, y2] = poly[(k + 1) % poly.length]!;
    const c = x1 * y2 - x2 * y1;
    a2 += c; cx += (x1 + x2) * c; cy += (y1 + y2) * c;
  }
  cx /= 3 * a2;
  cy /= 3 * a2;

  // The outline's farthest crossing along each ray from the centre.
  const radii = new Float64Array(SAMPLES);
  for (let i = 0; i < SAMPLES; i++) {
    const th = (i / SAMPLES) * TAU;
    const ux = Math.sin(th);
    const uy = -Math.cos(th);
    let best = 0;
    for (let k = 0; k < poly.length; k++) {
      const [ax, ay] = poly[k]!;
      const [bx, by] = poly[(k + 1) % poly.length]!;
      const ex = bx - ax, ey = by - ay, wx = ax - cx, wy = ay - cy;
      const den = ux * ey - uy * ex;
      if (Math.abs(den) < 1e-12) continue;
      const t = (wx * ey - wy * ex) / den;
      const s = (wx * uy - wy * ux) / den;
      if (s >= 0 && s <= 1 && t > best) best = t;
    }
    radii[i] = best;
  }

  // Lobes are the outline's peaks (the highest point within ±22.5°), notches
  // the lowest point between two lobes.
  const w = SAMPLES / 16;
  const peaks: number[] = [];
  for (let i = 0; i < SAMPLES; i++) {
    let top = true;
    for (let j = -w; j <= w && top; j++) if (radii[(i + j + SAMPLES) % SAMPLES]! > radii[i]!) top = false;
    if (top && peaks.at(-1) !== i - 1) peaks.push(i);
  }
  const notchAfter = peaks.map((a, l) => {
    const b = peaks[(l + 1) % peaks.length]! + (l === peaks.length - 1 ? SAMPLES : 0);
    let at = a;
    for (let i = a; i <= b; i++) if (radii[i % SAMPLES]! < radii[at % SAMPLES]!) at = i;
    return at % SAMPLES;
  });

  // Fit each petal's circle to the middle of its arc, away from the notches.
  const petals = peaks.map((_, l) => {
    const n0 = notchAfter[(l + peaks.length - 1) % peaks.length]!;
    const span = (notchAfter[l]! - n0 + SAMPLES) % SAMPLES;
    const pts: [number, number][] = [];
    for (const [x, y] of poly) {
      let f = (angleOf(x - cx, y - cy) / TAU) * SAMPLES;
      if (f < n0) f += SAMPLES;
      if (f >= n0 + span * 0.18 && f <= n0 + span * 0.82) pts.push([x - cx, y - cy]);
    }
    const c = fitCircle(pts);
    return { angle: angleOf(c.x, c.y), d: Math.hypot(c.x, c.y), r: c.r };
  });

  return { cx, cy, radii, petals, notch: Math.min(...notchAfter.map((i) => radii[i]!)) };
}

let measured: Mark | undefined;
/** The mark, measured once on first use. */
export function mark(): Mark {
  return (measured ??= measure());
}

/* --- choreographies ------------------------------------------------------ */

export interface PetalCue {
  /** When the petal starts to bud, seconds. */
  at: number;
  spring: SpringCfg;
  /** Start at another petal's angle (index) and turn to its own — a division. */
  from?: number;
  /** When it turns, and on what spring. */
  turnAt?: number;
  turn?: SpringCfg;
}

/** The four ways the flower can bloom. Unfurl is the default. */
export type BloomId = "unfurl" | "nested" | "divide" | "breath";

export interface Bloom {
  id: BloomId;
  name: string;
  note: string;
  /** The seed: the whole flower's scale, from nothing to full size. */
  seed: { at: number; spring: SpringCfg };
  /** The eight petals, clockwise from the top. */
  petals: PetalCue[];
  /** A bud's size when it leaves the rim, as a share of its final radius. */
  bud: number;
  /** How far, in viewBox units, the necks between circles reach. */
  neck: number;
}

const cues = (f: (i: number) => PetalCue): PetalCue[] => Array.from({ length: 8 }, (_, i) => f(i));

/**
 * Four variants, the default first. They differ only in when each petal
 * leaves and on what spring; every one starts from nothing and ends on the
 * mark's own eight petals.
 */
export const BLOOMS: readonly Bloom[] = [
  {
    id: "unfurl",
    name: "Unfurl",
    note: "The petals bud one after another round the ring, clockwise from the top.",
    seed: { at: 0, spring: { duration: 0.5, bounce: 0.1 } },
    petals: cues((i) => ({ at: 0.22 + i * 0.065, spring: { duration: 0.45, bounce: 0.2 } })),
    bud: 0.45,
    neck: 2.2,
  },
  {
    id: "nested",
    name: "Nested",
    note: "Four petals bud, then four more between them, so every stage sits inside the mark.",
    seed: { at: 0, spring: { duration: 0.5, bounce: 0.1 } },
    petals: cues((i) => ({ at: i % 2 === 0 ? 0.26 : 0.5, spring: { duration: 0.5, bounce: 0.15 } })),
    bud: 0.5,
    neck: 2.2,
  },
  {
    id: "divide",
    name: "Divide",
    note: "Four petals bud, the side ones divide in two and slide apart, and the last two bud between them.",
    seed: { at: 0, spring: { duration: 0.5, bounce: 0.1 } },
    petals: cues((i) => {
      const spring = { duration: 0.5, bounce: 0.15 };
      if (i === 0 || i === 4) return { at: 0.26, spring };
      if (i === 2 || i === 6) return { at: 0.74, spring };
      // 1 and 3 start as one petal at 2's place; 5 and 7 at 6's.
      return { at: 0.26, spring, from: i < 4 ? 2 : 6, turnAt: 0.5, turn: { duration: 0.55, bounce: 0.12 } };
    }),
    bud: 0.55,
    neck: 2.6,
  },
  {
    id: "breath",
    name: "One breath",
    note: "The seed draws in past its size, and all eight petals bloom together as it settles.",
    seed: { at: 0, spring: { duration: 0.75, bounce: 0.3 } },
    petals: cues(() => ({ at: 0.3, spring: { duration: 0.6, bounce: 0.1 } })),
    bud: 0.6,
    neck: 2.4,
  },
];

export const DEFAULT_BLOOM = BLOOMS[0]!;

export function getBloom(id: BloomId | undefined): Bloom {
  return BLOOMS.find((b) => b.id === id) ?? DEFAULT_BLOOM;
}

const ends = new WeakMap<Bloom, number>();

/** When every spring in the bloom has settled, seconds (worked out once per bloom: it's asked every frame). */
export function bloomEnd(b: Bloom): number {
  const known = ends.get(b);
  if (known !== undefined) return known;
  let end = b.seed.at + springSettle(b.seed.spring);
  for (const p of b.petals) {
    end = Math.max(end, p.at + springSettle(p.spring));
    if (p.turn) end = Math.max(end, (p.turnAt ?? p.at) + springSettle(p.turn));
  }
  ends.set(b, end);
  return end;
}

/** When the last petal has mostly arrived: where the eyes can start to open. */
export function bloomNearlyDone(b: Bloom): number {
  return Math.max(...b.petals.map((p) => p.at + p.spring.duration * 0.6));
}

/* --- drawing ------------------------------------------------------------- */

/** Polynomial smooth maximum: `k` is how far the rounding reaches. */
function smax(a: number, b: number, k: number): number {
  if (k <= 0) return Math.max(a, b);
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.max(a, b) + h * h * k * 0.25;
}

/**
 * The core and the petals, joined. Only the core–petal join is smooth — a
 * bud leaves the rim with a soft neck. Petals meet each other in a crisp notch,
 * as they do on the mark; smoothing them too would swell two petals that
 * share a place (a division, before it parts) past the size of one.
 */
function union(core: number, petal: number, neck: number): number {
  return petal > 0 ? smax(core, petal, neck) : core;
}

/** Farthest crossing of the ray at `th` with a circle centred (d, φ) of radius r, or -Infinity. */
function reach(th: number, d: number, phi: number, r: number): number {
  const proj = d * Math.cos(th - phi);
  const perp2 = d * d - proj * proj;
  if (perp2 > r * r) return -Infinity;
  return proj + Math.sqrt(r * r - perp2);
}

interface Pose {
  angle: number;
  d: number;
  r: number;
  /** How far the petal has come, 0..1, clamped: weights the final correction. */
  settled: number;
}

export interface BloomFrame {
  /** Outline radius per sample, in viewBox units, before the seed's scale. */
  radii: Float64Array;
  /** The seed's scale: 0 is nothing, 1 is full size (overshoots with bounce). */
  scale: number;
  /** True once every spring has settled: draw `BODY` itself. */
  done: boolean;
}

/** The shape at `t` seconds into the bloom. */
export function bloomAt(b: Bloom, t: number): BloomFrame {
  const m = mark();
  const done = t >= bloomEnd(b);
  const scale = done ? 1 : springAt(t - b.seed.at, b.seed.spring);
  if (done) return { radii: m.radii, scale, done };

  const core = m.notch - 0.9;
  const poses: Pose[] = m.petals.map((petal, i) => {
    const cue = b.petals[i]!;
    const p = springAt(t - cue.at, cue.spring);
    const r0 = petal.r * b.bud;
    // A bud starts just under the core's rim, so it shows the moment it moves.
    const d0 = core - r0 - 0.4;
    let angle = petal.angle;
    let turned = 1;
    if (cue.from !== undefined) {
      const start = m.petals[cue.from]!.angle;
      let delta = petal.angle - start;
      if (delta > Math.PI) delta -= TAU;
      if (delta < -Math.PI) delta += TAU;
      turned = springAt(t - (cue.turnAt ?? cue.at), cue.turn ?? cue.spring);
      angle = start + delta * turned;
    }
    return {
      angle,
      d: d0 + (petal.d - d0) * p,
      r: r0 + (petal.r - r0) * p,
      // A petal still turning toward its place hasn't arrived, however grown.
      settled: Math.min(1, Math.max(0, Math.min(p, turned))),
    };
  });

  // The final correction toward the real drawing, per petal, blended between
  // neighbours so it never steps at a notch. It only fades in over the last
  // stretch of each petal's travel, when the circles already sit on the mark.
  const weight = poses.map((p) => {
    const s = Math.min(1, Math.max(0, (p.settled - 0.7) / 0.3));
    return s * s * (3 - 2 * s);
  });

  const radii = new Float64Array(SAMPLES);
  const final = finalUnion(b);
  for (let i = 0; i < SAMPLES; i++) {
    const th = (i / SAMPLES) * TAU;
    let petal = -Infinity;
    for (const p of poses) petal = Math.max(petal, reach(th, p.d, p.angle, p.r));
    radii[i] = union(core, petal, b.neck) + blendWeight(th, m.petals, weight) * (m.radii[i]! - final[i]!);
  }
  return { radii, scale, done };
}

/** The circles' outline at rest, which the correction measures against. */
const finals = new Map<string, Float64Array>();
function finalUnion(b: Bloom): Float64Array {
  const key = `${b.neck}`;
  let out = finals.get(key);
  if (out) return out;
  const m = mark();
  const core = m.notch - 0.9;
  out = new Float64Array(SAMPLES);
  for (let i = 0; i < SAMPLES; i++) {
    const th = (i / SAMPLES) * TAU;
    let petal = -Infinity;
    for (const p of m.petals) petal = Math.max(petal, reach(th, p.d, p.angle, p.r));
    out[i] = union(core, petal, b.neck);
  }
  finals.set(key, out);
  return out;
}

/** A per-petal weight at angle `th`, eased between the two nearest petals. */
function blendWeight(th: number, petals: Petal[], w: number[]): number {
  const n = petals.length;
  for (let k = 0; k < n; k++) {
    const a = petals[k]!.angle;
    let span = petals[(k + 1) % n]!.angle - a;
    if (span <= 0) span += TAU;
    let off = th - a;
    if (off < 0) off += TAU;
    if (off <= span) {
      const f = off / span;
      const e = f * f * (3 - 2 * f);
      return w[k]! + (w[(k + 1) % n]! - w[k]!) * e;
    }
  }
  return w[0]!;
}

/** A frame as an SVG path in the mark's viewBox, scaled about its centre. */
export function framePath(frame: BloomFrame): string {
  const { cx, cy } = mark();
  const s = frame.scale;
  let d = "";
  for (let i = 0; i < SAMPLES; i++) {
    const th = (i / SAMPLES) * TAU;
    const r = frame.radii[i]! * s;
    d += `${i === 0 ? "M" : "L"}${(cx + r * Math.sin(th)).toFixed(2)},${(cy - r * Math.cos(th)).toFixed(2)}`;
  }
  return `${d}Z`;
}

/** Mean radius of a frame over the mark's: how grown it looks, for the aura. */
export function frameGrowth(frame: BloomFrame): number {
  const m = mark();
  let a = 0;
  let b = 0;
  for (let i = 0; i < SAMPLES; i++) {
    a += frame.radii[i]!;
    b += m.radii[i]!;
  }
  return (a / b) * frame.scale;
}
