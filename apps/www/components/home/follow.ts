/**
 * A scene the scroll plays (the ChatGPT moment, the paper from Make to Pick)
 * keeps to a pace it can be seen at: moved at that pace or slower, it's where
 * the page is, turning back the moment the page does; moved faster (a flick
 * on a phone, a key, a stall, a step's quick glide), it goes after the page
 * no faster than `TOP`, and comes to rest exactly where the page is.
 *
 * Moved by the page alone, a scene ran at the page's speed: a step's glide
 * leaves at three times its average, so half of a beat was over in a fifth of
 * a second, and a flick on a phone ran a whole three-screen moment in about
 * one. Following the page like a spring, it trailed it, and turned
 * back half a second after the page did.
 */

/**
 * Where a scene is (in its own units: a stop's worth of scroll is 1), how fast it's going, units a second, and
 * where the page was last frame.
 */
export interface Follow {
  at: number;
  v: number;
  page: number;
}

export const following = (at: number): Follow => ({ at, v: 0, page: at });

/** Its top speed, units a second: a beat (a stop's worth) takes at least 1/TOP s. */
export const TOP = 0.9;
/** How quickly it closes the last of a gap, a second. */
const CLOSE = 30;
/** How hard it may speed up, slow down or turn, units a second a second: it turns back within a tenth of a second. */
const TURN = 12;
/** Longest a frame counts for, s: after a stall the scene goes on one frame's worth, not by the whole stall. */
const LONGEST = 0.1;
/** It's stepped this finely, s, whatever the frame rate. */
const STEP = 1 / 240;

/**
 * Moves `f` toward `to`, where the scroll has taken the scene, by a frame of
 * `dt` seconds, never faster than `top`, and says where it is now. At rest
 * within a hair of `to`, it's exactly there.
 */
export function follow(f: Follow, to: number, dt: number, top = TOP): number {
  const frame = Math.min(Math.max(0, dt), LONGEST);
  // The page's own speed, so a scene keeping up with it rides on it instead of trailing it.
  const moving = dt > 0 ? (to - f.page) / Math.max(dt, 1e-3) : 0;
  f.page = to;
  let left = frame;
  while (left > 1e-9) {
    const h = Math.min(STEP, left);
    left -= h;
    const gap = to - f.at;
    // The speed that closes what's left of the gap without ever having to slow down harder than TURN to stop on it
    // (half of it on the way, and the last of it as CLOSE closes it).
    const close = Math.sign(gap) * Math.min(Math.abs(gap) * CLOSE, Math.sqrt(TURN * Math.abs(gap)));
    const want = Math.max(-top, Math.min(top, moving + close));
    f.v += Math.max(-TURN * h, Math.min(TURN * h, want - f.v));
    f.at += f.v * h;
  }
  if (Math.abs(to - f.at) < 1e-4 && Math.abs(f.v) < 1e-2) {
    f.at = to;
    f.v = 0;
  }
  return f.at;
}
