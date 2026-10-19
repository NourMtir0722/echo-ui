"use client";

/**
 * Panel — raised molded plastic or a recessed dark screen. Consumes only
 * var(--echo-*) via panel.css.
 *
 * `pressable` makes the surface answer a press like water (useRippleSurface):
 * a wave of dots runs out from where you pressed, bigger for a longer press,
 * and a key press on a control on it sends one from that control. At rest it
 * looks exactly like any Panel. The content then sits in one layer above the
 * wave, which takes the Panel's own layout (display, gap, alignment).
 */
import { useRef, type HTMLAttributes } from "react";
import { useRippleSurface } from "./ripple-surface";
import "./panel.css";

export type PanelVariant = "raised" | "screen";

export interface PanelProps extends HTMLAttributes<HTMLDivElement> {
  variant?: PanelVariant;
  /**
   * The surface answers a press: a wave runs out from where you pressed, and
   * a longer press sends a bigger one. Decoration only: it adds no role, and
   * nothing moves under reduced motion.
   */
  pressable?: boolean;
}

export function Panel({ variant = "raised", pressable = false, className, children, ...rest }: PanelProps) {
  const root = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  useRippleSurface(root, canvas, { enabled: pressable });
  return (
    <div
      ref={root}
      className={["echo-panel", className].filter(Boolean).join(" ")}
      data-variant={variant}
      data-pressable={pressable ? "" : undefined}
      {...rest}
    >
      {pressable ? (
        <>
          <canvas ref={canvas} className="echo-panel__ripple" aria-hidden="true" />
          <div className="echo-panel__content">{children}</div>
        </>
      ) : (
        children
      )}
    </div>
  );
}
