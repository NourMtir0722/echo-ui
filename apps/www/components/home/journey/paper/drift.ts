/**
 * Where a style sheet is as it drifts from Make to Pick: along the line from where it lay to where it
 * lands, it rides the air in a wide S, lifting towards you and turning over,
 * and it lands lying exactly as the page's own sheet would. Pure, so its two
 * ends can be held to the page (drift.test.ts).
 */

/** A sheet's place on the page, untilted: its centre in the window and its width (px), and the turn it lies at (radians). */
export interface Place {
  x: number;
  y: number;
  w: number;
  rz: number;
}

export interface Pose extends Place {
  visible: boolean;
  /** How far it has lifted towards you, px: it looks bigger as it comes up. */
  z: number;
  /** How far behind the page it lies, px, for layering only: it looks the same size and in the same place. */
  depth: number;
  /** Turned about its other two axes, radians. */
  rx: number;
  ry: number;
  /** The paper's own ripple and lifted corner (Paperlab's `fall`), 0 to 1. */
  flutter: number;
  curl: number;
}

export const HIDDEN: Pose = { visible: false, x: 0, y: 0, w: 1, rz: 0, z: 0, depth: 0, rx: 0, ry: 0, flutter: 0, curl: 0 };

/** The sheet behind (Pigment Window) keeps this far back, px, so neither ever passes through the other. */
const BEHIND = 180;

/**
 * The pose at `q` (0 lying in Make, 1 landed in Pick), from `a` to `b`. The
 * sheet `behind` drifts the other way, lifts less and keeps back.
 */
export function drift(q: number, a: Place, b: Place, behind = false): Pose {
  const arc = Math.sin(q * Math.PI);
  const wave = Math.sin(q * Math.PI * 2);
  const side = behind ? 1 : -1;
  const lift = behind ? 0.55 : 1;
  return {
    visible: q > 0 && q < 1,
    x: a.x + (b.x - a.x) * q + side * 170 * Math.sin(q * Math.PI * 1.5) * arc,
    y: a.y + (b.y - a.y) * q + 40 * wave,
    w: a.w + (b.w - a.w) * q,
    rz: a.rz + (b.rz - a.rz) * q - wave * 0.3,
    z: arc * 170 * lift,
    depth: behind ? BEHIND : 0,
    rx: wave * 0.4,
    ry: -arc * 0.9,
    flutter: arc * 0.8,
    curl: arc * 0.45 * lift,
  };
}
