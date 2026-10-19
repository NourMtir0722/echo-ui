"use client";

/**
 * Headlines and stages rise into place the first time they scroll into view.
 *
 * Only what starts below the fold is hidden, and only once this has run with
 * motion allowed: without JavaScript, under reduced motion, or already on
 * screen at load, everything is simply there. The styles are in home.css
 * (`[data-reveal]`); this only moves the attribute: `out` → `in` as it comes
 * into view, then `done` when it has risen, which takes the clip off.
 */
import { useEffect } from "react";
import { whenNear } from "./near";

export function useReveal() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const stops: (() => void)[] = [];
    for (const el of document.querySelectorAll<HTMLElement>("[data-reveal]")) {
      if (el.getBoundingClientRect().top < window.innerHeight) continue;
      el.dataset.reveal = "out";
      const done = (e: TransitionEvent) => {
        if (e.target !== el || e.propertyName !== "clip-path") return;
        el.dataset.reveal = "done";
        el.removeEventListener("transitionend", done);
      };
      // Risen once its top is an eighth of the window inside it.
      stops.push(
        whenNear(el, -window.innerHeight * 0.12, () => {
          el.addEventListener("transitionend", done);
          el.dataset.reveal = "in";
        }),
      );
    }
    return () => stops.forEach((stop) => stop());
  }, []);
}
