"use client";

/**
 * useLiquidHighlight — the hovered item in a list is marked by one cap that
 * flows from item to item, rather than a tint that blinks on and off.
 *
 * It watches the container for whichever item carries `data-highlighted`
 * (Base UI sets it for the pointer and the arrow keys alike) and sends the
 * cap there on a spring, drawing out along its path when it moves fast. When
 * nothing is highlighted it fades; the next highlight starts where it lands.
 *
 *   const glow = useLiquidHighlight();
 *   <Popup ref={glow.container}>
 *     <span ref={glow.light} className="…"><span ref={glow.shape} className="…" /></span>
 *     {items}
 *   </Popup>
 *
 * The container must be the items' offset parent (position: relative), and it
 * gets `data-glow` once the cap is showing, so its CSS can drop the old tint.
 */
import { useCallback, useRef, type RefCallback } from "react";
import gsap from "gsap";
import { springs } from "../motion/motion";
import { createLiquid } from "./liquid";

export interface LiquidHighlight {
  container: RefCallback<HTMLElement>;
  light: RefCallback<HTMLElement>;
  shape: RefCallback<HTMLElement>;
}

export function useLiquidHighlight(): LiquidHighlight {
  const light = useRef<HTMLElement | null>(null);
  const shape = useRef<HTMLElement | null>(null);
  const stop = useRef<(() => void) | null>(null);

  const container = useCallback<RefCallback<HTMLElement>>((node) => {
    stop.current?.();
    stop.current = null;
    const el = light.current;
    const sh = shape.current;
    if (!node || !el || !sh) return;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    let radius = 6;
    let shown = false;
    const cap = createLiquid({
      el,
      shape: sh,
      axis: "y",
      // A row is wide and short: a drop that tapers across its whole width
      // reads as a wedge, so the cap keeps its outline and says
      // speed only by drawing out along its path.
      stretch: 0.35,
      morph: false,
      fullSpeed: 1100,
      restRadius: () => radius,
    });
    // Crossing a separator or a group label un-highlights for a moment; the
    // fade waits a beat, so the cap flows across the gap instead of blinking
    // out and reappearing.
    let fading: gsap.core.Tween | null = null;
    const sync = () => {
      const item = node.querySelector<HTMLElement>("[data-highlighted]");
      if (!item) {
        if (shown && !fading) {
          fading = gsap.delayedCall(0.14, () => {
            fading = null;
            shown = false;
            gsap.to(el, { autoAlpha: 0, duration: 0.12, ease: "power1.out", overwrite: "auto" });
          });
        }
        return;
      }
      fading?.kill();
      fading = null;
      radius = parseFloat(getComputedStyle(item).borderTopLeftRadius) || 6;
      el.style.left = `${item.offsetLeft}px`;
      el.style.width = `${item.offsetWidth}px`;
      const box = { start: item.offsetTop, size: item.offsetHeight };
      if (!shown || reduced) {
        cap.place(box, "instant");
        gsap.to(el, { autoAlpha: 1, duration: 0.08, ease: "none", overwrite: "auto" });
        shown = true;
        node.setAttribute("data-glow", "");
        return;
      }
      cap.place(box, springs.snappy);
    };
    const watch = new MutationObserver(sync);
    watch.observe(node, { subtree: true, attributes: true, attributeFilter: ["data-highlighted"] });
    sync();
    stop.current = () => {
      fading?.kill();
      watch.disconnect();
      cap.destroy();
      gsap.killTweensOf(el);
    };
  }, []);

  return {
    container,
    light: useCallback<RefCallback<HTMLElement>>((node) => {
      light.current = node;
    }, []),
    shape: useCallback<RefCallback<HTMLElement>>((node) => {
      shape.current = node;
    }, []),
  };
}
