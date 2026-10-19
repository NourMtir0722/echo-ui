"use client";

/**
 * Magnetic. The HardwareButtons inside it feel your hand before you touch
 * them: each leans toward the pointer and comes up a little, the nearest
 * most, and springs home when you move away. It moves the button as a whole
 * (never the cap, whose press is its own), so pressing still presses.
 *
 * Pointer only: touch has no hover, and under reduced motion nothing leans.
 */
import { useEffect, useRef, type ReactNode } from "react";
import { createSpring, type Spring } from "echo-ui-core/tactile";
import "./magnetic.css";

export interface MagneticProps {
  /** HardwareButtons, usually icon-only ones in a row. */
  children: ReactNode;
  /** How far away a button starts to feel the hand, px. Default 130. */
  radius?: number;
  /** How far it leans, as a share of the distance to the hand. Default 0.4. */
  strength?: number;
  className?: string;
}

export function Magnetic({ children, radius = 130, strength = 0.4, className }: MagneticProps) {
  const root = useRef<HTMLDivElement>(null);
  const opts = useRef({ radius, strength });
  opts.current = { radius, strength };

  useEffect(() => {
    const el = root.current!;
    if (typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const bouncy = { duration: 0.5, bounce: 0.3 };
    type Lean = { hw: HTMLElement; x: Spring; y: Spring; k: Spring };
    let leans: Lean[] = [];
    const build = () => {
      leans.forEach((l) => [l.x, l.y, l.k].forEach((s) => s.stop()));
      leans = [...el.querySelectorAll<HTMLElement>(".echo-hw")].map((hw) => {
        const v = { x: 0, y: 0, k: 0 };
        const draw = () => {
          hw.style.translate = `${v.x.toFixed(2)}px ${v.y.toFixed(2)}px`;
          hw.style.scale = (1 + 0.12 * v.k).toFixed(3);
          hw.style.setProperty("--echo-magnetic-pull", v.k.toFixed(3));
        };
        return {
          hw,
          x: createSpring(0, bouncy, (n) => ((v.x = n), draw())),
          y: createSpring(0, bouncy, (n) => ((v.y = n), draw())),
          k: createSpring(0, bouncy, (n) => ((v.k = n), draw())),
        };
      });
    };
    build();
    const mo = new MutationObserver(build);
    mo.observe(el, { childList: true, subtree: true });

    const move = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      const { radius: R, strength: S } = opts.current;
      const c = { duration: 0.3, bounce: 0.2 };
      for (const l of leans) {
        const r = l.hw.getBoundingClientRect();
        // Measured from where it rests, not where it has leaned to.
        const dx = e.clientX - (r.left + r.width / 2 - l.x.value);
        const dy = e.clientY - (r.top + r.height / 2 - l.y.value);
        const d = Math.hypot(dx, dy);
        const pull = d < R ? (1 - d / R) ** 2 : 0;
        l.x.to(dx * S * pull, { config: c });
        l.y.to(dy * S * pull, { config: c });
        l.k.to(pull, { config: c });
      }
    };
    const leave = () => leans.forEach((l) => [l.x, l.y, l.k].forEach((s) => s.to(0, { config: bouncy })));
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    return () => {
      mo.disconnect();
      leans.forEach((l) => {
        [l.x, l.y, l.k].forEach((s) => s.stop());
        l.hw.style.translate = "";
        l.hw.style.scale = "";
        l.hw.style.removeProperty("--echo-magnetic-pull");
      });
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", leave);
    };
  }, []);

  return (
    <div ref={root} className={["echo-magnetic", className].filter(Boolean).join(" ")}>
      {children}
    </div>
  );
}
