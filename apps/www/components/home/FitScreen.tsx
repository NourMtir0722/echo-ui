"use client";

/**
 * A screen shown whole, never scrolled inside: it's laid out at the width it
 * was designed for (`width`) and scaled down to the room it has, and the box
 * takes the height the scaled screen needs. In a box wider than that, it's
 * laid out at the box's width instead, unscaled, so it always fills the box
 * (it stopped at its own width and left a strip empty). A box that scrolls on its own
 * catches the wheel of anyone reading past it, so the page's screens (a
 * template, an app the AI built) don't; where more than a glance is wanted,
 * the page offers to open the screen at full size instead.
 *
 * With `reflow` (a media query), while it matches the screen is laid out at
 * the box's own width, unscaled: a screen built to reflow (a template) shows
 * its own narrow layout on a phone, not its desktop one drawn too small to
 * read.
 *
 * `crop` limits the height shown (the rest fades out under the box's foot),
 * and so does the box's own CSS `max-height`, so a page can size the glance
 * to the window. With `fill`, the page sizes the box itself (its CSS sets
 * the height), and the screen is cropped to it. The screen stays live:
 * everything in it presses as it does at full size.
 */
import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

export function FitScreen({
  width,
  reflow,
  crop,
  fill,
  className,
  children,
}: {
  /** The width the screen was designed at, px. */
  width: number;
  /** A media query: while it matches, the screen is laid out at the box's width, unscaled. */
  reflow?: string;
  /** The most of its height to show, in its own px (unscaled); the rest fades out. */
  crop?: number;
  /** The box's height is the page's (its CSS): the screen is cropped to it. */
  fill?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [laidOut, setLaidOut] = useState(width);
  const [height, setHeight] = useState<number | null>(null);
  const [cropped, setCropped] = useState(false);

  useLayoutEffect(() => {
    const o = outer.current;
    const i = inner.current;
    if (!o || !i) return;
    const narrow = reflow ? window.matchMedia(reflow) : null;
    const measure = () => {
      const w = narrow?.matches ? o.clientWidth : Math.max(width, o.clientWidth);
      const k = o.clientWidth / w;
      const natural = i.offsetHeight;
      // The room the page gives it, in the screen's own px: the box's height, or its max-height.
      const cap = (fill ? o.clientHeight : parseFloat(getComputedStyle(o).maxHeight)) / k;
      const shown = Math.min(natural, crop ?? Infinity, Number.isFinite(cap) ? cap : Infinity);
      setLaidOut(w);
      setScale(k);
      setHeight(fill ? null : Math.round(shown * k));
      setCropped(natural > shown + 1);
    };
    measure();
    // On the next frame, not inside the observer's callback: laying the screen out resizes what it watches.
    let frame = 0;
    const later = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    const ro = new ResizeObserver(later);
    ro.observe(o);
    ro.observe(i);
    // A max-height set from the window's height changes with the window, not with the box.
    window.addEventListener("resize", later);
    narrow?.addEventListener("change", later);
    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
      window.removeEventListener("resize", later);
      narrow?.removeEventListener("change", later);
    };
  }, [width, reflow, crop, fill]);

  return (
    <div
      ref={outer}
      className={["fit", className].filter(Boolean).join(" ")}
      data-cropped={cropped ? "" : undefined}
      style={{ height: height ?? undefined } as CSSProperties}
    >
      <div ref={inner} className="fit__screen" style={{ width: laidOut, transform: `scale(${scale})` }}>
        {children}
      </div>
    </div>
  );
}
