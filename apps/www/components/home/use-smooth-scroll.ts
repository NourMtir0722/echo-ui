"use client";

/**
 * The homepage scrolls smoothly (Lenis): a wheel or trackpad eases the page
 * to where it's going instead of stepping, which is what lets Echo glide
 * along with it.
 *
 * Only the wheel and trackpad are smoothed. Keys, the scrollbar, find in
 * page and focus all scroll the page natively, and so does anything inside
 * a scrolling box of its own (a code block, the framed screen). Under reduced
 * motion there is no Lenis at all.
 *
 * While it glides, Lenis ignores any scroll it didn't make and carries on to
 * its own target, so a Home key, a Tab to a link below or a script's
 * scrollTo in the second after a flick of the wheel would be pulled back.
 * So the glide ends the moment a key that scrolls is pressed (in WebKit the
 * glide's next step would cancel the key's scroll before it began), and
 * whenever the page turns out to be somewhere Lenis didn't put it.
 *
 * Among the things meant to be seen whole (the road's stops, the motion
 * panel, the screen frame, the close: `data-snap`), the wheel steps: a push
 * glides to the next one and no further, leaving at once and settling softly,
 * and a trackpad's momentum after it is spent, not scrolled. A new push moves
 * on again, even one made while that momentum is still arriving (snap.ts
 * `newPush`), and one made as a glide arrives goes on to the stop after it.
 * A stop that's still playing holds a push onward (snap.ts `holding`), and
 * the push hurries it instead: its pause key pulses, the rest of its demo
 * plays fast (DemoCard's HURRY_EVENT), and when it has ended the page goes on
 * by itself, as the push asked. So a card takes two pushes, one to come and
 * one to go, and every step of it is seen. Pausing it, a key, or a push back
 * up while it hurries keeps the page where it is. A card seen through never
 * holds again. Back up is always free. Far from any stop the wheel scrolls
 * freely. A glide that brings one within reach carries on to it at its own
 * speed if it's going fast enough to get there, and otherwise comes to rest:
 * the page never stops and sets off again by itself. When the wheel lets go
 * near a stop, the page carries on to it and frames it, the way a scroll-snap
 * tween moves from one point to the next.
 *
 * Where the scroll plays a scene between two stops (the ChatGPT moment), the
 * step glides at the scene's pace (`data-snap-glide`), so the scene is where
 * the page is, and turns back the moment the page does. A push back is never
 * kept waiting, even in the first part of a glide.
 *
 * Glides run on the page's own frames (snap.ts `steadyClock`): after a frame
 * that ran long (a first WebGL frame, a stall), a glide goes on from where it
 * was instead of jumping by the whole stall, and the wheel is still only once
 * the page has been there to see it still.
 */
import { useEffect } from "react";
import "lenis/dist/lenis.css";
import { onFrame } from "./frame";
import { carry, frameFor, glideFor, holding, HURRY_EVENT, isFramed, IN_VIEW, newPush, nextStop, reaim, steadyClock, stopFor, topInset, wheelRun } from "./snap";

const SCROLL_KEYS = new Set(["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "]);
/** How long the wheel has to be still (a trackpad's own momentum included) before the page looks for a stop, ms. */
const LET_GO = 140;
/** A step leaves at this speed (snap.ts `carry`): at once, the page answering the push, and settles softly. */
const LAUNCH = 3;
/** Nothing interrupts a step's glide for this share of it; a push after that goes on from the stop it's reaching. */
const LOCK = 0.45;
/** A free glide handed on to a stop takes at most this long, s… */
const HAND_ON = 1.4;
/** …and is handed on only going at least this fast (snap.ts `carry`): slower, it would have to set off again. */
const CARRIES = 0.9;
/** A hurried card has ended: the page goes on at this launch speed (snap.ts `carry`), the push it answers long since made. */
const GOES_ON = 1.5;
/**
 * A step through a scene the scroll plays (snap.ts `glideFor`) leaves at this speed: at once, answering the
 * push, but never faster than the scene can be played, so the scene is where the page is all the way.
 */
const SCENE_LAUNCH = 0.8;

export function useSmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let gone = false;
    let stop = () => {};
    void import("lenis").then(({ default: Lenis }) => {
      if (gone) return;
      // The wheel let go: frame the stop it came to rest near, if there is one (never after a key).
      let settle = 0;
      // Where the push being made began (null between pushes).
      let from: number | null = null;
      // The last step: the stop it went to, where that frames, and when its glide ends and stops being locked (`steady`, ms).
      let stepEl: HTMLElement | null = null;
      let stepTo = 0;
      let glideEnd = 0;
      let lockUntil = 0;
      // Which way the last step went.
      let stepDir = 0;
      // A new push made while the glide was locked: it goes once the lock is over.
      let queued = false;
      // The wheel's momentum after a step or a hold, being spent until a new push.
      let spending = false;
      // The playing stop a push onward has hurried: once its demo has ended, the page goes on (`goOn`).
      let hurried: HTMLElement | null = null;
      // How fast the page is moving, px a second (from the frames).
      let speed = 0;
      const run = wheelRun();
      // The page's own time, ms: it runs with the frames, a stalled one counting as one. Glides and their locks
      // are timed on it, and so is how long the page has seen the wheel still.
      const clock = steadyClock();
      let steady = 0;
      let wheelAt = 0;
      /** The playing stop says why the page didn't move: its pause key pulses (journey.css). */
      const nudge = (el: HTMLElement) => {
        el.removeAttribute("data-nudged");
        void el.offsetWidth;
        el.setAttribute("data-nudged", "");
        window.setTimeout(() => el.removeAttribute("data-nudged"), 900);
      };
      const step = (data: { deltaY: number; event: WheelEvent | TouchEvent | KeyboardEvent }) => {
        const { deltaY, event } = data;
        if (!event.type.includes("wheel") || (event as WheelEvent).ctrlKey) return true;
        const now = steady;
        // When the wheel moved, not when the page got to it: after a stall (a first WebGL frame, say) a swipe's
        // momentum arrives all at once, and read by the clock it would look like a new push. (Safari stamps it when
        // the page gets to it, so the page's own frames say whether it was still: `seen`.)
        const moved = event.timeStamp > 0 && event.timeStamp < 1e11 ? event.timeStamp : performance.now();
        const seen = steady - wheelAt;
        wheelAt = steady;
        const fresh = newPush(run, moved, deltaY, seen);
        const spend = () => {
          if (event.cancelable) event.preventDefault();
          return false;
        };
        const dir = Math.sign(deltaY);
        // The lock keeps a push's own momentum from going on past its stop; a push back is never kept waiting.
        if (now < lockUntil && !(fresh && dir === -stepDir)) {
          if (fresh) queued = true;
          return spend();
        }
        if (spending && !fresh && !queued) return spend();
        // A push of the visitor's own, or only the momentum of a glide that's under way.
        const push = fresh || queued;
        spending = false;
        queued = false;
        if (!dir) return true;
        // Back up, the page never waits on a hurried card.
        if (dir < 0) hurried = null;
        const gliding = now < glideEnd;
        // A stop still playing holds a push going on, and plays the rest fast instead; the page goes on when it ends.
        const held = dir > 0 ? holding(gliding ? stepEl : null) : null;
        if (held) {
          if (push && hurried !== held) {
            hurried = held;
            nudge(held);
            held.dispatchEvent(new Event(HURRY_EVENT));
          }
          spending = true;
          return spend();
        }
        const next = nextStop(window.scrollY, dir, gliding ? stepTo : window.scrollY);
        // No stop near: the wheel scrolls freely (and settles near one when it lets go: `land`).
        if (next === null) return true;
        const d = Math.abs(next.at - lenis.animatedScroll);
        // Through a scene the scroll plays, the step glides at the scene's pace (its share of the passage).
        const scene = glideFor(next.el, dir);
        if (scene !== null) {
          go(next, now, scene.s * Math.min(1.2, Math.max(0.35, d / Math.max(1, scene.length))), SCENE_LAUNCH);
          return spend();
        }
        let duration = Math.min(1, Math.max(0.55, d / 900));
        let launch = LAUNCH;
        if (!push) {
          // A free glide has brought a stop within reach: it carries on to it at its own speed, as one movement,
          // if it's going fast enough to get there; slower, it comes to rest where it was going, and never sets
          // off again by itself (`land` frames a stop only if the glide ends near it).
          const toward = speed * Math.sign(next.at - lenis.animatedScroll);
          duration = Math.min(HAND_ON, Math.max(0.45, d / Math.max(850, toward / 2)));
          launch = (toward * duration) / d;
          if (launch < CARRIES) return true;
        }
        go(next, now, duration, launch);
        return spend();
      };
      /** Glide to a stop, as one step: locked for its first part, the wheel's momentum spent after it. */
      const go = (next: { at: number; el: HTMLElement }, now: number, duration: number, launch: number) => {
        window.clearTimeout(settle);
        from = null;
        hurried = null;
        stepEl = next.el;
        stepTo = next.at;
        stepDir = Math.sign(next.at - lenis.animatedScroll);
        glideEnd = now + duration * 1000;
        lockUntil = now + duration * 1000 * LOCK;
        spending = true;
        lenis.scrollTo(next.at, { duration, easing: carry(launch) });
      };
      /**
       * A hurried card has played to its end: the page goes on to the next stop, as the push that hurried it
       * asked. Paused, or left meanwhile, it stays.
       */
      const goOn = (now: number) => {
        const el = hurried;
        if (!el || el.dataset.phase === "playing" || el.dataset.phase === "waiting") return;
        hurried = null;
        if (el.dataset.phase !== "done" || !isFramed(el.getBoundingClientRect(), topInset(), IN_VIEW)) return;
        const next = nextStop(window.scrollY, 1);
        if (!next) return;
        go(next, now, Math.min(1, Math.max(0.55, Math.abs(next.at - lenis.animatedScroll) / 900)), GOES_ON);
      };
      const lenis = new Lenis({ autoRaf: false, anchors: true, allowNestedScroll: true, lerp: 0.11, virtualScroll: step });
      // Not in Lenis's types, but it's the one call that drops a glide without scrolling.
      const drop = (lenis as unknown as { reset?: () => void }).reset?.bind(lenis) ?? (() => lenis.resize());
      const yieldTo = () => {
        if (lenis.isSmooth && Math.abs(window.scrollY - lenis.animatedScroll) > 1.5) drop();
      };
      const onKey = (e: KeyboardEvent) => {
        if (!SCROLL_KEYS.has(e.key)) return;
        window.clearTimeout(settle);
        from = null;
        // A key always moves the page: no step or hold of the wheel's stands in its way.
        glideEnd = lockUntil = 0;
        spending = queued = false;
        hurried = null;
        if (lenis.isSmooth) drop();
      };
      const land = () => {
        const begun = from;
        from = null;
        if (begun === null || lenis.isStopped || lenis.isLocked) return;
        const going = lenis.targetScroll;
        const at = stopFor(window.scrollY, begun, going);
        if (at === null || Math.abs(at - going) < 2) return;
        // Carry the glide on to the stop at the speed it's going: one movement, never a stop and a second start.
        const d = at - lenis.animatedScroll;
        if (Math.abs(d) < 1) return;
        const toward = speed * Math.sign(d) > 0 ? Math.abs(speed) : 0;
        const duration = Math.min(1, Math.max(0.45, Math.abs(d) / Math.max(850, toward / 2)));
        lenis.scrollTo(at, { duration, easing: carry((speed * duration) / d) });
      };
      const offWheel = lenis.on("virtual-scroll", ({ event }) => {
        window.clearTimeout(settle);
        if (!event.type.includes("wheel") || (event as WheelEvent).ctrlKey) {
          from = null;
          return;
        }
        // Where this push began: the stop it leaves.
        from ??= lenis.targetScroll;
        settle = window.setTimeout(land, LET_GO);
      });
      window.addEventListener("scroll", yieldTo, { passive: true });
      window.addEventListener("keydown", onKey, { capture: true });
      let lastY = 0;
      let lastAt = 0;
      const off = onFrame((now) => {
        steady = clock(now);
        // A step's stop that moves under its glide (the page's layout changing: Pick's worn style coming off) is
        // still where it lands, the glide carried on to it at the speed it's going.
        if (stepEl?.isConnected && steady < glideEnd) {
          const left = (glideEnd - steady) / 1000;
          const aim = reaim(stepTo, frameFor(stepEl, window.scrollY), lenis.animatedScroll, speed, left);
          if (aim) {
            stepTo = aim.to;
            lenis.scrollTo(aim.to, { duration: left, easing: carry(aim.launch) });
          }
        }
        lenis.raf(steady);
        if (hurried) goOn(steady);
        const y = lenis.animatedScroll;
        if (lastAt && steady > lastAt) speed = (speed + ((y - lastY) / (steady - lastAt)) * 1000) / 2;
        lastY = y;
        lastAt = steady;
      }, "scroll");
      stop = () => {
        off();
        offWheel();
        window.clearTimeout(settle);
        window.removeEventListener("scroll", yieldTo);
        window.removeEventListener("keydown", onKey, { capture: true });
        lenis.destroy();
      };
    });
    return () => {
      gone = true;
      stop();
    };
  }, []);
}
