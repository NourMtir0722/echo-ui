"use client";

/**
 * A timeline that follows the scroll: it plays forwards as its element comes
 * up the window and backwards as it goes down again, so a piece that builds
 * as you arrive comes apart as you leave.
 *
 * It runs on the homepage's one frame (frame.ts), after the smooth scroll has
 * moved the page, so there is no second loop and nothing lags the page by a
 * frame. It's fast by rule: the whole timeline plays while the element's top
 * travels from `start` to `end` of the window's height (85% to 45% by
 * default, about 40% of a screen), so an ordinary flick finishes it.
 *
 * Under reduced motion, and before this runs (no JavaScript), the timeline is
 * at its end: everything is simply built.
 */
import { useEffect, useRef, type RefObject } from "react";
import gsap from "gsap";
import { onFrame } from "./frame";

export interface ScrubOptions {
  /** Where the element's top is, as a fraction of the window's height, when the timeline starts. */
  start?: number;
  /** …and when it ends. */
  end?: number;
  /** Measure this element instead of the one the timeline animates. */
  trigger?: RefObject<HTMLElement | null>;
  /** Called with the progress whenever it changes (0..1). */
  onProgress?: (p: number) => void;
}

export function useScrub<T extends HTMLElement>(
  ref: RefObject<T | null>,
  build: (tl: gsap.core.Timeline, el: T) => void,
  { start = 0.85, end = 0.45, trigger, onProgress }: ScrubOptions = {},
  deps: readonly unknown[] = [],
) {
  const cb = useRef(onProgress);
  cb.current = onProgress;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const tl = gsap.timeline({ paused: true, defaults: { ease: "none" } });
    const ctx = gsap.context(() => build(tl, el), el);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      tl.progress(1);
      cb.current?.(1);
      return () => ctx.revert();
    }
    let last = -1;
    const tick = () => {
      const r = (trigger?.current ?? el).getBoundingClientRect();
      const vh = window.innerHeight;
      const p = Math.min(1, Math.max(0, (vh * start - r.top) / (vh * (start - end))));
      if (Math.abs(p - last) < 0.0005) return;
      last = p;
      tl.progress(p);
      cb.current?.(p);
    };
    tick();
    const off = onFrame(tick);
    return () => {
      off();
      ctx.revert();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
