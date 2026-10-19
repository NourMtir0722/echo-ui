"use client";

/**
 * useRippleSurface. A surface that answers a press like water: a wave runs
 * out from where you pressed, and pressing longer presses deeper and sends a
 * bigger one. A key press (Enter or Space) on a control on the surface sends a
 * wave from that control. It's what `pressable` does on Panel, and what Ripple
 * shows with its dots always out.
 *
 * The wave is drawn as dots on a canvas you give it, in the theme's own roles
 * (dim text, and the primary plastic where a wave lifts them), read from the
 * page so it relights with the seed. With `dots: "always"` the dots are there
 * at rest and dip under the pointer; with `"moving"` (Panel's) there are none
 * until a press, so the surface looks exactly as it did.
 *
 * It draws only while something moves, then stops. Decoration: the canvas is
 * the caller's to hide from assistive tech; under reduced motion no wave runs.
 * A press on the surface itself thuds; a press on a control on it doesn't,
 * since the control makes its own sound.
 */
import { useEffect, useRef, type RefObject } from "react";
import { useSoundOptional, type SoundRecipe } from "echo-ui-core/sound";

export interface RippleSurfaceOptions {
  /** Answer presses at all. Default true. */
  enabled?: boolean;
  /** Distance between dots, px. Default 16. */
  spacing?: number;
  /** `"always"`: the dots show at rest. `"moving"`: only where a wave is. Default "moving". */
  dots?: "always" | "moving";
  /** Called when a wave is sent, with how hard (0–1). */
  onRipple?: (strength: number) => void;
}

const THUD: SoundRecipe = { wave: "sine", freq: 150, decay: 0.28, gain: 0.22, bend: -70 };
const CONTROL = "button, a[href], input, select, textarea, summary, [role='button'], [tabindex]";

export function useRippleSurface(
  root: RefObject<HTMLElement | null>,
  canvas: RefObject<HTMLCanvasElement | null>,
  { enabled = true, spacing = 16, dots = "moving", onRipple }: RippleSurfaceOptions = {},
) {
  const sound = useSoundOptional();
  const play = useRef(sound?.play);
  const rippled = useRef(onRipple);
  useEffect(() => {
    play.current = sound?.play;
    rippled.current = onRipple;
  });

  useEffect(() => {
    const el = root.current;
    const c = canvas.current;
    const ctx = enabled ? c?.getContext("2d") : null;
    if (!el || !c || !ctx) return;
    const reduced = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    const always = dots === "always";
    let W = 0;
    let H = 0;
    const size = () => {
      const r = el.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      W = r.width;
      H = r.height;
      c.width = Math.max(1, Math.round(W * dpr));
      c.height = Math.max(1, Math.round(H * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    // The theme's colours, re-read now and then so a reseed relights it.
    let dim = "#888";
    let hot = "#e05";
    let read = -Infinity;
    const colours = (now: number) => {
      if (now - read < 500) return;
      read = now;
      const cs = getComputedStyle(el);
      dim = cs.getPropertyValue("--echo-text-dim").trim() || dim;
      hot = cs.getPropertyValue("--echo-primary-cap-mid").trim() || hot;
    };

    const waves: { x: number; y: number; t0: number; a: number }[] = [];
    let hover: { x: number; y: number } | null = null;
    let hold: { x: number; y: number; t0: number } | null = null;
    let id = 0;

    const draw = (now: number) => {
      colours(now);
      ctx.clearRect(0, 0, W, H);
      // A wave is done when it has died down, or its tail has left the surface.
      for (let i = waves.length - 1; i >= 0; i--) {
        const w = waves[i]!;
        const t = (now - w.t0) / 1000;
        const far = Math.hypot(Math.max(w.x, W - w.x), Math.max(w.y, H - w.y));
        if (t > 2.2 || t * 260 - 140 > far) waves.splice(i, 1);
      }
      for (let y = spacing / 2; y < H; y += spacing) {
        for (let x = spacing / 2; x < W; x += spacing) {
          let lift = 0;
          for (const w of waves) {
            const t = (now - w.t0) / 1000;
            const d = Math.hypot(x - w.x, y - w.y);
            const front = d - t * 260;
            if (front > 0 || front < -140) continue;
            lift += w.a * Math.exp(-t * 1.6) * Math.sin(front / 14) * (1 + front / 140);
          }
          let dent = 0;
          if (hover && always) dent = Math.max(0, 1 - Math.hypot(x - hover.x, y - hover.y) / 70);
          if (hold) {
            const k = Math.min(1, (now - hold.t0) / 900);
            dent = Math.max(dent, k * Math.max(0, 1 - Math.hypot(x - hold.x, y - hold.y) / (70 + 80 * k)));
          }
          const alpha = Math.min(1, (always ? 0.35 : 0) + Math.abs(lift) * 0.5 + dent * 0.2);
          if (alpha < 0.02) continue;
          const r = Math.max(0.4, 1.8 + lift * 1.6 - dent * 1.3);
          ctx.globalAlpha = alpha;
          ctx.fillStyle = lift > 0.35 ? hot : dim;
          ctx.beginPath();
          ctx.arc(x, y - lift * 3, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    };
    // Frames only while something moves: a wave, or a press deepening.
    const frame = (now: number) => {
      draw(now);
      id = !reduced && (waves.length > 0 || hold) ? requestAnimationFrame(frame) : 0;
    };
    const kick = () => {
      if (!id) id = requestAnimationFrame(frame);
    };

    size();
    // Sizing a canvas clears it; draw it again. The observer also
    // fires once as it starts.
    const ro = new ResizeObserver(() => {
      size();
      draw(performance.now());
    });
    ro.observe(el);

    const onControl = (t: EventTarget | null) => {
      const control = t instanceof Element ? t.closest(CONTROL) : null;
      return control !== null && control !== el && el.contains(control);
    };
    const send = (x: number, y: number, k: number, thud: boolean) => {
      rippled.current?.(k);
      if (thud) play.current?.({ ...THUD, gain: 0.12 + 0.14 * k, freq: 170 - 50 * k });
      if (reduced) return;
      waves.push({ x, y, t0: performance.now(), a: 0.9 + 1.6 * k });
      kick();
    };
    const pos = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    let pressedControl = false;
    const move = (e: PointerEvent) => {
      hover = pos(e);
      if (hold) Object.assign(hold, hover);
      if (always && !reduced && !id) draw(performance.now());
    };
    const down = (e: PointerEvent) => {
      if (e.button !== 0) return;
      pressedControl = onControl(e.target);
      hold = { ...pos(e), t0: performance.now() };
      kick();
    };
    const up = () => {
      if (!hold) return;
      // Held longer, pressed deeper: the wave it sends is bigger.
      send(hold.x, hold.y, Math.min(1, (performance.now() - hold.t0) / 900), !pressedControl);
      hold = null;
    };
    const leave = () => {
      hover = null;
      hold = null;
      if (!id) draw(performance.now());
    };
    const key = (e: KeyboardEvent) => {
      if ((e.key !== "Enter" && e.key !== " ") || e.repeat) return;
      const t = (e.target as Element).getBoundingClientRect();
      const r = el.getBoundingClientRect();
      send(t.left + t.width / 2 - r.left, t.top + t.height / 2 - r.top, 0.4, false);
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", leave);
    el.addEventListener("pointerleave", leave);
    el.addEventListener("keydown", key);
    return () => {
      cancelAnimationFrame(id);
      ro.disconnect();
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", leave);
      el.removeEventListener("pointerleave", leave);
      el.removeEventListener("keydown", key);
    };
  }, [root, canvas, enabled, spacing, dots]);
}
