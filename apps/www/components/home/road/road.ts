/**
 * How it works, as a road: the stops are stations on a patch cable that
 * winds down the section, and Echo travels it as you scroll.
 *
 * The cable is lines and quarter turns, measured by length, so a place on it
 * is one number. It's laid through the stops' measured boxes: from 48rem up
 * the stops alternate sides and the cable swings between them, round two
 * bends each time; below that it's a straight run down the left edge.
 *
 * Echo hops along the straight runs and rolls round the bends: the places it can land are on the straights, and between two
 * of them a bend lies, it rolls a whole number of turns so it lands upright.
 *
 * Pure: boxes in, a cable and places out. Workflow.tsx measures and draws.
 */

export interface Pt {
  x: number;
  y: number;
}
export type Seg = { kind: "line"; a: Pt; b: Pt; len: number } | { kind: "arc"; c: Pt; r: number; a0: number; a1: number; len: number };
export interface At extends Pt {
  /** Heading, degrees, 0 = east, 90 = south. */
  deg: number;
}

export class Road {
  segs: Seg[] = [];
  total = 0;
  d: string;
  private cur: Pt;
  constructor(start: Pt) {
    this.cur = start;
    this.d = `M${start.x.toFixed(1)} ${start.y.toFixed(1)}`;
  }
  line(b: Pt) {
    const a = this.cur;
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    if (len < 0.5) return this;
    this.segs.push({ kind: "line", a, b, len });
    this.total += len;
    this.d += ` L${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
    this.cur = b;
    return this;
  }
  arc(c: Pt, r: number, a0: number, a1: number) {
    const len = r * Math.abs(a1 - a0);
    const end = { x: c.x + r * Math.cos(a1), y: c.y + r * Math.sin(a1) };
    this.segs.push({ kind: "arc", c, r, a0, a1, len });
    this.total += len;
    this.d += ` A${r.toFixed(1)} ${r.toFixed(1)} 0 0 ${a1 > a0 ? 1 : 0} ${end.x.toFixed(1)} ${end.y.toFixed(1)}`;
    this.cur = end;
    return this;
  }
  get length() {
    return this.total;
  }
  /** The point `s` along the cable, and which way it's heading there. */
  at(s: number): At {
    let left = Math.min(Math.max(s, 0), this.total);
    for (const seg of this.segs) {
      if (left <= seg.len || seg === this.segs[this.segs.length - 1]) {
        const t = seg.len ? Math.min(1, left / seg.len) : 0;
        if (seg.kind === "line") {
          return {
            x: seg.a.x + (seg.b.x - seg.a.x) * t,
            y: seg.a.y + (seg.b.y - seg.a.y) * t,
            deg: (Math.atan2(seg.b.y - seg.a.y, seg.b.x - seg.a.x) * 180) / Math.PI,
          };
        }
        const ang = seg.a0 + (seg.a1 - seg.a0) * t;
        const heading = ang + (seg.a1 > seg.a0 ? Math.PI / 2 : -Math.PI / 2);
        return { x: seg.c.x + seg.r * Math.cos(ang), y: seg.c.y + seg.r * Math.sin(ang), deg: (heading * 180) / Math.PI };
      }
      left -= seg.len;
    }
    return { x: this.cur.x, y: this.cur.y, deg: 90 };
  }
}

/** A stop's box inside the road's box: its top and bottom, px. */
export interface Row {
  top: number;
  bottom: number;
}

export interface Layout {
  road: Road;
  width: number;
  height: number;
  /** Wide: the stops alternate sides. Narrow: a straight run down the left edge. */
  wide: boolean;
  /** Where each stop's station is along the road, and its height on the page. */
  stations: { s: number; y: number }[];
  /** The ticks along the cable, at an even pace, clear of the stations. */
  ticks: { s: number; x: number; y: number; deg: number; leg: number }[];
}

/** The spacing of the cable's ticks, and of the places Echo can land. */
export const PACE = 66;
/** From here up, the stops alternate sides. */
export const WIDE = 768;
/** Where the cable runs on a phone, from the left edge. */
export const NARROW_LANE = 22;

/**
 * Lays the cable through the stops: down from the top, through each station,
 * and out at the bottom. With `spine`, it's one straight run at that x
 * whatever the width, for stops that take the whole width (the demo cards).
 */
export function layOut(width: number, height: number, rows: readonly Row[], spine?: number): Layout | null {
  if (!width || rows.length === 0) return null;
  const wide = spine === undefined && width >= WIDE;
  const mid = (r: Row) => (r.top + r.bottom) / 2;
  const lane = (i: number) => (wide ? (i % 2 === 0 ? width * 0.8 : width * 0.2) : (spine ?? NARROW_LANE));
  const road = new Road({ x: lane(0), y: 0 });
  const stations: Layout["stations"] = [];
  road.line({ x: lane(0), y: mid(rows[0]!) });
  stations.push({ s: road.length, y: mid(rows[0]!) });
  for (let i = 0; i < rows.length - 1; i++) {
    const a = lane(i);
    const b = lane(i + 1);
    const here = mid(rows[i]!);
    const next = mid(rows[i + 1]!);
    if (!wide) {
      road.line({ x: b, y: next });
    } else {
      const gap = (rows[i]!.bottom + rows[i + 1]!.top) / 2;
      const r = Math.max(4, Math.min(120, Math.abs(a - b) / 2, gap - here, next - gap));
      road.line({ x: a, y: gap - r });
      if (b < a) {
        road.arc({ x: a - r, y: gap - r }, r, 0, Math.PI / 2);
        road.line({ x: b + r, y: gap });
        road.arc({ x: b + r, y: gap + r }, r, -Math.PI / 2, -Math.PI);
      } else {
        road.arc({ x: a + r, y: gap - r }, r, Math.PI, Math.PI / 2);
        road.line({ x: b - r, y: gap });
        road.arc({ x: b - r, y: gap + r }, r, -Math.PI / 2, 0);
      }
      road.line({ x: b, y: next });
    }
    stations.push({ s: road.length, y: next });
  }
  road.line({ x: lane(rows.length - 1), y: height });

  const ticks: Layout["ticks"] = [];
  for (let s = PACE / 2; s < road.length - 10; s += PACE) {
    if (stations.some((st) => Math.abs(st.s - s) < PACE * 0.75)) continue;
    const leg = stations.findIndex((st) => s < st.s);
    const at = road.at(s);
    ticks.push({ s, x: at.x, y: at.y, deg: at.deg, leg: leg === -1 ? stations.length : leg });
  }
  return { road, width, height, wide, stations, ticks };
}

/** How long Echo sits at a stop while it's being read, in px of scroll. */
const DWELL = 150;

/** Where the reading line puts Echo along the road: at a stop while it's being read, travelling between. */
export function alongFor(l: Layout, readingY: number): number {
  const pts = [{ s: 0, y: 0, dwell: 0 }, ...l.stations.map((st) => ({ ...st, dwell: DWELL })), { s: l.road.length, y: l.height, dwell: 0 }];
  if (readingY <= pts[0]!.y) return 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i]!;
    const b = pts[i + 1]!;
    if (readingY <= a.y + a.dwell) return a.s;
    const from = a.y + a.dwell;
    const to = b.y - b.dwell;
    if (readingY < to) return a.s + (b.s - a.s) * ((readingY - from) / Math.max(1, to - from));
  }
  return l.road.length;
}

export interface Slot {
  s: number;
  /** The stop it is, or -1. */
  station: number;
}

/**
 * Where Echo can land: on the straight runs, a pace apart, and at every
 * stop. `rolls[i]` says a bend lies between slot i and slot i + 1, so Echo
 * rolls there instead of hopping.
 */
export function slotsOf(l: Layout): { slots: Slot[]; rolls: boolean[] } {
  const slots: Slot[] = [{ s: 0, station: -1 }];
  const bends: [number, number][] = [];
  let at = 0;
  for (const seg of l.road.segs) {
    if (seg.kind === "arc") bends.push([at, at + seg.len]);
    else {
      const n = Math.floor(seg.len / PACE);
      const pad = (seg.len - (n - 1) * PACE) / 2;
      for (let j = 0; j < n; j++) slots.push({ s: at + pad + j * PACE, station: -1 });
    }
    at += seg.len;
  }
  const kept = slots.filter((sl) => !l.stations.some((st) => Math.abs(st.s - sl.s) < PACE * 0.6));
  kept.push(...l.stations.map((st, i) => ({ s: st.s, station: i })));
  kept.sort((a, b) => a.s - b.s);
  const rolls = kept.slice(0, -1).map((a, i) => bends.some(([b0, b1]) => b0 < kept[i + 1]!.s && b1 > a.s));
  return { slots: kept, rolls };
}

/** The slot nearest a place along the road. */
export function nearest(slots: readonly Slot[], s: number): number {
  let best = 0;
  for (let i = 1; i < slots.length; i++) if (Math.abs(slots[i]!.s - s) < Math.abs(slots[best]!.s - s)) best = i;
  return best;
}

/** A move between two slots: a hop along a straight, or a roll round a bend, in whole turns. */
export interface Move {
  kind: "hop" | "roll";
  from: number;
  to: number;
  /** Milliseconds. */
  dur: number;
  /** A roll's turns, signed by the way it goes across the page. */
  turns: number;
}

/**
 * The next move from slot `k` toward slot `goal`. On a straight it leaps to
 * the run's end, or two short of the goal, then hops in; round a bend it
 * rolls, so it reaches a stop in under a second from anywhere.
 */
export function nextMove(l: Layout, slots: readonly Slot[], rolls: readonly boolean[], k: number, goal: number, size: number): Move | null {
  if (goal === k) return null;
  const dir = goal > k ? 1 : -1;
  const rollsBetween = (a: number, b: number) => rolls[Math.min(a, b)] === true;
  if (rollsBetween(k, k + dir)) {
    const a = slots[k]!.s;
    const b = slots[k + dir]!.s;
    const dist = Math.abs(b - a);
    const dx = l.road.at(b).x - l.road.at(a).x;
    const turns = Math.max(1, Math.round(dist / (Math.PI * size))) * (Math.abs(dx) > 4 ? Math.sign(dx) : dir);
    return { kind: "roll", from: k, to: k + dir, dur: Math.min(700, Math.max(320, dist * 1.1)), turns };
  }
  let j = k;
  while (j !== goal && !rollsBetween(j, j + dir)) j += dir;
  const run = Math.abs(j - k);
  let to = k + dir;
  if (run > 3) to = j === goal ? goal - dir * 2 : j;
  const span = Math.abs(slots[to]!.s - slots[k]!.s);
  return { kind: "hop", from: k, to, dur: Math.abs(to - k) > 1 ? Math.min(480, 240 + span * 0.1) : 170, turns: 0 };
}
