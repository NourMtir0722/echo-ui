"use client";

/**
 * The light Echo carries: a soft pool of the seed's light centred on Echo,
 * moved every frame the stage draws it (Echo3D's `onPose`) by a transform,
 * so following it costs the page no layout and no React render.
 *
 * Behind: on the ground, under the page's objects, like a lamp on a wall.
 * Over: screened over everything, like a light falling on the page.
 *
 * The text it falls on always reads (contrast.ts): every run of text on the
 * page is known with its colour, its size and what's behind it, and each
 * frame the light is drawn only as strong as the text within its reach can
 * take at WCAG AA (AAA when the visitor asks for more contrast). Text that
 * didn't read before the light came isn't the light's to fix, and is left
 * out. It dims at once and comes back slowly, so no frame is ever drawn past
 * the line. What it draws is told to the shader fields (lights.ts), which
 * hold their own light down by the same rule with this one counted in.
 */
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import type { DrawnPose } from "@/components/home/echo3d/stage";
import { lit, reads, rgb, rgba, runs, screened, type Rgb, type Run } from "./contrast";
import { falloff, pool } from "./lights";

export interface LightPoolHandle {
  move(pose: DrawnPose): void;
}

interface Placed {
  run: Run;
  /** Its box in the document (scroll included). */
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/**
 * How often, at most, the page's text is read again (colours, backgrounds) and where it is, ms. Done
 * when the browser is idle and only while Echo is out, never inside a frame: the page scrolls smooth.
 */
const COLLECT = 3000;
const PLACE = 1000;
/** A run this close outside the light's edge counts too: it may have moved since it was placed. */
const SLACK = 48;

/** Runs `fn` when the browser has a moment (soon, wherever there's no idle callback). */
const whenIdle = (fn: () => void) => {
  const ric = (window as { requestIdleCallback?: typeof requestIdleCallback }).requestIdleCallback;
  if (ric) ric(fn, { timeout: 500 });
  else window.setTimeout(fn, 50);
};

/** A contrast audit holds every light where it is while it looks behind the text (`window.__echoLightFreeze`). */
export const frozen = () => typeof window !== "undefined" && (window as { __echoLightFreeze?: boolean }).__echoLightFreeze === true;

function groundOf(el: Element): Rgb {
  for (let a = el.parentElement; a; a = a.parentElement) {
    const [c, alpha] = rgba(getComputedStyle(a).backgroundColor);
    if (alpha > 0.95) return c;
  }
  return [0, 0, 0];
}

export const LightPool = forwardRef<LightPoolHandle, { mode: "Over" | "Behind" | "Off"; amount: number; size: number }>(function LightPool({ mode, amount, size }, ref) {
  const el = useRef<HTMLDivElement>(null);
  const settings = useRef({ mode, amount, size });
  settings.current = { mode, amount, size };
  const st = useRef({
    placed: [] as Placed[],
    collectedAt: 0,
    placedAt: 0,
    ground: [0, 0, 0] as Rgb,
    accent: [0, 0, 0] as Rgb,
    /** What's drawn at the centre now. */
    shown: 0,
    /** 0..1: in while Echo is drawn, out while it's home. */
    vis: 0,
    last: 0,
    x: -1e4,
    y: -1e4,
    drawnAmt: -1,
    /** A read of the page is waiting for an idle moment. */
    pending: false,
    /** The page changed since it was last read (new text, say): read it again soon. */
    changed: false,
  });

  // New text on the page (a demo's reply, a sheet opening) brings the next read forward.
  useEffect(() => {
    const root = el.current?.closest(".home-lit");
    if (!root) return;
    const watch = new MutationObserver(() => {
      st.current.changed = true;
    });
    watch.observe(root, { childList: true, subtree: true, characterData: true });
    return () => watch.disconnect();
  }, [mode]);

  // A change of settings: read the page again at once.
  useEffect(() => {
    st.current.collectedAt = 0;
    if (mode === "Off") {
      pool.mode = "off";
      pool.amount = 0;
      pool.version++;
    }
  }, [mode, amount, size]);

  useImperativeHandle(ref, () => ({
    move(p) {
      const node = el.current;
      const s = settings.current;
      const S = st.current;
      if (!node || s.mode === "Off" || frozen()) return;
      const now = performance.now();
      const dt = Math.min(0.1, (now - (S.last || now)) / 1000);
      S.last = now;
      const root = node.closest(".home-lit") ?? document.body;

      // Echo at home and its light already out: nothing to hold down, nothing to do.
      if (!p.visible && S.vis === 0 && S.drawnAmt <= 0) {
        S.shown = 0;
        return;
      }

      // The page's text: read again now and then, when the browser is idle, never in this frame.
      const collect = now - S.collectedAt > COLLECT || (S.changed && now - S.collectedAt > 600);
      if ((collect || now - S.placedAt > PLACE) && !S.pending) {
        S.pending = true;
        whenIdle(() => {
          S.pending = false;
          const t = performance.now();
          if (collect) {
            S.collectedAt = t;
            S.changed = false;
            S.ground = groundOf(root);
            S.placed = runs(root, S.ground).map((run) => ({ run, left: 0, top: 0, right: 0, bottom: 0 }));
          }
          S.placedAt = t;
          S.accent = rgb(getComputedStyle(document.documentElement).getPropertyValue("--echo-accent").trim() || "#3d8ef0");
          S.ground = groundOf(root);
          for (const q of S.placed) {
            const r = q.run.el.getBoundingClientRect();
            q.left = r.left + window.scrollX;
            q.top = r.top + window.scrollY;
            q.right = r.right + window.scrollX;
            q.bottom = r.bottom + window.scrollY;
          }
        });
      }
      // Nothing read yet: the light stays out until the text it falls on is known.
      if (S.placed.length === 0 && S.collectedAt === 0) return;

      // The text within reach, and how much of the light reaches each (at its nearest point).
      const radius = s.size / 2;
      const cx = p.x + window.scrollX;
      const cy = p.y + window.scrollY;
      const near: { run: Run; f: number }[] = [];
      for (const q of S.placed) {
        const dx = Math.max(q.left - cx, 0, cx - q.right);
        const dy = Math.max(q.top - cy, 0, cy - q.bottom);
        const d = Math.hypot(dx, dy) - SLACK;
        if (d >= radius) continue;
        const run = q.run;
        // Already unreadable without the light: not the light's to fix.
        if (!reads(run.fg, run.bg, run.need)) continue;
        near.push({ run, f: falloff(Math.max(0, d) / radius) });
      }
      const behind = s.mode === "Behind";
      const ok = (strength: number) =>
        near.every(({ run, f }) => {
          const a = strength * f;
          if (behind) return !run.onGround || reads(run.fg, lit(S.ground, S.accent, a), run.need);
          return reads(screened(run.fg, S.accent, a), screened(run.bg, S.accent, a), run.need);
        });
      let safe = s.amount;
      if (!ok(safe)) {
        let lo = 0;
        let hi = safe;
        for (let i = 0; i < 12; i++) {
          const m = (lo + hi) / 2;
          if (ok(m)) lo = m;
          else hi = m;
        }
        safe = lo;
      }
      // Down at once, back up slowly; in and out with Echo.
      S.shown = safe < S.shown ? safe : S.shown + (safe - S.shown) * (1 - Math.exp(-dt * 3));
      S.vis = p.visible ? Math.min(1, S.vis + dt / 0.5) : Math.max(0, S.vis - dt / 0.5);
      const drawn = Math.min(S.shown, safe) * S.vis;

      if (Math.abs(drawn - S.drawnAmt) > 0.001) {
        S.drawnAmt = drawn;
        node.style.setProperty("--pool-amt", drawn.toFixed(4));
      }
      const x = Math.round(p.x);
      const y = Math.round(p.y);
      if (x !== S.x || y !== S.y) {
        S.x = x;
        S.y = y;
        node.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
      }
      // Told only when it changed in a way that shows: by half a pixel or more, or in strength; and never
      // while it's out (Echo at home), so a field it lies over stays still while nothing moves.
      const mode = behind ? "behind" : "over";
      const shows = drawn > 0.0005 || pool.amount > 0.0005;
      const moved = Math.abs(pool.x - p.x) > 0.5 || Math.abs(pool.y - p.y) > 0.5 || pool.r !== radius;
      const changed = Math.abs(pool.amount - drawn) > 0.001 || pool.mode !== mode || pool.colour.some((c, i) => c !== S.accent[i]);
      if (shows && (moved || changed)) {
        pool.x = p.x;
        pool.y = p.y;
        pool.r = radius;
        pool.amount = drawn;
        pool.mode = mode;
        pool.colour = S.accent;
        pool.version++;
      }
    },
  }));

  if (mode === "Off") return null;
  return <div ref={el} className="home-pool" data-mode={mode.toLowerCase()} aria-hidden="true" style={{ width: size, height: size }} />;
});
