/**
 * Morph outline — parts that divide and fuse, drawn crisp.
 *
 * Every part is a signed distance field (negative inside): a rounded box, a
 * pill when its radius is half its height. A group is fused with a smooth
 * minimum, so two parts near each other grow a neck toward each other before
 * they touch, and a neck thins and snaps as they part. A whole divides by
 * blending its field into its parts', which pinches a waist rather than
 * cutting one.
 *
 * No blur-and-threshold "goo" filter: that smears the plastic and the label.
 * The outline is traced column by column and returned as one SVG path, so the
 * material drawn into it (gradient, seam, gloss, shadow) stays intact.
 *
 * All parts sit on one centre line (y = 0), give or take a small `y` offset,
 * so every column crosses the shape once: bisect up for its top edge and down
 * for its bottom.
 *
 * Pure: no DOM, no window. Safe on the server and in tests.
 */

export interface MorphPill {
  /** Left edge, px. */
  x0: number;
  /** Right edge, px. */
  x1: number;
  /** Height, px. */
  h: number;
  /** Corner radius, px; omitted (or larger than half the height) is a pill. */
  r?: number;
  /** Vertical offset from the centre line, px (a pressed part sinks). */
  y?: number;
}

/** Rounded box, centred on its own box; with r = h/2 it is a pill. */
function sdPill(x: number, y: number, p: MorphPill): number {
  const hw = Math.max(0, p.x1 - p.x0) / 2;
  const hh = p.h / 2;
  const r = Math.min(p.r ?? Infinity, hw, hh);
  const qx = Math.abs(x - (p.x0 + p.x1) / 2) - (hw - r);
  const qy = Math.abs(y - (p.y ?? 0)) - (hh - r);
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
}

/** Polynomial smooth minimum: `k` is how far, px, a neck reaches. */
function smin(a: number, b: number, k: number): number {
  if (k <= 0) return Math.min(a, b);
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
}

export interface MorphField {
  /** The pills, fused with the neck reach `k`. */
  parts: MorphPill[];
  k: number;
  /**
   * Optional whole pill the parts divide out of. `t` 0 is the whole, 1 is the
   * fused parts; in between the two distance fields are blended, which is what
   * pinches a waist into the whole rather than cutting it.
   */
  whole?: MorphPill | null;
  t?: number;
  /**
   * The thinnest a neck gets before it snaps, px. A liquid bridge breaks
   * while it still has some body; drawn down to nothing it reads as a crease.
   */
  neck?: number;
}

/** Half the height of the tallest piece, from the centre line, px. */
function slab(f: MorphField): number {
  let h = 0;
  for (const p of f.parts) if (p.x1 - p.x0 >= 0.5) h = Math.max(h, p.h / 2 + Math.abs(p.y ?? 0));
  if (f.whole && (f.t ?? 1) < 1) h = Math.max(h, f.whole.h / 2 + Math.abs(f.whole.y ?? 0));
  return h;
}

function sample(f: MorphField, x: number, y: number, top = slab(f)): number {
  let d = Infinity;
  let hard = Infinity;
  for (const p of f.parts) {
    if (p.x1 - p.x0 < 0.5 || p.h < 0.5) continue;
    const e = sdPill(x, y, p);
    hard = Math.min(hard, e);
    d = d === Infinity ? e : smin(d, e, f.k);
  }
  // The smooth minimum adds material wherever two pieces are close, above
  // and below them as well as between: two caps side by side would grow a
  // bump over their join. A neck only ever fills in between, so nothing
  // is drawn past the tallest piece's top and bottom.
  const cap = (v: number) => Math.max(v, Math.abs(y) - top);
  const t = Math.min(1, Math.max(0, f.t ?? 1));
  if (f.whole && t < 1) {
    const w = sdPill(x, y, f.whole);
    if (d === Infinity) return w;
    // The blend pinches a waist where the whole still is; a part that has
    // travelled out of it is drawn as itself (the hard union), or the blend
    // would smear it into a wedge. At t = 0 the parts sit inside the whole,
    // so this is exactly the whole.
    return cap(Math.min(hard, w + (d - w) * t));
  }
  return cap(d);
}

const n = (v: number) => Math.round(v * 100) / 100;

/**
 * The field's outline as an SVG path, centred on `cy`. `grow` offsets it
 * outward by that many px — the recessed well a cap sits in is the cap's own
 * outline grown by the well's rim.
 */
export function outline(f: MorphField, cy: number, grow = 0): string {
  const all = f.whole && (f.t ?? 1) < 1 ? [...f.parts, f.whole] : f.parts;
  if (all.length === 0) return "";
  const L = Math.min(...all.map((p) => p.x0)) - 2 - grow;
  const R = Math.max(...all.map((p) => p.x1)) + 2 + grow;
  const H = Math.max(...all.map((p) => p.h / 2 + Math.abs(p.y ?? 0))) + f.k + grow;

  const ceiling = slab(f);
  const at = (x: number, y: number) => sample(f, x, y, ceiling);

  // Distance from the centre line to the edge, going `dir` (-1 up, +1 down).
  const reach = (x: number, dir: number) => {
    if (at(x, 0) >= grow) return 0;
    let lo = 0;
    let hi = H;
    for (let i = 0; i < 20; i++) {
      const m = (lo + hi) / 2;
      if (at(x, dir * m) < grow) lo = m;
      else hi = m;
    }
    return lo;
  };

  // A column is inside while the shape there is thicker than the thinnest
  // neck: a neck snaps with some body left, rather than pinching to a point.
  // (A cap's own rounded end is thinner than that only in its last fraction
  // of a pixel.)
  const neck = f.neck ?? 8;
  const inside = (x: number) => at(x, 0) < grow && (neck <= 0 || reach(x, -1) + reach(x, 1) >= neck);
  const edge = (a: number, b: number) => {
    // a and b straddle the boundary; bisect to it.
    const ia = inside(a);
    for (let i = 0; i < 18; i++) {
      const m = (a + b) / 2;
      if (inside(m) === ia) a = m;
      else b = m;
    }
    return (a + b) / 2;
  };

  // Runs of the centre line that are inside the shape.
  const runs: [number, number][] = [];
  let start: number | null = null;
  let prev = L;
  for (let x = L; x <= R + 1; x += 1) {
    const inHere = x <= R && inside(x);
    if (inHere && start === null) start = edge(prev, x);
    if (!inHere && start !== null) {
      runs.push([start, edge(prev, x)]);
      start = null;
    }
    prev = x;
  }

  let d = "";
  for (const [e0, e1] of runs) {
    // Cosine spacing: dense at the ends, where the edge turns vertical.
    const N = Math.max(24, Math.ceil((e1 - e0) / 1.6));
    const top: string[] = [];
    const bottom: string[] = [];
    for (let i = 0; i <= N; i++) {
      const x = e0 + ((e1 - e0) * (1 - Math.cos((Math.PI * i) / N))) / 2;
      const end = i === 0 || i === N;
      top.push(`${n(x)} ${n(cy - (end ? 0 : reach(x, -1)))}`);
      bottom.push(`${n(x)} ${n(cy + (end ? 0 : reach(x, 1)))}`);
    }
    d += `M ${top.join(" L ")} L ${bottom.reverse().join(" L ")} Z `;
  }
  return d.trim();
}

/**
 * How a morph moves: springs for the division and for each edge, how far a
 * neck reaches, the resting gap, and the timing of labels.
 */
export interface MorphFeel {
  /** The whole pinching into its parts. */
  t: { duration: number; bounce: number };
  /** Edges that face another part. */
  inner: { duration: number; bounce: number };
  /** Edges on the outside. */
  outer: { duration: number; bounce: number };
  /** How far a neck reaches, px. Two parts stay joined while their gap is under k/2. */
  k: number;
  /** Resting gap between parts, px (never less than `apart` allows). */
  gap: number;
  /** Kick to a part's height as it comes free, px/s. */
  swell: number;
  /** When the labels start to cross after the change starts, s. */
  labelDelay: number;
  /** Delay between one part and the next, s. */
  stagger: number;
  /** When, on the way back, the whole takes over from the parts, s. */
  mergeAt: number;
}

/**
 * The feels. Cell divides evenly and each half swells round as it comes
 * free; mercury is short, quick and jiggles; cut is no liquid at all — a clean
 * cut, then parts slide apart — for interfaces that want the layout without
 * the liquid.
 */
export const morphFeels = {
  cell: {
    t: { duration: 0.36, bounce: 0.14 },
    inner: { duration: 0.4, bounce: 0.22 },
    outer: { duration: 0.44, bounce: 0.18 },
    k: 26,
    gap: 18,
    swell: 90,
    labelDelay: 0.06,
    stagger: 0.025,
    mergeAt: 0.16,
  },
  mercury: {
    t: { duration: 0.28, bounce: 0.3 },
    inner: { duration: 0.32, bounce: 0.42 },
    outer: { duration: 0.36, bounce: 0.35 },
    k: 14,
    gap: 12,
    swell: 170,
    labelDelay: 0.08,
    stagger: 0.02,
    mergeAt: 0.12,
  },
  cut: {
    t: { duration: 0.14, bounce: 0 },
    inner: { duration: 0.36, bounce: 0.12 },
    outer: { duration: 0.36, bounce: 0.12 },
    k: 0,
    gap: 10,
    swell: 0,
    labelDelay: 0.06,
    stagger: 0,
    mergeAt: 0.2,
  },
} as const satisfies Record<string, MorphFeel>;

export type MorphFeelName = keyof typeof morphFeels;

/**
 * The gap parts rest at. Parts never rest joined by a neck — that reads as
 * one lumpy object rather than two — so the gap always clears the neck's
 * reach, `k / 2`, with room to spare.
 */
export function apart(feel: MorphFeel, min = 12): number {
  return Math.max(feel.gap, min, feel.k / 2 + 6);
}
