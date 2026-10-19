"use client";

/**
 * useBudOff. A drop of the primary plastic buds out of one element, flies to
 * another and is swallowed by it, which swells as it lands — so the eye
 * follows cause to effect: add to bag → the count, lap → the lap count.
 *
 *   const budOff = useBudOff();
 *   budOff(buttonEl, badgeEl, { onArrive: () => setShown((n) => n + 1) });
 *
 * It returns a function that calls the drop off: it's gone, and `onArrive`
 * never runs — for when what it was flying to is reset first.
 *
 * The drop is drawn over the page for its half-second and then removed; it is
 * decoration (aria-hidden), so whatever it means has to be said by what it
 * lands in. Its front leads and its tail lags, so it draws out on its own
 * rather than being a dot on a path. Under reduced motion there is no drop:
 * `onArrive` runs at once.
 */
import { useCallback, useEffect, useRef } from "react";
import { createSpring, type Spring } from "echo-ui-core/tactile";
import { useSoundOptional } from "echo-ui-core/sound";
import type { SoundRecipe } from "echo-ui-core/sound";
import "./bud-off.css";

export interface BudOffOptions {
  /** When the drop lands: update what it landed in here. */
  onArrive?: () => void;
  /** The drop's radius, px. Default 10. */
  size?: number;
}

/** Sends a drop; the function it returns calls the drop off before it lands. */
export type BudOff = (from: Element, to: Element, options?: BudOffOptions) => () => void;

/** A drop landing: quiet, and only inside a SoundProvider. */
const GULP: SoundRecipe = { wave: "sine", freq: 520, decay: 0.07, gain: 0.07, bend: -220 };

const reducedMotion = () =>
  typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

const centre = (r: DOMRect) => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 });

export function useBudOff(): BudOff {
  const sound = useSoundOptional();
  const play = useRef(sound?.play);
  play.current = sound?.play;
  const live = useRef(new Set<() => void>());

  useEffect(() => {
    const flights = live.current;
    return () => flights.forEach((stop) => stop());
  }, []);

  return useCallback<BudOff>((from, to, options = {}) => {
    const { onArrive, size = 10 } = options;
    if (reducedMotion() || typeof document === "undefined") {
      onArrive?.();
      return () => undefined;
    }
    // It leaves from the point of `from` nearest `to`, kept inside it.
    const a = from.getBoundingClientRect();
    const target = () => centre(to.getBoundingClientRect());
    const t0 = target();
    const start = {
      x: Math.min(Math.max(t0.x, a.left + size * 1.6), a.right - size * 1.6),
      y: Math.min(Math.max(t0.y, a.top + size), a.bottom - size),
    };

    const drop = document.createElement("span");
    drop.className = "echo-bud-off";
    drop.setAttribute("aria-hidden", "true");
    drop.style.left = "0";
    drop.style.top = "0";
    document.body.append(drop);

    const springs: Spring[] = [];
    const draw = () => {
      // Head and tail run along the line to wherever `to` is now.
      const t = target();
      const dx = t.x - start.x;
      const dy = t.y - start.y;
      const hx = start.x + dx * head.value;
      const hy = start.y + dy * head.value;
      const tx = start.x + dx * tail.value;
      const ty = start.y + dy * tail.value;
      const r = Math.max(0, radius.value);
      const len = Math.hypot(hx - tx, hy - ty);
      const angle = Math.atan2(hy - ty, hx - tx);
      drop.style.width = `${(len + 2 * r).toFixed(2)}px`;
      drop.style.height = `${(2 * r).toFixed(2)}px`;
      drop.style.borderRadius = `${r.toFixed(2)}px`;
      drop.style.transform = `translate(${(tx - r).toFixed(2)}px, ${(ty - r).toFixed(2)}px) rotate(${angle.toFixed(4)}rad)`;
      drop.style.transformOrigin = `${r.toFixed(2)}px ${r.toFixed(2)}px`;
    };
    const spring = (v: number) => {
      const s = createSpring(v, { duration: 0.3, bounce: 0 }, draw);
      springs.push(s);
      return s;
    };
    const head = spring(0);
    const tail = spring(0);
    const radius = spring(0);
    draw();

    const timers: ReturnType<typeof setTimeout>[] = [];
    const later = (ms: number, fn: () => void) => timers.push(setTimeout(fn, ms));
    const stop = () => {
      timers.forEach(clearTimeout);
      springs.forEach((s) => s.stop());
      drop.remove();
      live.current.delete(stop);
    };
    live.current.add(stop);

    const travel = 0.42;
    // It buds: grows out of `from` before it leaves.
    radius.to(size, { config: { duration: 0.16, bounce: 0 } });
    later(100, () => {
      head.to(1, { config: { duration: travel * 0.8, bounce: 0.2 } });
      tail.to(1, { config: { duration: travel * 1.15, bounce: 0.1 } });
    });
    later(100 + travel * 750, () => {
      // Swallowed: the tail catches up and the drop is gone before it can
      // sit on what it landed in.
      tail.to(1, { config: { duration: 0.1, bounce: 0 } });
      radius.to(0, { config: { duration: 0.12, bounce: 0 } });
      swell(to);
      play.current?.(GULP);
      onArrive?.();
    });
    later(100 + travel * 750 + 180, stop);
    return stop;
  }, []);
}

/** The element a drop lands in swells, then settles: the `scale` property, so its own transform is untouched. */
function swell(el: Element) {
  if (!(el instanceof HTMLElement || el instanceof SVGElement)) return;
  const s = createSpring(1, { duration: 0.45, bounce: 0.45 }, (v) => {
    el.style.scale = v.toFixed(4);
  });
  s.to(1, { config: { duration: 0.45, bounce: 0.45 }, velocity: 3.2 });
  setTimeout(() => {
    s.stop();
    el.style.scale = "";
  }, 900);
}
