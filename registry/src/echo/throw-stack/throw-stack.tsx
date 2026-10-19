"use client";

/**
 * ThrowStack. A stack of cards you can throw: drag the top one and flick it,
 * and it keeps the speed you gave it, spins from where you held it (grabbed
 * low, it swings the other way), flies off and tucks back in underneath. A
 * short drag springs back.
 *
 * The cards are Echo Panels. The top card is focusable: ← and → throw it,
 * and the new top card is announced. Under reduced motion it simply cycles.
 */
import { Children, useEffect, useRef, useState, type ReactNode } from "react";
import { createSpring, type Spring } from "echo-ui-core/tactile";
import { useSoundOptional, type SoundRecipe } from "echo-ui-core/sound";
import { Panel } from "../panel";
import "./throw-stack.css";

export interface ThrowStackProps {
  /** One child per card, top first. */
  children: ReactNode;
  /** Names the stack, e.g. "Today". */
  label: string;
  /** Called with the index (in `children`) of the new top card. */
  onChange?: (index: number) => void;
  className?: string;
}

const WHOOSH: SoundRecipe = { wave: "sine", freq: 520, decay: 0.12, gain: 0.07, bend: -300 };
const bouncy = { duration: 0.5, bounce: 0.3 };

export function ThrowStack({ children, label, onChange, className }: ThrowStackProps) {
  const cards = Children.toArray(children);
  const count = cards.length;
  const root = useRef<HTMLDivElement>(null);
  const [top, setTop] = useState(0);
  const sound = useSoundOptional();
  const play = useRef(sound?.play);
  play.current = sound?.play;
  const changed = useRef(onChange);
  changed.current = onChange;
  const throwRef = useRef<(dir: number) => void>(() => undefined);

  useEffect(() => {
    const el = root.current!;
    const reduced = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    const nodes = [...el.querySelectorAll<HTMLElement>(":scope > .echo-throw-stack__card")];
    let order = nodes.map((_, i) => i);
    type S = { x: Spring; y: Spring; r: Spring; s: Spring };
    const S: S[] = nodes.map((c) => {
      const v = { x: 0, y: 0, r: 0, s: 1 };
      const draw = () => {
        c.style.translate = `${v.x.toFixed(1)}px ${v.y.toFixed(1)}px`;
        c.style.rotate = `${v.r.toFixed(2)}deg`;
        c.style.scale = v.s.toFixed(3);
      };
      const mk = (init: number, key: keyof typeof v) => createSpring(init, bouncy, (n) => ((v[key] = n), draw()));
      return { x: mk(0, "x"), y: mk(0, "y"), r: mk(0, "r"), s: mk(1, "s") };
    });
    const settle = (config = bouncy) => {
      order.forEach((ci, p) => {
        const c = nodes[ci]!;
        c.style.zIndex = String(count - p);
        c.toggleAttribute("data-top", p === 0);
        c.tabIndex = p === 0 ? 0 : -1;
        c.setAttribute("aria-hidden", p === 0 ? "false" : "true");
        if (reduced) {
          // Straight into place, including a card that was dragged there.
          S[ci]!.x.set(0);
          S[ci]!.r.set(0);
          S[ci]!.y.set(p * 12);
          S[ci]!.s.set(1 - p * 0.05);
        } else {
          S[ci]!.y.to(p * 12, { config });
          S[ci]!.s.to(1 - p * 0.05, { config });
        }
      });
    };
    order.forEach((ci, p) => {
      S[ci]!.y.set(p * 12);
      S[ci]!.s.set(1 - p * 0.05);
    });
    settle();

    const toss = (dir: number, velocity = 0) => {
      const id = order[0]!;
      const s = S[id]!;
      order = [...order.slice(1), id];
      const next = order[0]!;
      setTop(next);
      changed.current?.(next);
      const hadFocus = el.contains(document.activeElement);
      if (reduced) {
        settle();
      } else {
        play.current?.(WHOOSH);
        nodes[id]!.style.zIndex = String(count + 1);
        s.x.to(dir * 380, { config: { duration: 0.35, bounce: 0 }, velocity });
        s.r.to(dir * 22, { config: { duration: 0.35, bounce: 0 } });
        // Thrown past the edge, it tucks back in underneath.
        setTimeout(() => {
          nodes[id]!.style.zIndex = "0";
          s.x.to(0, { config: { duration: 0.55, bounce: 0.15 } });
          s.r.to(0, { config: { duration: 0.55, bounce: 0.15 } });
          settle();
        }, 260);
        settle({ duration: 0.45, bounce: 0.35 });
        nodes[id]!.style.zIndex = String(count + 1);
      }
      if (hadFocus) nodes[next]!.focus({ preventScroll: true });
    };
    throwRef.current = (dir) => toss(dir);

    let drag: { id: number; x: number; y: number; flip: number; vx: number; t: number; lx: number } | null = null;
    const down = (e: PointerEvent) => {
      const ci = order[0]!;
      const card = nodes[ci]!;
      if (!card.contains(e.target as Node) || e.button !== 0) return;
      const r = card.getBoundingClientRect();
      card.setPointerCapture(e.pointerId);
      // Grabbed low, it swings the other way — like a real card.
      drag = { id: ci, x: e.clientX, y: e.clientY, flip: e.clientY > r.top + r.height / 2 ? -1 : 1, vx: 0, t: performance.now(), lx: e.clientX };
      S[ci]!.s.to(1.03, { config: { duration: 0.2, bounce: 0 } });
    };
    const move = (e: PointerEvent) => {
      if (!drag) return;
      const now = performance.now();
      const dt = Math.max(1, now - drag.t);
      drag.vx = drag.vx * 0.6 + ((e.clientX - drag.lx) / dt) * 1000 * 0.4;
      drag.lx = e.clientX;
      drag.t = now;
      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      const s = S[drag.id]!;
      s.x.to(dx, { config: { duration: 0.08, bounce: 0 } });
      s.y.to(dy * 0.6, { config: { duration: 0.08, bounce: 0 } });
      s.r.to(dx * 0.07 * drag.flip, { config: { duration: 0.12, bounce: 0 } });
    };
    const up = () => {
      if (!drag) return;
      const { id, vx } = drag;
      const s = S[id]!;
      const dx = s.x.value;
      drag = null;
      if (Math.abs(dx) > 110 || Math.abs(vx) > 650) toss(Math.sign(dx || vx), vx);
      else {
        s.x.to(0, { config: bouncy, velocity: vx });
        s.r.to(0, { config: bouncy });
        settle();
      }
    };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    return () => {
      S.forEach((s) => [s.x, s.y, s.r, s.s].forEach((sp) => sp.stop()));
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
    };
  }, [count]);

  return (
    <div
      ref={root}
      className={["echo-throw-stack", className].filter(Boolean).join(" ")}
      role="group"
      aria-roledescription="stack"
      aria-label={label}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
          e.preventDefault();
          throwRef.current(e.key === "ArrowRight" ? 1 : -1);
        }
      }}
    >
      {cards.map((c, i) => (
        <Panel
          key={i}
          className="echo-throw-stack__card"
          aria-roledescription="card"
          aria-label={`${i + 1} of ${count}`}
        >
          {c}
        </Panel>
      ))}
      <span className="echo-throw-stack__live" aria-live="polite">
        {`${top + 1} of ${count}`}
      </span>
    </div>
  );
}
