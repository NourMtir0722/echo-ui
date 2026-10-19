/**
 * Pulled in, as one timeline over the scroll, in windows (`u`): -1 as the
 * stage starts to slide up into the window, 0 when it's held under the bar,
 * LENGTH when it lets go and scrolls on with the page. Everything reads it:
 * the world (scene.ts), Echo's pose in its dock, the two lines, the lockup and
 * the key (PulledIn.tsx). Pure, so scrolling back plays it backwards exactly.
 * (PulledIn.tsx plays it at a pace it can be seen at: follow.ts.)
 *
 * Four stops, a window of scroll apart (the page's wheel steps from one to
 * the next: the waypoints in PulledIn.tsx). One push is one beat, and every
 * stop rests on a finished picture with something alive in it: Echo getting
 * into the storm, the text, Echo getting out of it:
 *   caught (0): the dark has opened into the landing's blue vortex, and Echo
 *     is caught in it, circling the light;
 *   the lines (1): the storm holds, turning, and the two lines write
 *     themselves on as the camera drifts in to them;
 *   ChatGPT (2): Echo has been yanked out of the storm into the light, the
 *     white has flooded, and the light at the end of the tunnel turned out to
 *     be ChatGPT: its mark came forward out of that point, and the words wrote
 *     on round it;
 *   the key (3): the key has risen in, and Echo, back out of the white, has
 *     landed on it and pressed it.
 * Past the key the stage lets go, and the white goes on with the page: the
 * blueprint is laid on it (Blueprint.tsx), and the page's ground turns back to
 * the dark only as the letter comes up (WhiteRun.tsx).
 *
 * The flight itself (the storm opening, the dive, the end) runs on its own
 * clock (`fly`): the scroll's, with the storm's hold taken out.
 *
 * The camera, the vortex and Echo are the scroll's. The words aren't: they
 * play at their own pace once their stop is reached (`WORDS`), as a title
 * does in a motion piece, and play back when the scroll goes back past it.
 */

/** In windows of scroll: the stage slides in over one, then is held this long. */
export const ENTER = 1;
/** How long the storm holds Echo, in windows: from where it's caught to where the lines have written on. */
export const HOLD = 1;
export const LENGTH = HOLD + 2;
/** The stops: Echo caught in the storm as the stage is held (one push from the components reaches it), the lines, ChatGPT, the key. */
export const STOPS = [0, 1, 2, 3] as const;

export const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
/** How far `u` is through [a, b], 0..1. */
export const span = (u: number, a: number, b: number) => clamp((u - a) / (b - a));
export const smooth = (t: number) => t * t * (3 - 2 * t);
export const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
export const mix = (a: number, b: number, t: number) => a + (b - a) * t;

/** The flight's own clock: the scroll's, held at the storm (0) from where Echo is caught to the lines. */
const fly = (u: number) => (u <= 0 ? u : Math.max(0, u - HOLD));

/** How far the camera flies into the light, world units; it drifts in while the storm opens, over OPENING. */
export const FLIGHT = 52;
const OPENING: [number, number] = [-0.6, 0.62];
/** How far it drifts in while the storm holds, world units: the lines come toward you as they write on. */
const DRIFT = 4;
/**
 * The dive after Echo, on the flight's clock: it gathers, so the lines hold
 * while Echo is first pulled and rush past as it whips into the light (about
 * a third of the way), and the camera is in the white by DIVE's end.
 */
const DIVE = 0.7;

/** Where the camera is as the storm stops, from its drift in as it opens. */
const opening = (v: number) => {
  const f = span(v, OPENING[0], OPENING[1]);
  return -FLIGHT * (0.12 * f + 0.88 * f * f * f);
};
const STORM_Z = opening(0);

/** The camera's depth: a slow drift while the storm opens and holds, then the dive, gathering speed. */
export function camZ(u: number): number {
  const v = fly(u);
  const hold = DRIFT * smooth(span(u, 0, HOLD));
  if (v <= 0) return opening(v) - hold;
  const d = span(v, 0, DIVE);
  return STORM_Z - (FLIGHT + STORM_Z) * d * d * d - span(v, DIVE, LENGTH - HOLD) * 3 - hold;
}

/** The light floods white over this stretch of the flight (once Echo is in it), and the world is white from its end. */
const FLOOD: [number, number] = [0.48, 0.72];
const WHITE: [number, number] = [0.62, 0.82];
/** The stage's world is all white from here on, in windows of scroll: WhiteRun.tsx lays the page's own white under it. */
export const ALL_WHITE = HOLD + 0.86;

/** The sky: how far the landing's blue has opened, the white core, the vortex's turn (the scroll turns it, held too), and the white. */
export function light(u: number) {
  const v = fly(u);
  const flood = span(v, FLOOD[0], FLOOD[1]);
  return {
    open: mix(0.15, 1, smooth(span(v, -1, -0.08))),
    core: mix(0.04, 0.1, smooth(span(v, -0.84, 0.3))) + flood * flood * 2.6,
    spin: (u + 1) * 0.95,
    world: smooth(span(v, WHITE[0], WHITE[1])),
  };
}

/**
 * The lens: how strong the fish-eye is, whether we're in flight (the speed
 * blur), and how much the stage's edges are the page's. The edges go by where
 * the stage is (`scrolled`, the scroll's own place), not by how far the moment
 * has played.
 */
export function lens(u: number, scrolled = u) {
  const v = fly(u);
  const world = smooth(span(v, WHITE[0], WHITE[1]));
  return {
    fish: mix(0.14, 0.45, smooth(span(v, -0.84, 0.3))) * (1 - world),
    flight: 1 - world,
    // Sliding in, its top and bottom are the page's; held, it's all the world.
    edge: 1 - smooth(span(scrolled, -0.28, -0.02)),
  };
}

/** When the stage calls Echo in: once its light is in the window, as it slides up. */
export const CALL = -0.5;

/**
 * The words: each set plays once the scroll is past its first mark going
 * down, and plays back once it's back before its second going up, so they
 * answer the scroll the moment it turns (`cue`; PulledIn.tsx toggles them,
 * pulled-in.css moves them). The lines with the push that leaves Echo
 * caught, so they write on as the camera drifts in to them; the lockup as its
 * mark is half out of the light, so it steps aside and the name writes on
 * while it comes forward.
 */
export const WORDS = { lines: [0.1, 0.97], lockup: [HOLD + 0.68, HOLD + 0.97] } as const;

/** Whether a set of words is on at `u`, having been `was`, the scroll going `dir` (+1 down, -1 up, 0 still). */
export function cue([on, off]: readonly [number, number], u: number, was: boolean, dir: number): boolean {
  if (u >= off) return true;
  if (u < on) return false;
  return dir > 0 ? true : dir < 0 ? false : was;
}

/** The yank, on the flight's clock: 0 while Echo circles the light, to 1 as it's gone into it, gathering. */
const yank = (v: number) => Math.pow(span(v, 0, 0.55), 1.6);
/** …and the light swallows it over this stretch. */
const SWALLOW: [number, number] = [0.45, 0.58];

/** The two lines: where each is, at their stop, as a share of the stage (its outer edge) and how far ahead. */
export const LINES = [
  { side: "left" as const, at: { x: 0.065, y: 0.24 }, depth: 5.2 },
  { side: "right" as const, at: { x: 0.935, y: 0.78 }, depth: 9 },
];
/**
 * The end: the mark coming forward out of the light's last point while the
 * white is still flooding (never an empty white), the lockup in the middle of
 * the stage at its stop, then rising to make room as the key rises in. (The
 * lockup's words are `WORDS.lockup`'s, played, not scrolled.) It stays: the
 * page scrolls it on.
 */
export function end(u: number) {
  const v = fly(u);
  return {
    mark: easeOut(span(v, 0.6, 0.95)),
    settle: smooth(span(v, 1.04, 1.5)),
    key: easeOut(span(v, 1.1, 1.52)),
  };
}
/**
 * How fast the moment may play each beat, stops a second (follow.ts's `top`):
 * the way out of the storm has the most in it (the yank, the lines rushing
 * past, the flood, the mark), so it takes longest.
 */
export const paceAt = (u: number) => (u > HOLD && u < HOLD + 1 ? 0.7 : 0.9);

/**
 * How long the wheel's step to stop `k` glides (its `data-snap-glide`, snap.ts
 * `glideFor`), s: at its beat's pace at the step's fastest (a step that leaves
 * at 0.8 of its average speed is fastest at 1.35 of it), so the moment is
 * where the page is, and turns back the moment the page does. About 1.5s a
 * beat, 1.9s out of the storm.
 */
export const glideAt = (k: number) => Math.round((1.35 / paceAt(k - 0.5)) * 100) / 100;

/** When Echo lands on the key, and presses it: on the flight's clock, and in windows of scroll. */
const LAND = 1.76;
export const LANDS = HOLD + LAND;

/** Echo on the stage: its flower's centre and size, px, how it leans and turns, whether it's in the air, and whether it's seen. */
export interface Pose {
  x: number;
  y: number;
  size: number;
  lean: number;
  spin: number;
  air: number;
  seen: boolean;
}

/** How fast Echo circles the light while the storm holds it, radians a second: a lap in about six, caught in it, not resting. */
const ORBIT = 1;

/**
 * Echo, for a stage `w` × `ht` px, `t` seconds into the page's life (the
 * storm keeps it circling while the scroll rests): caught in the vortex the
 * moment the stage calls it (the dock's spring brings it from wherever it
 * was), circling the light; yanked into it on the next push, the circle
 * tightening and turning faster and faster until the light swallows it; gone
 * while the white floods and ChatGPT arrives; back out of the white from
 * below, landing on the key (`seat`, measured from the page), where it rides
 * as the page scrolls the end on.
 */
export function echoPose(u: number, w: number, ht: number, t: number, seat: { x: number; y: number; size: number } | null): Pose {
  const v = fly(u);
  const h = ht;
  // Sizes go by the stage's height, but never so big that a narrow stage (a phone) is all Echo.
  const k = Math.min(ht, w * 1.8);
  const cx = w * 0.5;
  const cy = h * 0.5;
  if (v < SWALLOW[1]) {
    const e = yank(v);
    // The circle it's caught in, tightening as it's yanked; the turns the yank adds on top of its circling.
    const theta = -Math.PI * 0.62 + t * ORBIT + Math.pow(e, 1.3) * 2.2 * Math.PI * 2;
    const r = h * 0.18 * Math.pow(1 - e, 1.25);
    const swallow = smooth(span(v, SWALLOW[0], SWALLOW[1]));
    const size = k * mix(0.15, 0.06, e) * (1 - swallow);
    return {
      x: cx + Math.cos(theta) * r * Math.min(1.25, w / h),
      y: cy + Math.sin(theta) * r,
      size: Math.max(size, 1),
      // Leaning into the light it circles, harder as it's pulled.
      lean: 0.35 * -Math.cos(theta) * (1 - e * 0.6),
      spin: e * Math.PI * 5 + swallow * Math.PI * 2,
      air: 1,
      seen: size > k * 0.012,
    };
  }
  const to = seat ?? { x: cx, y: h * 0.62, size: k * 0.12 };
  const OUT = 1.24;
  if (v < OUT) return { x: cx, y: cy, size: 1, lean: 0, spin: 0, air: 1, seen: false };
  if (v < LAND) {
    // Back out of the white, from below the key (never through the mark), up in an arc and a turn, onto the key.
    const s = easeOut(span(v, OUT, LAND));
    const arc = 4 * s * (1 - s);
    return {
      x: mix(cx, to.x, s) + w * 0.06 * arc,
      y: mix(h * 0.96, to.y, s) - h * 0.1 * arc,
      size: mix(k * 0.03, to.size, s),
      lean: 0,
      spin: Math.PI * 2 * s,
      air: 1,
      seen: true,
    };
  }
  return { x: to.x, y: to.y, size: to.size, lean: 0, spin: 0, air: 0, seen: true };
}
