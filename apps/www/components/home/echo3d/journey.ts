/**
 * Where Echo is for a scroll position: its path down the homepage.
 *
 * Every section has a perch (a `GuideStop`). Echo belongs to the section
 * you're reading, the last one whose top has passed the middle of the
 * window, and sits on its perch while the perch is in view. When you
 * scroll on and the perch goes out of view, it waits for you in the margin,
 * level with where the perch went. It never waits on top of what you're
 * reading.
 *
 * As the next section comes up to the middle of the window, Echo moves to
 * it, and its place on the way follows the scroll exactly, forwards and
 * back: it hops out to the margin on the side it's heading for, turning once
 * in the air, rides the margin a moment, and hops in onto the new perch,
 * turning once more, so it lands facing you. Stop scrolling halfway and it's
 * in the margin.
 *
 * The margin is the page's own where there is one. Where there's none (a
 * phone) Echo rides half outside the window, on its edge, peeking in.
 *
 * Pure: boxes and a scroll in, a pose out. The stage measures and draws.
 */

/** A box in viewport pixels. */
export interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface Pose {
  /** The flower's centre, viewport px. */
  x: number;
  y: number;
  /** The flower's height, px. */
  size: number;
  /** Turn about its own upright axis, radians: a whole turn per hop. */
  spin: number;
  /** Lean into the direction it's travelling, radians. */
  lean: number;
  /** 0 standing on something, 1 in the air: its shadow fades with it. */
  air: number;
  /** Which way it faces while in the margin: toward the page. */
  face: number;
}

export interface Place {
  pose: Pose;
  /** The section it belongs to, or null while it's moving between two. */
  perch: number | null;
  /** On the perch itself, not waiting for it in the margin. */
  seated: boolean;
}

export interface Viewport {
  scroll: number;
  /** The furthest the page can scroll. */
  maxScroll: number;
  vw: number;
  vh: number;
  /** The empty margin beside the page's content, px (0 on a phone). */
  gutter: number;
  /** What covers the top of the window (a sticky bar), px. */
  top?: number;
}

/** A stop on the way: its perch, and the section the perch is in. */
export interface Stop {
  perch: Box;
  section: Box;
}

/** How much of a drawn creature's box the flower fills: 47.9 of the drawing's 56. */
export const FLOWER = 0.855;
/** A section is the one being read once its top passes this far down the window. */
export const READING = 0.5;
/** How much scrolling a move between sections takes, in windows. */
const MOVE = 0.45;
/** How far a perch goes out of view before Echo has left it for the margin, px. */
const LETGO = 140;

/** Sine in and out: gentle at both ends, and never faster than about 1.6 times the average in between. */
const ease = (p: number) => 0.5 - Math.cos(Math.PI * p) / 2;
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const smooth = (a: number, b: number, v: number) => {
  const t = clamp((v - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

/** Echo sitting on a perch: feet on its floor, as big as the perch is wide. */
export function onPerch(box: Box): Pose {
  const size = box.width * FLOWER;
  return { x: box.left + box.width / 2, y: box.top + box.height - size / 2, size, spin: 0, lean: 0, air: 0, face: 0 };
}

/** The margin on one side, at height `y` (kept inside the window). */
export function margin(right: boolean, y: number, win: Viewport, size = 80): Pose {
  const roomy = win.gutter >= 72;
  // A phone's gutter: the words run to a few px from the window's edge.
  const phone = win.gutter < 40;
  // In the margin if it fits there; on a phone half out of the window, on its edge, turned so its eyes are
  // in, and small enough that what's in reaches about as far as the gutter, not into the words;
  // in between, mostly in the margin there is.
  const s = roomy ? clamp(win.gutter - 16, 56, 104) : phone ? clamp(size, 40, 52) : clamp(size, 56, 80);
  const inset = roomy ? win.gutter / 2 : phone ? 0 : s * 0.16;
  const top = (win.top ?? 0) + s / 2 + 12;
  return {
    x: right ? win.vw - inset : inset,
    y: clamp(y, top, win.vh - s / 2 - 12),
    size: s,
    spin: 0,
    lean: 0,
    air: 1,
    face: right ? -0.45 : 0.45,
  };
}

function hop(a: Pose, b: Pose, t: number, turn: number): Pose {
  const q = ease(t);
  const dx = b.x - a.x;
  const dist = Math.hypot(dx, b.y - a.y);
  const arc = Math.sin(Math.PI * q);
  return {
    x: mix(a.x, b.x, q),
    y: mix(a.y, b.y, q) - Math.min(170, Math.max(28, dist * 0.3)) * arc,
    size: mix(a.size, b.size, q),
    spin: turn * Math.PI * 2 * q,
    lean: clamp(dx / 900, -0.35, 0.35) * arc,
    air: mix(a.air, b.air, q),
    face: mix(a.face, b.face, q),
  };
}

/** Where Echo sits for a section: on its perch while it's in view, in the margin beside it when not. */
export function resting(stop: Stop, win: Viewport): { pose: Pose; seated: boolean } {
  const on = onPerch(stop.perch);
  const top = (win.top ?? 0) + on.size / 2;
  const bottom = win.vh - on.size / 2;
  const out = Math.max(top - on.y, on.y - bottom, 0);
  if (out === 0) return { pose: on, seated: true };
  const t = smooth(0, LETGO, out);
  const aside = margin(on.x >= win.vw / 2, on.y, win, on.size);
  return { pose: hop(on, aside, t, 0), seated: false };
}

/** The scroll range each move between sections takes: [start, end] for the move into section i. */
export function moves(stops: readonly Stop[], win: Viewport): [number, number][] {
  const span = win.vh * MOVE;
  const out: [number, number][] = [[-Infinity, -Infinity]];
  let prev = 0;
  for (let i = 1; i < stops.length; i++) {
    const enter = stops[i]!.section.top + win.scroll - win.vh * READING;
    let end = Math.min(enter + span / 2, win.maxScroll);
    const start = Math.max(end - span, prev);
    if (end <= start) end = start + 1;
    out.push([start, end]);
    prev = end;
  }
  return out;
}

/** Where Echo is. `stops` are the perches and their sections where they are right now, in page order; the first is home. */
export function place(stops: readonly Stop[], win: Viewport): Place {
  const windows = moves(stops, win);
  let k = 0;
  for (let i = 1; i < stops.length; i++) {
    const [start, end] = windows[i]!;
    if (win.scroll >= end) {
      k = i;
      continue;
    }
    if (win.scroll > start) {
      // On the way from section i - 1 to section i.
      const u = (win.scroll - start) / (end - start);
      const a = resting(stops[i - 1]!, win).pose;
      const b = resting(stops[i]!, win).pose;
      const aside = margin(b.x >= win.vw / 2, mix(a.y, b.y, 0.5), win, Math.min(a.size, b.size));
      // It turns the way it's going: clockwise heading right.
      const turn = b.x >= a.x ? 1 : -1;
      const pose =
        u < 0.42
          ? hop(a, aside, u / 0.42, turn)
          : u > 0.58
            ? hop(aside, b, (u - 0.58) / 0.42, turn)
            : { ...aside, y: aside.y - Math.sin(((u - 0.42) / 0.16) * Math.PI) * 6 };
      return { pose, perch: null, seated: false };
    }
    break;
  }
  const rest = resting(stops[k]!, win);
  return { pose: rest.pose, perch: k, seated: rest.seated };
}

/**
 * Under reduced motion there's no journey: Echo is with the section being
 * read, and moves only by being somewhere else.
 */
export function placeStill(stops: readonly Stop[], win: Viewport): Place {
  const windows = moves(stops, win);
  let k = 0;
  for (let i = 1; i < stops.length; i++) if (win.scroll >= (windows[i]![0] + windows[i]![1]) / 2) k = i;
  const on = onPerch(stops[k]!.perch);
  const visible = on.y >= (win.top ?? 0) + on.size / 2 && on.y <= win.vh - on.size / 2;
  return {
    pose: visible ? on : margin(on.x >= win.vw / 2, on.y, win, on.size),
    perch: k,
    seated: visible,
  };
}
