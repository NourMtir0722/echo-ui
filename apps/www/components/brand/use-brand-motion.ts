"use client";

/**
 * GSAP for the brand art, scoped and reverted.
 *
 * Every tween the effect creates is recorded in a gsap.context and killed on
 * unmount or dependency change — the creature runs infinite loops (breath,
 * wander, blinks), and a route change that left them running would animate
 * detached nodes forever. The effect may return its own cleanup for listeners.
 *
 * `reduced` is read once per run: every brand animation has a single composed
 * still frame for prefers-reduced-motion, and the effect decides what it is.
 */
import { useEffect, type DependencyList, type RefObject } from "react";
import gsap from "gsap";

export function useBrandMotion(
  scope: RefObject<Element | null>,
  effect: (ctx: { reduced: boolean }) => void | (() => void),
  deps: DependencyList,
) {
  useEffect(() => {
    if (!scope.current) return;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    let cleanup: void | (() => void);
    const ctx = gsap.context(() => {
      cleanup = effect({ reduced });
    }, scope.current);
    return () => {
      cleanup?.();
      ctx.revert();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
