"use client";

/**
 * Liquid — the lit cap that moves between options.
 *
 * One part, not a highlight that jumps: a selection, a hovered menu item, a
 * chosen tab is marked by a single cap that travels there on a real spring.
 * While it moves it flows into a drop — the front swelling round, the tail
 * thinning behind, drawn out by speed — and the key light's highlight rolls
 * across it. At rest it is always the molded cap. Redirect it mid-flight and it
 * bends toward the new target with the momentum it has.
 *
 * The engine owns travel and shape along one axis. The component owns what
 * the cap means: where it goes, how high it is lifted, what it lights up —
 * through `onDraw`, called every frame with the cap's current box.
 */
import { springs } from "../motion/motion";
import { createSpring, type Spring, type SpringConfig } from "./spring";

export type LiquidAxis = "x" | "y";

export interface CapEnd {
  /** Thickness of this end, px, centred across the axis. */
  h: number;
  /** Corner radius at this end, px. */
  r: number;
}

const n = (v: number) => Number(v.toFixed(2));

/**
 * The cap's outline as a CSS `clip-path: path()`, in its own box's pixels.
 * `length` runs along the axis, `thickness` across it; the two ends can each
 * be a different thickness and radius. Both ends full and at the rest radius
 * is the cap at rest; one end thinned and both rounded is a drop.
 */
export function capOutline(
  length: number,
  thickness: number,
  start: CapEnd,
  end: CapEnd,
  axis: LiquidAxis = "x",
): string {
  const cv = thickness / 2;
  const fit = (e: CapEnd) => {
    const h = Math.max(0, Math.min(thickness, e.h));
    return { h, r: Math.max(0, Math.min(e.r, h / 2, length / 2)) };
  };
  const a = fit(start);
  const b = fit(end);
  // Points in (along, across); swapped into (x, y) for a vertical cap. The
  // swap mirrors the outline, so the arcs sweep the other way.
  const pt = (u: number, v: number) => (axis === "x" ? `${n(u)} ${n(v)}` : `${n(v)} ${n(u)}`);
  const sweep = axis === "x" ? 1 : 0;
  const arc = (r: number, u: number, v: number) => `A ${n(r)} ${n(r)} 0 0 ${sweep} ${pt(u, v)}`;
  const aTop = cv - a.h / 2;
  const aBot = cv + a.h / 2;
  const bTop = cv - b.h / 2;
  const bBot = cv + b.h / 2;
  return (
    `path("M ${pt(a.r, aTop)}` +
    ` L ${pt(length - b.r, bTop)} ${arc(b.r, length, bTop + b.r)}` +
    ` L ${pt(length, bBot - b.r)} ${arc(b.r, length - b.r, bBot)}` +
    ` L ${pt(a.r, aBot)} ${arc(a.r, 0, aBot - a.r)}` +
    ` L ${pt(0, aTop + a.r)} ${arc(a.r, a.r, aTop)} Z")`
  );
}

export interface LiquidBox {
  /** Leading edge along the axis, px, in the container's coordinates. */
  start: number;
  /** Length along the axis, px. */
  size: number;
  /** 0 at rest → 1 at full speed. */
  speed: number;
  /** +1 moving toward larger coordinates, -1 toward smaller. */
  direction: number;
}

export interface LiquidOptions {
  /** The positioned box the engine moves and sizes along the axis. */
  el: HTMLElement;
  /** The material inside it, clipped to the cap's outline. */
  shape: HTMLElement;
  axis?: LiquidAxis;
  /** The cap's corner radius at rest, px. */
  restRadius?: () => number;
  /** How far the drop draws out at full speed (0.24 = 24% longer). */
  stretch?: number;
  /** How thin the tail gets at full speed (0.5 = half). */
  taper?: number;
  /** Speed, px/s, that counts as full speed. */
  fullSpeed?: number;
  /**
   * Flow into a drop while moving (default). Off, the cap keeps its molded
   * outline and says speed only by drawing out along its path: a row far
   * wider than it is tall can't taper without turning into a wedge.
   */
  morph?: boolean;
  onDraw?: (box: LiquidBox) => void;
  /** Called once when a travel ends at its target. */
  onArrive?: () => void;
}

export interface Liquid {
  /** Where the cap's centre is heading, or null when it has arrived. */
  readonly heading: number | null;
  readonly centre: number;
  readonly velocity: number;
  /**
   * Send the cap to a box (`start`, `size` along the axis). "instant" puts it
   * there; a spring config sends it, keeping its momentum, or with `velocity`.
   */
  place(box: { start: number; size: number }, how: "instant" | SpringConfig, velocity?: number): void;
  /** Glue the centre to a point (a drag), without calling it a travel. */
  follow(centre: number, size?: number): void;
  redraw(): void;
  destroy(): void;
}

export function createLiquid(options: LiquidOptions): Liquid {
  const {
    el,
    shape,
    axis = "x",
    restRadius = () => 8,
    stretch = 0.24,
    taper = 0.5,
    fullSpeed = 1400,
    morph = true,
    onDraw,
    onArrive,
  } = options;
  let heading: number | null = null;

  const draw = () => {
    const c = centre.value;
    const v = centre.velocity;
    const w = Math.max(0, size.value);
    const thickness = axis === "x" ? el.offsetHeight : el.offsetWidth;
    const R = restRadius();
    const dir = v >= 0 ? 1 : -1;
    const speed = Math.min(1, Math.abs(v) / fullSpeed);

    const length = w * (1 + stretch * speed);
    const start = c - length / 2 + dir * w * 0.05 * speed;
    const k = Math.min(1, speed * 3);
    const tailH = thickness * (1 - taper * speed);
    const tail = { h: tailH, r: R + (tailH / 2 - R) * k };
    const front = { h: thickness, r: R + (thickness / 2 - R) * k };

    if (axis === "x") {
      el.style.left = `${start}px`;
      el.style.width = `${length}px`;
    } else {
      el.style.top = `${start}px`;
      el.style.height = `${length}px`;
    }
    shape.style.clipPath =
      morph && speed > 0.01
        ? dir > 0
          ? capOutline(length, thickness, tail, front, axis)
          : capOutline(length, thickness, front, tail, axis)
        : "";
    // Still plastic while it flows: the highlight rolls across, trailing.
    shape.style.setProperty("--sheen", `${50 - dir * 30 * speed}%`);
    shape.style.setProperty("--roll", speed.toFixed(3));

    if (heading !== null && Math.abs(c - heading) < 1.5 && Math.abs(v) < 60) {
      heading = null;
      onArrive?.();
    }
    onDraw?.({ start, size: length, speed, direction: dir });
  };

  const centre: Spring = createSpring(0, springs.snappy, draw);
  const size: Spring = createSpring(0, springs.snappy, draw);

  return {
    get heading() {
      return heading;
    },
    get centre() {
      return centre.value;
    },
    get velocity() {
      return centre.velocity;
    },
    place(box, how, velocity) {
      const c = box.start + box.size / 2;
      if (how === "instant") {
        heading = null;
        centre.set(c);
        size.set(box.size);
        return;
      }
      heading = c;
      centre.to(c, { config: how, velocity });
      size.to(box.size, { config: springs.snappy });
    },
    follow(c, s) {
      heading = null;
      centre.to(c, { config: springs.track });
      if (s !== undefined) size.to(s, { config: springs.snappy });
    },
    redraw: draw,
    destroy() {
      centre.stop();
      size.stop();
    },
  };
}
