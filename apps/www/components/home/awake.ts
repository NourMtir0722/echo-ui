"use client";

/**
 * Calm, as a rule: of a set of demos, only the one nearest the middle of the
 * window is awake. The rest rest, dimmed, until a pointer or the keyboard
 * wakes one. Measured on the homepage's one frame (frame.ts), and only while
 * the set is near the window.
 */
import { useEffect, useState, type RefObject } from "react";
import { onFrame } from "./frame";

export function useAwake(root: RefObject<HTMLElement | null>, items: string) {
  const [middle, setMiddle] = useState(0);
  const [pointed, setPointed] = useState<number | null>(null);
  const [focused, setFocused] = useState<number | null>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    let last = -1;
    return onFrame(() => {
      const r = el.getBoundingClientRect();
      if (r.bottom < -200 || r.top > window.innerHeight + 200) return;
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      let best = 0;
      let bestD = Infinity;
      el.querySelectorAll<HTMLElement>(items).forEach((item, i) => {
        const b = item.getBoundingClientRect();
        // Mostly how far from the middle line; a little how far across, for a grid.
        const d = Math.abs(b.top + b.height / 2 - cy) + 0.25 * Math.abs(b.left + b.width / 2 - cx);
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      });
      if (best !== last) {
        last = best;
        setMiddle(best);
      }
    });
  }, [root, items]);

  const awake = pointed ?? focused ?? middle;
  /** Spread on item `i`: a pointer or focus on it wakes it. */
  const wake = (i: number) => ({
    "data-awake": awake === i ? "" : undefined,
    onPointerEnter: (e: React.PointerEvent) => e.pointerType === "mouse" && setPointed(i),
    onPointerLeave: () => setPointed((p) => (p === i ? null : p)),
    onFocus: () => setFocused(i),
    onBlur: (e: React.FocusEvent) => {
      if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused((f) => (f === i ? null : f));
    },
  });
  return { awake, wake };
}
