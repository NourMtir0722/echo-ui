/**
 * Where the page comes to rest. A few things on the homepage are meant to be
 * seen whole, never half: each stop on the road (a demo card, which plays only
 * once it's all in view) and the whole-screen frame. They carry `data-snap`.
 *
 * When the wheel lets go near them, the page moves on to the next one in the
 * direction it was going and frames it (use-smooth-scroll.ts asks): whole,
 * under the site's bar, centred in the room that's left; or, taller than that
 * room, its top just under the bar. So among the road's stops one push is one
 * stop, the way a scroll-snap tween moves from one point to the next. Still
 * gliding, the glide is steered there, so it reads as one movement; already
 * at rest, it eases there. It never goes back against the push: with no stop
 * ahead near enough (the last one behind, the next more than a window away),
 * the page stays where the visitor left it.
 *
 * Among the stops, the wheel steps (use-smooth-scroll.ts): one push moves to
 * the next stop and no further, however hard the push, and a trackpad's own
 * momentum after it is spent, not scrolled (`nextStop`); a new push, even one
 * made while that momentum is still arriving, moves on again (`newPush`). And
 * a stop that's playing holds the page, so every step is seen whole
 * (`holding`): a push onward hurries it instead (its pause key pulses, the
 * rest plays fast) and the page goes on when it ends. Once a card has been
 * seen through, it never holds again. Back up is always free.
 *
 * Only the wheel: keys, the scrollbar, find in page, touch and focus leave the
 * page where they put it, and under reduced motion nothing glides at all.
 */

/** A push shorter than this is a nudge, px: it reaches for a stop only REACH ahead, not AHEAD. */
const NUDGE = 60;
/** A nudge goes on to a stop this near, as a share of the window. */
const REACH = 0.42;
/** A stop ahead is gone to if it's at most this far from where the push lands, as a share of the window. */
const AHEAD = 1;
const TOP_AIR = 12;

let found: HTMLElement | null | undefined;

/** The site's bar across the top of the homepage. */
function bar(): HTMLElement | null {
  if (found === undefined || (found && !found.isConnected)) {
    found = document.querySelector<HTMLElement>(".home-shell > .echo-shell__rail");
  }
  return found;
}

/** How far down the site's bar covers the page right now (0 while it's away, over the hero). */
export function topInset(): number {
  const b = bar();
  return b ? Math.max(0, Math.min(b.getBoundingClientRect().bottom, 160)) : 0;
}

/** The bar's own height, shown or not: a stop is laid out for the room under it. */
export function barHeight(): number {
  return bar()?.offsetHeight ?? 0;
}

/** The scroll position that frames `el`, from where the page is now (`scrollY`). */
export function frameFor(el: HTMLElement, scrollY: number): number {
  const r = el.getBoundingClientRect();
  const inset = topInset();
  const room = window.innerHeight - inset;
  const air = r.height <= room ? (room - r.height) / 2 : TOP_AIR;
  return Math.round(r.top + scrollY - inset - air);
}

/**
 * The stop to frame when a push that began at `from` comes to rest at
 * `going`: the nearest one at or past where it lands, in its direction. None
 * when there's no stop near enough there: the page stays where the push left
 * it. It never goes back against the push: a short swipe away from a stop,
 * into a stretch the wheel scrolls freely, was pulled all the way back to the
 * stop it left.
 */
export function stopFor(scrollY: number, from: number, going: number): number | null {
  const at: number[] = [];
  for (const el of document.querySelectorAll<HTMLElement>("[data-snap]")) {
    if (el.getClientRects().length > 0) at.push(frameFor(el, scrollY));
  }
  return stopAmong(at, window.innerHeight, from, going);
}

/** `stopFor` among stops framed at `at`, in a window `h` px tall. */
export function stopAmong(at: number[], h: number, from: number, going: number): number | null {
  const push = going - from;
  const dir = Math.sign(push);
  if (!dir) return null;
  // Ahead: the stops at or past where the push lands, in its direction (a few px short is still there).
  const ahead = at.filter((p) => (p - going) * dir >= -8);
  if (ahead.length === 0) return null;
  const near = ahead.reduce((a, b) => (Math.abs(b - going) < Math.abs(a - going) ? b : a));
  return Math.abs(near - going) <= h * (Math.abs(push) < NUDGE ? REACH : AHEAD) ? near : null;
}

/** How far the next stop may be for a push to step to it, as a share of the window: past that, the page scrolls freely. */
const STEP_REACH = 1.7;

/**
 * How far off its frame a stop can rest and still be the one in view, px. A
 * glide dropped when late content shifts the page can leave it a few pixels
 * short; the wheel's hold, a demo's start and the next push all take the stop
 * as framed within this, so none of them waits on another.
 */
export const IN_VIEW = 40;

/**
 * The first stop past `from`, in the push's direction, if it's near enough to
 * step to: one push, one stop, never one further. `from` is where the page
 * is, or, while a step's glide is still under way, the stop it's going to:
 * a push then goes on to the one after. (`scrollY` is where the page is now,
 * which every stop's place is read against.)
 */
export function nextStop(scrollY: number, dir: number, from = scrollY): { at: number; el: HTMLElement } | null {
  let best: { at: number; el: HTMLElement } | null = null;
  for (const el of document.querySelectorAll<HTMLElement>("[data-snap]")) {
    if (el.getClientRects().length === 0) continue;
    const at = frameFor(el, scrollY);
    // The stop in view (within IN_VIEW of its frame) isn't the next one: a push moves on from it.
    if ((at - from) * dir <= IN_VIEW) continue;
    if (best === null || Math.abs(at - from) < Math.abs(best.at - from)) best = { at, el };
  }
  return best !== null && Math.abs(best.at - from) <= window.innerHeight * STEP_REACH ? best : null;
}

/**
 * How long a step glides when the scroll plays a scene on the way, and how
 * long the way is: the stop the passage arrives at going down carries the
 * scene's time (`data-snap-glide`, s: the ChatGPT moment's waypoints, the
 * close's sheet), so a step down to it, or back up from it, takes that long
 * over the whole passage, and the scene keeps pace with the page. Null for
 * an ordinary step.
 */
export function glideFor(to: HTMLElement, dir: number): { s: number; length: number } | null {
  const stops = [...document.querySelectorAll<HTMLElement>("[data-snap]")].filter((el) => el.getClientRects().length > 0);
  const k = stops.indexOf(to);
  const owner = dir < 0 ? stops[k + 1] : to;
  const before = dir < 0 ? to : stops[k - 1];
  const s = Number(owner?.dataset.snapGlide);
  if (!owner || !before || !(s > 0)) return null;
  return { s, length: Math.abs(frameFor(owner, window.scrollY) - frameFor(before, window.scrollY)) };
}

/**
 * Sent to a playing card (DemoCard.tsx) by the page's wheel when the visitor
 * pushes on before it has ended: it plays the rest fast, and the page goes on
 * once it has (use-smooth-scroll.ts). Here, so the scroll needn't load a card
 * to send it.
 */
export const HURRY_EVENT = "echo-demo-hurry";

/** Hurried, the rest of a demo plays in this long, s, quick… */
const HURRY = 1.1;
/** …but never more than this many times as fast: a press every third of a second or so, each still seen. */
const HURRY_MOST = 3;

/**
 * How many times faster a hurried card plays, with `left` seconds of its
 * demo still to play: the rest in HURRY seconds, unless that would be faster
 * than HURRY_MOST. Make, pushed on a second in, plays the rest in 2.4s, not
 * 6.5 times as fast in one.
 */
export function hurryRate(left: number): number {
  return Math.min(HURRY_MOST, Math.max(1, left / HURRY));
}

/**
 * Whether `el` is a demo card that holds the page: it plays (or is about to),
 * and hasn't been seen through. A card that has played to its end (at its
 * own pace, or hurried by a push) carries `data-seen` and never holds again,
 * even when it plays again later; one the visitor paused holds nothing.
 */
function holds(el: HTMLElement): boolean {
  if (!el.matches(".demo[data-snap][data-live]") || el.hasAttribute("data-seen")) return false;
  return el.dataset.phase === "playing" || el.dataset.phase === "waiting";
}

/**
 * The stop that holds a push onward: a demo card in view and still going
 * (DemoCard.tsx's `data-phase`), or `arriving`, the card a step's glide is
 * still taking the page to, when it's one that will play.
 */
export function holding(arriving?: HTMLElement | null): HTMLElement | null {
  if (arriving?.isConnected && holds(arriving)) return arriving;
  const inset = topInset();
  for (const el of document.querySelectorAll<HTMLElement>(".demo[data-snap][data-live]")) {
    if (holds(el) && isFramed(el.getBoundingClientRect(), inset, IN_VIEW)) return el;
  }
  return null;
}

/**
 * A step's glide whose stop has moved under it: where it should go
 * now and the launch speed that carries it on from where it is at the speed
 * it's going (`carry`), or null when the stop hasn't moved. `to` is where the
 * glide is aimed, `at` where the stop now frames, `y` where the page is,
 * `speed` how fast it's going, px a second, and `left` how long the glide
 * has to go, s.
 */
export function reaim(to: number, at: number, y: number, speed: number, left: number): { to: number; launch: number } | null {
  if (Math.abs(at - to) <= 1) return null;
  const d = at - y;
  return { to: at, launch: Math.abs(d) < 1 ? 0 : (speed * left) / d };
}

/**
 * An ease that sets off at `speed` and comes to rest at the end: speed in
 * lengths of the move per length of the glide, so 0 starts from rest and 3
 * leaves at once (a push's launch, as a scroll-snap tween's power3 does).
 * Handed a glide's own speed, it carries the page on without a jolt or a
 * second start. Under 0, it runs on a little first and comes back.
 */
export function carry(speed: number): (t: number) => number {
  const m = Math.max(-1, Math.min(3, speed));
  return (t) => m * (t * t * t - 2 * t * t + t) + 3 * t * t - 2 * t * t * t;
}

/** After a step or a hold, the wheel has to be still this long before a push counts again (its momentum is spent), ms. */
export const QUIET = 240;

/**
 * What the wheel has done lately, px a ms: when its last event came, its
 * fastest since the push began, its slowest since then, its last two, and
 * which way it's going.
 */
export interface WheelRun {
  last: number;
  high: number;
  low: number;
  a: number;
  b: number;
  dir: number;
}

export const wheelRun = (): WheelRun => ({ last: -Infinity, high: 0, low: 0, a: 0, b: 0, dir: 0 });

/** A wheel that slowed to under 1/RISE of its fastest, then sped up to RISE times its slowest, is a new push. */
const RISE = 2;
/** …and only at this speed or more, px a ms (8px a 60Hz frame): under it, it's the momentum's last wavering. */
const RISE_FROM = 0.5;
/**
 * The wheel's speed is read only from an event that came this soon after the
 * last, ms, and no sooner than STEADY_FROM: at the wheel's own pace. One that
 * came in a burst after a stall, or long after the last, says nothing about it.
 */
const STEADY_FROM = 3;
const STEADY = 50;

/**
 * Whether a wheel event of `delta` (deltaY, px) at `now` (ms, the event's own
 * time) begins a new push, rather than carrying on the last one or its
 * momentum: the wheel was still a moment first, or it turned the other way,
 * or, having slowed, it speeds up again, three events running. A trackpad's
 * momentum only ever slows, and only ever goes the way its swipe went, so a
 * swipe made while it's still arriving (fingers back on the pad) shows as the
 * wheel picking up, or turning back, and it counts instead
 * of being spent with the push before it. A swipe's own start, or a mouse
 * wheel spun faster and faster, never slowed first, so it stays one push.
 *
 * The wheel is read by its speed (px a ms), not by its events' sizes: a busy
 * page gets the events that queued while a frame ran long merged, added up
 * (Chrome), one, two or three at a time, and their sizes rise and fall with
 * the frames while the wheel only slows. And still means still for the page
 * too (`seen`: how long it has drawn frames since the last event, ms, a
 * stalled frame counting as one): Safari stamps an event when the page gets
 * to it, so after a stall the momentum's next event looks long after the
 * last, though the wheel never stopped.
 */
export function newPush(run: WheelRun, now: number, delta: number, seen = Infinity): boolean {
  const size = Math.abs(delta);
  const dir = Math.sign(delta);
  const gap = now - run.last;
  const turned = dir !== 0 && run.dir !== 0 && dir !== run.dir;
  run.last = now;
  if (dir) run.dir = dir;
  if ((gap > QUIET && seen > QUIET) || turned) {
    run.high = run.low = run.a = run.b = 0;
    return true;
  }
  if (gap < STEADY_FROM || gap > STEADY) return false;
  const v = size / gap;
  const picksUp = v > run.a && run.a > run.b && run.low <= run.high / RISE && v >= run.low * RISE && v >= RISE_FROM;
  if (picksUp || v > run.high) run.high = run.low = v;
  else run.low = Math.min(run.low, v);
  run.b = run.a;
  run.a = v;
  return picksUp;
}

/** Longest a frame counts for, ms: past it, the page was stalled, not running. */
export const LONGEST_FRAME = 50;

/**
 * A clock that runs with the page's frames, a stalled frame counting as one
 * (LONGEST_FRAME): read it once a frame. A glide timed on it goes on after a
 * stall from where it was, instead of jumping by the whole stall at once
 *, and stillness timed on it is stillness the page was there to see.
 */
export function steadyClock(longest = LONGEST_FRAME): (now: number) => number {
  let at = 0;
  let last: number | null = null;
  return (now) => {
    if (last !== null) at += Math.min(Math.max(0, now - last), longest);
    last = now;
    return at;
  };
}

/** Whether `el` is all in view, under the bar (or, taller than the room, fills it). */
export function isFramed(r: DOMRect, inset: number, slack = 6): boolean {
  const h = window.innerHeight;
  if (r.height <= h - inset) return r.top >= inset - slack && r.bottom <= h + slack;
  return r.top <= inset + slack && r.bottom >= h - slack;
}
