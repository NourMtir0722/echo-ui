"use client";

/**
 * PullCord. A switch you pull. A real Echo Switch sits at the top, and a cord
 * hangs from it with a cap on its end; grab the cap and pull, the cord
 * stretches a little, clicks at the detent, and the switch changes when you
 * let go past it. A short pull springs back and changes nothing.
 *
 * The Switch is the control: its state, its name (`label`), its focus and
 * keyboard, and its form value (`name`). The cord is a way to operate it by
 * hand, so it's hidden from assistive tech; flip the Switch any other way and
 * the cord gives a tug. What it lights is yours: anything inside `children`
 * can read `--echo-pull-on` (0 off, 1 on, on a spring) — a lamp, a room.
 */
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createSpring } from "echo-ui-core/tactile";
import { useSoundOptional, type SoundRecipe } from "echo-ui-core/sound";
import { Switch } from "../switch";
import "./pull-cord.css";

export interface PullCordProps {
  /** The switch's name, e.g. "Light". */
  label: string;
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  /** The switch's name in a form submission. */
  name?: string;
  /** Passed to the switch: its id, for a `<label for>` or an `aria-describedby`. */
  id?: string;
  disabled?: boolean;
  required?: boolean;
  /** How far the cord hangs, px. Default 120. */
  length?: number;
  /** What it lights: reads `--echo-pull-on`. Drawn behind the cord. */
  children?: ReactNode;
  className?: string;
}

const CLICK: SoundRecipe = { wave: "square", freq: 1700, decay: 0.03, gain: 0.1, bend: -500 };
const RELEASE: SoundRecipe = { ...CLICK, freq: 1300 };

/** Links in the cord, and the room it has to swing sideways. */
const LINKS = 14;
const REACH = 1.45;
const BEAD = 22;

export function PullCord({
  label,
  checked,
  defaultChecked = false,
  onCheckedChange,
  name,
  id,
  disabled,
  required,
  length = 120,
  children,
  className,
}: PullCordProps) {
  const [inner, setInner] = useState(defaultChecked);
  const on = checked ?? inner;
  const onRef = useRef(on);
  onRef.current = on;
  const change = useRef(onCheckedChange);
  change.current = onCheckedChange;
  const setOn = (next: boolean) => {
    if (checked === undefined) setInner(next);
    change.current?.(next);
  };
  const setOnRef = useRef(setOn);
  setOnRef.current = setOn;

  const sound = useSoundOptional();
  const play = useRef(sound?.play);
  play.current = sound?.play;

  const root = useRef<HTMLDivElement>(null);
  const rope = useRef<SVGPathElement>(null);
  const bead = useRef<HTMLSpanElement>(null);
  // A pull that ends past the detent flips it; `tug` pulls the cord down and
  // lets it go without flipping, for a flip that came from the Switch itself.
  const tug = useRef<() => void>(() => undefined);
  const pulled = useRef(false);
  const off = useRef(disabled);
  off.current = disabled;
  const light = useRef<ReturnType<typeof createSpring> | null>(null);

  const seg = length / (LINKS - 1);
  // The room it would like to swing in; it takes less if its container is narrower.
  const width = Math.round(length * REACH * 2);
  const height = Math.round(length * REACH + BEAD);

  // The light follows the switch, on a spring; a flip the cord didn't make
  // still gives the cord a tug.
  const was = useRef(on);
  useEffect(() => {
    light.current?.to(on ? 1 : 0, { config: on ? { duration: 0.5, bounce: 0.3 } : { duration: 0.45, bounce: 0 } });
    if (was.current !== on && !pulled.current) tug.current();
    was.current = on;
    pulled.current = false;
  }, [on]);

  useEffect(() => {
    const el = root.current!;
    const reduced = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    const lamp = createSpring(onRef.current ? 1 : 0, { duration: 0.45, bounce: 0 }, (v) =>
      el.style.setProperty("--echo-pull-on", v.toFixed(3)),
    );
    el.style.setProperty("--echo-pull-on", onRef.current ? "1" : "0");
    light.current = lamp;

    // It hangs from the middle of whatever width it was given.
    const svg = el.querySelector("svg")!;
    let W = el.clientWidth || width;
    let ax = W / 2;
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth || width;
      if (w === W) return;
      const shift = w / 2 - ax;
      W = w;
      ax = w / 2;
      svg.setAttribute("width", String(w));
      for (const p of pts) {
        p.x += shift;
        p.px += shift;
      }
      kick();
    });
    ro.observe(el);
    svg.setAttribute("width", String(W));

    // A verlet cord: points with momentum, held a link apart.
    const pts = Array.from({ length: LINKS }, (_, i) => ({ x: ax, y: i * seg, px: ax, py: i * seg }));
    let grab: { x: number; y: number } | null = null;
    let armed = false;
    let id = 0;
    // Frames in a row the cord has hung still; past a handful it stops being
    // simulated at all until a pull, a tug or a resize wakes it.
    let still = 0;
    const kick = () => {
      still = 0;
      if (!id) id = requestAnimationFrame(step);
    };
    const detent = seg * 3;

    const clampPull = (x: number, y: number) => {
      const dx = x - ax;
      const max = (LINKS - 1) * seg * REACH;
      const d = Math.hypot(dx, y);
      const p = d > max ? { x: ax + (dx / d) * max, y: (y / d) * max } : { x, y: Math.max(8, y) };
      // Never past its own edges.
      return { x: Math.min(Math.max(p.x, BEAD / 2), W - BEAD / 2), y: p.y };
    };

    const step = () => {
      let moving = 0;
      for (let i = 1; i < LINKS; i++) {
        const p = pts[i]!;
        const vx = (p.x - p.px) * 0.985;
        const vy = (p.y - p.py) * 0.985;
        moving = Math.max(moving, Math.abs(vx), Math.abs(vy));
        p.px = p.x;
        p.py = p.y;
        p.x += vx;
        p.y += vy + 0.45;
      }
      for (let k = 0; k < 12; k++) {
        pts[0]!.x = ax;
        pts[0]!.y = 0;
        if (grab) {
          pts[LINKS - 1]!.x = grab.x;
          pts[LINKS - 1]!.y = grab.y;
        }
        for (let i = 0; i < LINKS - 1; i++) {
          const a = pts[i]!;
          const b = pts[i + 1]!;
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const d = Math.hypot(dx, dy) || 1;
          // It gives a little: a cord stretches a touch before it pulls.
          const rest = grab ? seg * 1.08 : seg;
          const diff = (d - rest) / d / 2;
          if (i > 0) {
            a.x += dx * diff;
            a.y += dy * diff;
          }
          if (!(grab && i + 1 === LINKS - 1)) {
            b.x -= dx * diff;
            b.y -= dy * diff;
          }
        }
      }
      let d = `M ${pts[0]!.x} ${pts[0]!.y}`;
      for (let i = 1; i < LINKS - 1; i++) {
        const a = pts[i]!;
        const b = pts[i + 1]!;
        d += ` Q ${a.x.toFixed(1)} ${a.y.toFixed(1)} ${((a.x + b.x) / 2).toFixed(1)} ${((a.y + b.y) / 2).toFixed(1)}`;
      }
      const end = pts[LINKS - 1]!;
      d += ` L ${end.x.toFixed(1)} ${end.y.toFixed(1)}`;
      rope.current?.setAttribute("d", d);
      if (bead.current) bead.current.style.translate = `${(end.x - BEAD / 2).toFixed(1)}px ${(end.y - BEAD / 2).toFixed(1)}px`;

      if (grab) {
        const pull = end.y - (LINKS - 1) * seg;
        if (!armed && pull > detent) {
          armed = true;
          // A tug is the Switch's own flip, which already sounds.
          if (!tugging) play.current?.(CLICK);
        } else if (armed && pull < detent * 0.66) armed = false;
      }
      still = grab || moving > 0.01 ? 0 : still + 1;
      id = still > 20 ? 0 : requestAnimationFrame(step);
    };
    kick();

    const point = (e: PointerEvent) => {
      const r = el.querySelector("svg")!.getBoundingClientRect();
      return clampPull(e.clientX - r.left, e.clientY - r.top);
    };
    let tugging = 0;
    const letGo = () => {
      if (!grab) return;
      grab = null;
      if (armed && !tugging) {
        pulled.current = true;
        setOnRef.current(!onRef.current);
        play.current?.(RELEASE);
      }
      armed = false;
      tugging = 0;
    };
    const b = bead.current!;
    const down = (e: PointerEvent) => {
      if (off.current || e.button !== 0) return;
      e.preventDefault();
      b.setPointerCapture(e.pointerId);
      grab = point(e);
      armed = false;
      kick();
    };
    const move = (e: PointerEvent) => {
      if (grab) grab = point(e);
    };
    b.addEventListener("pointerdown", down);
    b.addEventListener("pointermove", move);
    b.addEventListener("pointerup", letGo);
    b.addEventListener("pointercancel", letGo);

    // The Switch flipped some other way (keyboard, a click on it, a form
    // reset): the cord is tugged down past the detent and let go.
    tug.current = () => {
      if (reduced || grab) return;
      const end = pts[LINKS - 1]!;
      grab = { x: end.x, y: (LINKS - 1) * seg + detent + 6 };
      kick();
      clearTimeout(tugging);
      tugging = window.setTimeout(letGo, 140);
    };

    return () => {
      cancelAnimationFrame(id);
      clearTimeout(tugging);
      ro.disconnect();
      lamp.stop();
      b.removeEventListener("pointerdown", down);
      b.removeEventListener("pointermove", move);
      b.removeEventListener("pointerup", letGo);
      b.removeEventListener("pointercancel", letGo);
    };
  }, [seg, width]);

  return (
    <div
      ref={root}
      className={["echo-pull-cord", className].filter(Boolean).join(" ")}
      data-on={on || undefined}
      data-disabled={disabled || undefined}
      style={{ "--echo-pull-width": `${width}px`, "--echo-pull-height": `${height}px` } as CSSProperties}
    >
      {children ? <div className="echo-pull-cord__lit">{children}</div> : null}
      {/* The fitting the cord hangs from, and the control itself. */}
      <div className="echo-pull-cord__mount">
        <Switch
          aria-label={label}
          checked={on}
          onCheckedChange={(next) => setOn(next)}
          {...(name !== undefined ? { name } : {})}
          {...(id !== undefined ? { id } : {})}
          {...(disabled !== undefined ? { disabled } : {})}
          {...(required !== undefined ? { required } : {})}
        />
      </div>
      <div className="echo-pull-cord__stage">
        <svg className="echo-pull-cord__cord" width={width} height={height} aria-hidden>
          <path ref={rope} className="echo-pull-cord__rope" />
        </svg>
        {/* A handle for the hand; the Switch above is the control. */}
        <span ref={bead} className="echo-pull-cord__bead" aria-hidden="true" style={{ left: 0, top: 0 }} />
      </div>
    </div>
  );
}
