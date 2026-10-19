"use client";

/**
 * The homepage's live demos, loaded when they come near.
 *
 * Each demo (stages.tsx) is a separate chunk, JavaScript and stylesheets both,
 * so none of it stands between a visitor and the hero. `Deferred` holds the
 * demo's place (its CSS gives the empty box a height) until it's within
 * `margin` of the viewport, then mounts it. Without JavaScript the place
 * stays empty; the section's words around it are server-rendered either way.
 *
 * Mounted isn't drawn: the chunk is still on its way. Until it lands, each
 * demo leaves a `.deferred__holding` mark, and the place keeps its height
 * while the mark is there (`[data-deferred]` and `:has(.deferred__holding)`
 * share each rule). Let go any sooner, the place collapsed for as long as the
 * chunk took and grew back after, and the page jumped under the visitor.
 */
import dynamic from "next/dynamic";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { whenNear } from "./near";

/** A demo on its way: nothing to see, but its place keeps its size until the demo is drawn. */
const holding = () => <span className="deferred__holding" hidden />;

export const BenchStage = dynamic(() => import("./stages").then((m) => m.BenchStage), { ssr: false, loading: holding });
export const WaysShow = dynamic(() => import("./stages").then((m) => m.WaysShow), { ssr: false, loading: holding });
export const TemplateStage = dynamic(() => import("./stages").then((m) => m.TemplateStage), { ssr: false, loading: holding });
export const MotionRowDemo = dynamic(() => import("./stages").then((m) => m.MotionRowDemo), { ssr: false, loading: holding });

export function Deferred({ children, className, margin = 800 }: { children: ReactNode; className?: string; margin?: number }) {
  const box = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    // By its box, not an observer: the section around it may be clipped while it rises.
    return whenNear(el, margin, () => setNear(true));
  }, [margin]);
  return (
    <div ref={box} className={className} data-deferred={near ? undefined : ""}>
      {near ? children : null}
    </div>
  );
}
