"use client";

/**
 * LightSource. Your pointer becomes the light the caps inside it are lit by:
 * each HardwareButton's shine turns toward it and its shadow falls away from
 * it, the nearest most. When the pointer leaves, the light drifts back to
 * the room's key light, up and to the left.
 *
 * It lights what you put in it — it adds no controls of its own. Under
 * reduced motion the light jumps instead of gliding.
 */
import { useEffect, useRef, type ReactNode } from "react";
import { createSpring } from "echo-ui-core/tactile";
import "./light-source.css";

export interface LightSourceProps {
  /** HardwareButtons (and anything else); the caps are what it lights. */
  children: ReactNode;
  /** How far a shadow can fall, px. Default 13. */
  reach?: number;
  className?: string;
}

export function LightSource({ children, reach = 13, className }: LightSourceProps) {
  const root = useRef<HTMLDivElement>(null);
  const bulb = useRef<HTMLDivElement>(null);
  const reachRef = useRef(reach);
  reachRef.current = reach;

  useEffect(() => {
    const el = root.current!;
    const reduced = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    const home = () => ({ x: -60, y: -80 });
    const draw = () => {
      const lx = sx.value;
      const ly = sy.value;
      const base = el.getBoundingClientRect();
      if (bulb.current) bulb.current.style.translate = `${(lx - 100).toFixed(1)}px ${(ly - 100).toFixed(1)}px`;
      for (const cap of el.querySelectorAll<HTMLElement>(".echo-hw__cap")) {
        const r = cap.getBoundingClientRect();
        const dx = r.left + r.width / 2 - base.left - lx;
        const dy = r.top + r.height / 2 - base.top - ly;
        const d = Math.hypot(dx, dy) || 1;
        const fall = Math.min(d / 14, reachRef.current);
        // The shadow falls away from the light; the shine sits on the side facing it.
        cap.style.setProperty("--hw-light-x", `${((dx / d) * fall).toFixed(2)}px`);
        cap.style.setProperty("--hw-light-y", `${((dy / d) * fall - 4).toFixed(2)}px`);
        cap.style.setProperty("--hw-sheen-x", `${(50 - (dx / d) * 38).toFixed(1)}%`);
        cap.style.setProperty("--hw-sheen-y", `${(50 - (dy / d) * 38).toFixed(1)}%`);
        cap.style.setProperty("--hw-sheen", Math.max(0, 1 - d / 260).toFixed(3));
      }
    };
    const h = home();
    const sx = createSpring(h.x, { duration: 0.45, bounce: 0 }, draw);
    const sy = createSpring(h.y, { duration: 0.45, bounce: 0 }, draw);
    draw();
    const go = (x: number, y: number, duration: number) => {
      if (reduced) {
        sx.set(x);
        sy.set(y);
        draw();
        return;
      }
      sx.to(x, { config: { duration, bounce: 0 } });
      sy.to(y, { config: { duration, bounce: 0 } });
    };
    // The glow is the pointer's: it shows only while the pointer is here.
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      bulb.current?.setAttribute("data-lit", "");
      go(e.clientX - r.left, e.clientY - r.top, 0.18);
    };
    const leave = () => {
      bulb.current?.removeAttribute("data-lit");
      const p = home();
      go(p.x, p.y, 0.45);
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    return () => {
      sx.stop();
      sy.stop();
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", leave);
      for (const cap of el.querySelectorAll<HTMLElement>(".echo-hw__cap")) {
        for (const v of ["--hw-light-x", "--hw-light-y", "--hw-sheen-x", "--hw-sheen-y", "--hw-sheen"]) cap.style.removeProperty(v);
      }
    };
  }, []);

  return (
    <div ref={root} className={["echo-light-source", className].filter(Boolean).join(" ")}>
      <div ref={bulb} className="echo-light-source__bulb" style={{ left: 0, top: 0 }} aria-hidden />
      {children}
    </div>
  );
}
