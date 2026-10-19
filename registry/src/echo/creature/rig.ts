/**
 * The creature rig: the living layers every creature shares.
 *
 * Built once for a creature's whole life, never torn down on a change of mood:
 * a mood is a set of targets (how far it drifts, how deep it breathes, how
 * open the lids are, where the eyes look), and every one of them is on a
 * spring, so a change of mood is a change of direction from wherever the
 * creature is (tearing the tweens down snapped it back to centre).
 *
 * Each layer is its own SVG group, so the layers compose instead of fighting
 * over one transform:
 *   drift   continuous wander + lean toward the pointer (never stops: layered
 *           slow sines, whose phases advance with the pace, so a slower mood
 *           slows them without a jump)
 *   breath  a slow scale about the body's low centre
 *   lids    the eyes' open-ness, a blink riding on top
 *   pupils  where the eyes look: the pointer, a glance, or a resting point
 *
 * Eyes lead and the body follows: the pupils are on a quick spring, the lean
 * on a slow one. One pointer listener serves every creature on the page, and
 * each measures its box once per frame, only when the pointer or the page has
 * moved, before any creature writes. A creature out of view stops drawing.
 */
import gsap from "gsap";
import { createSpring, type Spring, type SpringConfig } from "echo-ui-core/tactile";

/** How far the pupils may travel, viewBox units: they stay inside the whites. */
export const TRAVEL = 1.25;

export interface RigMood {
  /** Wander, viewBox units, and sway, degrees. */
  drift: number;
  sway: number;
  /** The wander's pace: 1 is the watching pace. */
  pace: number;
  /** How far the body leans toward the pointer, units; 0 doesn't lean. */
  lean: number;
  /** How much bigger at the top of a breath (0.03 = 3%), and seconds per breath. */
  breath: number;
  breathPeriod: number;
  /** 1 open, 0.52 drowsy, 0.06 asleep. */
  lids: number;
  /** Follow the pointer and glance round when it's still; rest at `rest`; or let the caller steer. */
  look: "follow" | "rest" | "held";
  /** Where resting eyes settle, in units of TRAVEL. */
  rest?: readonly [number, number];
  /** Seconds between blinks, or null to never blink. */
  blink: readonly [number, number] | null;
}

export interface RigEls {
  /** The creature's box: where the pointer is measured from. */
  wrap: HTMLElement;
  drift: SVGGElement;
  breath: SVGGElement;
  lids: SVGGElement;
  pupils: SVGGElement;
}

export interface Rig {
  /** Head for a new mood from wherever the creature is. */
  set(mood: RigMood): void;
  /** Point the eyes (units of TRAVEL) when the mood's look is "held". */
  look(x: number, y: number): void;
  /** One blink now (and sometimes two). */
  blink(twice?: boolean): void;
  /** A little hop, or two: it's pleased. */
  hop(times?: number): void;
  /** A quick side-to-side: something's wrong. */
  shake(): void;
  destroy(): void;
}

/* --- the shared pointer ------------------------------------------------- */

const pointer = { x: 0, y: 0, at: -Infinity };
const live = new Set<{ measure(): void }>();
let stale = true;

const moved = (e: PointerEvent) => {
  pointer.x = e.clientX;
  pointer.y = e.clientY;
  pointer.at = performance.now();
  stale = true;
};
const shifted = () => {
  stale = true;
};
/** Runs first on every tick: all the reads, before any creature writes. */
const measureAll = () => {
  if (!stale) return;
  stale = false;
  for (const r of live) r.measure();
};

function join(r: { measure(): void }) {
  if (live.size === 0) {
    window.addEventListener("pointermove", moved, { passive: true });
    window.addEventListener("scroll", shifted, { passive: true, capture: true });
    window.addEventListener("resize", shifted);
    gsap.ticker.add(measureAll, false, true);
  }
  live.add(r);
  stale = true;
}

function leave(r: { measure(): void }) {
  live.delete(r);
  if (live.size > 0) return;
  window.removeEventListener("pointermove", moved);
  window.removeEventListener("scroll", shifted, { capture: true });
  window.removeEventListener("resize", shifted);
  gsap.ticker.remove(measureAll);
}

/* --- the rig ------------------------------------------------------------- */

const SETTLE: SpringConfig = { duration: 0.9, bounce: 0 };
const EYES: SpringConfig = { duration: 0.22, bounce: 0.08 };
const LEAN: SpringConfig = { duration: 1.1, bounce: 0 };
const LIDS: SpringConfig = { duration: 0.8, bounce: 0 };
const PERK: SpringConfig = { duration: 0.34, bounce: 0.35 };
const JOLT: SpringConfig = { duration: 0.16, bounce: 0.2 };
/** The pointer counts as present this long after it last moved, ms. */
const PRESENT = 2200;

/** Slow sines, in radians per second at pace 1: periods of 7–13 s, none a multiple of another. */
const WANDER = [0.83, 0.53, 0.71, 0.47, 0.61, 0.89] as const;

export function createRig(
  els: RigEls,
  opts: {
    /** The body's low centre: the breath and sway pivot. */
    origin: readonly [number, number];
    /** The eyes' centre: the blink pivot. */
    eye: readonly [number, number];
    mood: RigMood;
  },
): Rig {
  let mood = opts.mood;
  const [ox, oy] = opts.origin;
  const [, ey] = opts.eye;
  const spring = (v: number, cfg = SETTLE) => createSpring(v, cfg, () => undefined);

  const s = {
    drift: spring(mood.drift),
    sway: spring(mood.sway),
    pace: spring(mood.pace),
    breath: spring(mood.breath),
    breathPeriod: spring(mood.breathPeriod),
    lids: spring(mood.lids, LIDS),
    leanX: spring(0, LEAN),
    leanY: spring(0, LEAN),
    px: spring((mood.rest?.[0] ?? 0) * TRAVEL, EYES),
    py: spring((mood.rest?.[1] ?? 0) * TRAVEL, EYES),
    perk: spring(0, PERK),
    jolt: spring(0, JOLT),
  } satisfies Record<string, Spring>;
  const blinkLid = { v: 1 };

  // Start the wander somewhere different for each creature, so two never move in step.
  const phase = WANDER.map(() => Math.random() * Math.PI * 2);
  let breathPhase = Math.random() * Math.PI * 2;

  let rect: DOMRect | null = null;
  let visible = true;
  const self = {
    measure() {
      if (visible) rect = els.wrap.getBoundingClientRect();
    },
  };
  join(self);

  const seen = new IntersectionObserver(([entry]) => {
    visible = entry?.isIntersecting ?? true;
    if (visible) stale = true;
  });
  seen.observe(els.wrap);

  /* Eyes: follow the pointer, or glance round on their own when it's still. */
  let glance: gsap.core.Tween | null = null;
  const glanceSoon = () => {
    glance?.kill();
    glance = gsap.delayedCall(gsap.utils.random(1.6, 3.2), () => {
      if (mood.look === "follow" && performance.now() - pointer.at > PRESENT) {
        s.px.to(gsap.utils.random(-0.7, 0.7) * TRAVEL);
        s.py.to(gsap.utils.random(-0.3, 0.5) * TRAVEL);
      }
      glanceSoon();
    });
  };
  glanceSoon();

  /* Blinks: now and then, with the occasional double. */
  let blinking: gsap.core.Timeline | null = null;
  let nextBlink: gsap.core.Tween | null = null;
  const blink = (twice = Math.random() < 0.2) => {
    blinking?.kill();
    blinking = gsap.timeline();
    for (let i = 0; i < (twice ? 2 : 1); i++) {
      blinking
        .to(blinkLid, { v: 0.08, duration: 0.06, ease: "power2.in" })
        .to(blinkLid, { v: 1, duration: 0.1, ease: "power2.out" });
    }
  };
  const blinkSoon = () => {
    nextBlink?.kill();
    if (!mood.blink) return;
    nextBlink = gsap.delayedCall(gsap.utils.random(mood.blink[0], mood.blink[1]), () => {
      blink();
      blinkSoon();
    });
  };
  blinkSoon();

  const tick = (_time: number, deltaMs: number) => {
    if (!visible) return;
    const dt = Math.min(deltaMs, 64) / 1000;
    const pace = s.pace.value;
    for (let k = 0; k < phase.length; k++) phase[k]! += WANDER[k]! * pace * dt;
    breathPhase += ((Math.PI * 2) / Math.max(0.5, s.breathPeriod.value)) * dt;

    // Where the pointer is, relative to the creature (a unit circle round its eyes).
    const present = rect !== null && performance.now() - pointer.at < PRESENT;
    let nx = 0;
    let ny = 0;
    if (present && rect) {
      nx = (pointer.x - (rect.left + rect.width / 2)) / (rect.width / 2);
      ny = (pointer.y - (rect.top + rect.height * 0.44)) / (rect.height / 2);
      const m = Math.hypot(nx, ny);
      if (m > 1) {
        nx /= m;
        ny /= m;
      }
    }
    if (mood.look === "follow" && present) {
      s.px.to(nx * TRAVEL);
      s.py.to(ny * TRAVEL * 0.8);
    }
    const lean = present ? mood.lean : 0;
    s.leanX.to(nx * lean);
    s.leanY.to(ny * lean * 0.5);

    const a = s.drift.value;
    const r = s.sway.value;
    const x = a * (0.6 * Math.sin(phase[0]!) + 0.4 * Math.sin(phase[1]! + 1.3)) + s.leanX.value + s.jolt.value;
    const y = a * (0.55 * Math.sin(phase[2]!) + 0.45 * Math.sin(phase[3]! + 0.7)) + s.leanY.value + s.perk.value;
    const rot = r * (0.6 * Math.sin(phase[4]!) + 0.4 * Math.sin(phase[5]! + 2.1)) + s.leanX.value * 0.6;
    els.drift.setAttribute("transform", `translate(${x.toFixed(3)} ${y.toFixed(3)}) rotate(${rot.toFixed(3)} ${ox} ${oy})`);

    const b = 1 + s.breath.value * (0.5 - 0.5 * Math.cos(breathPhase));
    els.breath.setAttribute("transform", `translate(${ox} ${oy}) scale(${b.toFixed(4)}) translate(${-ox} ${-oy})`);

    // Heavy lids also sit a little lower, the way a sleepy face droops.
    const lid = Math.max(0.02, s.lids.value * blinkLid.v);
    const droop = Math.max(0, (0.52 - s.lids.value) / 0.46) * 1.4;
    els.lids.setAttribute("transform", `translate(0 ${(ey + droop).toFixed(3)}) scale(1 ${lid.toFixed(4)}) translate(0 ${-ey})`);
    els.pupils.setAttribute("transform", `translate(${s.px.value.toFixed(3)} ${s.py.value.toFixed(3)})`);
  };
  gsap.ticker.add(tick);

  const rig: Rig = {
    set(next) {
      const waking = next.lids > mood.lids + 0.3;
      mood = next;
      s.drift.to(next.drift);
      s.sway.to(next.sway);
      s.pace.to(next.pace);
      s.breath.to(next.breath);
      s.breathPeriod.to(next.breathPeriod);
      s.lids.to(next.lids);
      if (next.look === "rest") {
        s.px.to((next.rest?.[0] ?? 0) * TRAVEL);
        s.py.to((next.rest?.[1] ?? 0) * TRAVEL);
      }
      if (waking) {
        // Waking up: a small perk, and a double blink once the lids are open.
        s.perk.to(-1.1);
        gsap.delayedCall(0.14, () => s.perk.to(0));
        gsap.delayedCall(0.45, () => blink(true));
      }
      blinkSoon();
    },
    look(x, y) {
      s.px.to(x * TRAVEL);
      s.py.to(y * TRAVEL);
    },
    blink,
    hop(times = 2) {
      for (let i = 0; i < times; i++) {
        gsap.delayedCall(i * 0.36, () => s.perk.to(-3.2));
        gsap.delayedCall(i * 0.36 + 0.15, () => s.perk.to(0));
      }
    },
    shake() {
      [1.4, -1.4, 1, -0.8, 0].forEach((to, i) => gsap.delayedCall(i * 0.07, () => s.jolt.to(to)));
    },
    destroy() {
      gsap.ticker.remove(tick);
      seen.disconnect();
      leave(self);
      glance?.kill();
      nextBlink?.kill();
      blinking?.kill();
      Object.values(s).forEach((sp) => sp.stop());
    },
  };
  return rig;
}

/** The one frame reduced motion shows: lids at the mood, eyes at rest, nothing moving. */
export function stillPose(els: Omit<RigEls, "wrap">, opts: { eye: readonly [number, number]; mood: RigMood }) {
  const [, ey] = opts.eye;
  const lids = opts.mood.lids;
  const droop = Math.max(0, (0.52 - lids) / 0.46) * 1.4;
  els.drift.removeAttribute("transform");
  els.breath.removeAttribute("transform");
  els.lids.setAttribute("transform", `translate(0 ${ey + droop}) scale(1 ${lids}) translate(0 ${-ey})`);
  const [rx, ry] = opts.mood.look === "rest" ? (opts.mood.rest ?? [0, 0]) : [0, 0];
  els.pupils.setAttribute("transform", `translate(${rx * TRAVEL} ${ry * TRAVEL})`);
}
