"use client";

/**
 * Ripple. A surface of dots that answers a press like water: a wave runs out
 * from where you pressed, and pressing longer presses deeper and sends a
 * bigger one. The dots dip under the pointer as it passes. Put controls on it
 * (`children`); a key press on one of them sends a wave from it too.
 *
 * The wave is Panel's `pressable` (useRippleSurface); Ripple is that surface
 * with its dots always out, in a well of its own.
 *
 * The dots are drawn in the theme's own roles — dim text, and the primary
 * plastic where a wave lifts them — read from the page, so it relights with
 * the seed. Decoration: it is hidden from assistive tech, and under reduced
 * motion it stays still.
 */
import { useRef, type ReactNode } from "react";
import { useRippleSurface } from "../panel";
import "./ripple.css";

export interface RippleProps {
  /** Controls or content on the surface. */
  children?: ReactNode;
  /** Distance between dots, px. Default 16. */
  spacing?: number;
  /** Called when a wave is sent, with how hard (0–1). */
  onRipple?: (strength: number) => void;
  className?: string;
}

export function Ripple({ children, spacing = 16, onRipple, className }: RippleProps) {
  const root = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  // The same wave as Panel's `pressable`, with the dots out at rest.
  useRippleSurface(root, canvas, { spacing, dots: "always", onRipple });
  return (
    <div ref={root} className={["echo-ripple", className].filter(Boolean).join(" ")}>
      <canvas ref={canvas} className="echo-ripple__dots" aria-hidden />
      {children ? <div className="echo-ripple__content">{children}</div> : null}
    </div>
  );
}
