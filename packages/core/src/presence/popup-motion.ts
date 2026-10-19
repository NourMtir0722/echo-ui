"use client";

/**
 * Motion for any Base UI popup, however its open state is owned.
 *
 * useGsapPresence owns the open state so it can hold the node for an exit.
 * A component whose users control `open` themselves cannot hand that over,
 * so this does the same job from the element alone: the enter plays when the
 * popup mounts, and the exit plays the moment Base UI marks it
 * `data-ending-style`. Base UI waits for the element's running animations
 * before it unmounts, so a placeholder animation as long as the exit keeps
 * the node there until GSAP has finished.
 *
 *   const motion = usePopupMotion(liquidBloom);
 *   <AlertDialog.Popup ref={motion} … />
 *
 * Under reduced motion it does nothing, and the component's CSS fade stands.
 */
import { useCallback, useRef, type RefCallback } from "react";
import gsap from "gsap";
import { motion } from "../motion/motion";
import type { PresenceAnimation } from "./use-gsap-presence";

export function usePopupMotion<T extends HTMLElement = HTMLElement>(
  animation: PresenceAnimation,
  /** Longest the exit can take, ms: how long the node is held for it. */
  exitMs = 420,
): RefCallback<T> {
  const stop = useRef<(() => void) | null>(null);
  return useCallback<RefCallback<T>>(
    (el) => {
      stop.current?.();
      stop.current = null;
      if (!el) return;
      if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
      el.setAttribute("data-motion", "");
      animation.enter(el, { trigger: null });
      let leaving = false;
      const watch = new MutationObserver(() => {
        if (leaving || !el.hasAttribute("data-ending-style")) return;
        leaving = true;
        const hold = el.animate([{ visibility: "visible" }, { visibility: "visible" }], { duration: exitMs });
        animation.exit(el, () => hold.finish(), { trigger: null });
      });
      watch.observe(el, { attributes: true, attributeFilter: ["data-ending-style"] });
      stop.current = () => {
        watch.disconnect();
        gsap.killTweensOf(el);
        gsap.killTweensOf(el.children);
      };
    },
    [animation, exitMs],
  );
}

/* ------------------------------------------------------------ liquid bloom */

const seconds = (name: keyof typeof motion) => ((motion[name] as { duration?: number }).duration ?? 300) / 1000;
const PILL = { width: 150, height: 46 };

/** The clip that shows only a centred pill of the panel. */
function pill(el: HTMLElement) {
  const r = el.getBoundingClientRect();
  const w = Math.min(PILL.width, r.width);
  return {
    ix: (r.width - w) / 2,
    iy: Math.max(0, (r.height - PILL.height) / 2),
    round: PILL.height / 2,
  };
}

/**
 * Liquid bloom — how a centred panel arrives. It starts as a small pill in
 * the middle of the room and swells into itself on a spring, wider first and
 * then taller, a drop spreading rather than a box scaling; its contents
 * surface once it is open. Closing gathers it back into the pill.
 */
export const liquidBloom: PresenceAnimation = {
  enter(el) {
    const contents = [...el.children];
    const radius = parseFloat(getComputedStyle(el).borderTopLeftRadius) || 20;
    const { ix, iy, round } = pill(el);
    const island = { duration: seconds("island"), ease: motion.island.ease };
    const spread = { duration: seconds("summon"), ease: "power3.out" };
    // The clip is drawn from plain numbers every frame. Tweening the clip-path
    // string directly goes wrong: the browser shortens an inset whose sides
    // match, and the two ends of the tween stop lining up.
    const clip = { x: ix, y: iy, r: round };
    const draw = () => {
      el.style.clipPath = `inset(${clip.y}px ${clip.x}px ${clip.y}px ${clip.x}px round ${clip.r}px)`;
    };
    // Clip only — no transform — so a popup centred by its own CSS transform
    // stays centred on any window size.
    gsap.set(el, { opacity: 1 });
    draw();
    gsap.set(contents, { opacity: 0, scale: 0.97 });
    // Play from the first painted frame, so a slow mount cannot eat the start.
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        gsap
          .timeline({ onUpdate: draw, onComplete: () => gsap.set(el, { clearProps: "clipPath" }) })
          .to(clip, { x: 0, ...spread })
          .to(clip, { y: 0, r: radius, ...island }, "-=0.12");
        gsap.to(contents, {
          opacity: 1,
          scale: 1,
          duration: seconds("summon"),
          ease: motion.summon.ease,
          stagger: 0.04,
          delay: island.duration * 0.63,
          clearProps: "opacity,scale",
        });
      }),
    );
  },
  exit(el, done) {
    const { ix, iy, round } = pill(el);
    const radius = parseFloat(getComputedStyle(el).borderTopLeftRadius) || 20;
    const clip = { x: 0, y: 0, r: radius };
    gsap.to([...el.children], { opacity: 0, duration: seconds("follow"), ease: motion.follow.ease });
    gsap.to(clip, {
      x: ix,
      y: iy,
      r: round,
      duration: seconds("summon"),
      ease: "power3.in",
      delay: 0.05,
      onUpdate: () => {
        el.style.clipPath = `inset(${clip.y}px ${clip.x}px ${clip.y}px ${clip.x}px round ${clip.r}px)`;
      },
    });
    // It fades as it gathers, gone by the time it is a pill.
    gsap.to(el, { opacity: 0, duration: seconds("summon"), delay: 0.05, ease: "power2.in", onComplete: done });
  },
};
