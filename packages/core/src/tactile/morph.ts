"use client";

/**
 * MorphEngine — a set of parts on springs, drawn as one fused body.
 *
 * Each part has springs for its two edges, its height, its sink (pressed), how
 * lit it is and, for a meter, how full; each label has a spring for how shown
 * it is and rides on a part (or on the whole, -1). Every spring schedules one
 * draw per frame, and the draw writes the outline into the surface's paths,
 * the tone into its gradient stops, and each label's box.
 *
 * The component owns what the parts mean — where they go, when a label comes
 * in — through `go`, `move`, `bud`, `absorb`, `show` and `later`. Under
 * reduced motion every spring jumps to its target and delays collapse to zero,
 * so the end states are the same and only the label fades remain.
 */
import { createSpring, type Spring, type SpringConfig } from "./spring";
import { outline, type MorphPill } from "./morph-outline";

/** "meter" is neutral, lit with accent from the left up to its `fill`. */
export type MorphTone = "neutral" | "accent" | "meter";

export interface MorphPart {
  x0: Spring;
  x1: Spring;
  h: Spring;
  sink: Spring;
  lit: Spring;
  /** For a meter: how much of it is lit, 0..1. */
  fill: Spring;
  tone: MorphTone;
}

export interface MorphEls {
  /** Paths that take the body's outline (seam, fills, light, gloss, clip). */
  paths: SVGPathElement[];
  /** Paths that take the outline grown by `well` (the recess it sits in). */
  wells: SVGPathElement[];
  /**
   * The accent mask's stops, four per part: white, with the opacity of how
   * much of that stretch is lit. The accent cap is drawn through this mask
   * over the neutral cap, so each keeps its own vertical gradient.
   */
  stops: SVGStopElement[];
  labels: (HTMLElement | null)[];
}

const fade: SpringConfig = { duration: 0.28, bounce: 0 };

export class MorphEngine {
  parts: MorphPart[];
  shows: Spring[];
  /** Which part each label rides on; -1 is the whole. */
  labelPart: number[];
  /** 0 is the whole, 1 is the parts. */
  t: Spring;
  /** The whole the parts divide out of: edges, sink, and height (0 = none). */
  wx0: Spring;
  wx1: Spring;
  wsink: Spring;
  wh = 0;
  k = 24;
  radius = Infinity;
  /** Rim of the recessed well around the body, px (0 draws no well). */
  well = 0;
  /** Stretch every spring and delay (slow motion, for inspecting). */
  slow = 1;
  reduced = false;
  onBodies?: (now: number, before: number) => void;

  private bodies = -1;
  private settled: (() => void) | null = null;
  private queued = false;
  private timers: ReturnType<typeof setTimeout>[] = [];

  constructor(
    private els: MorphEls,
    tones: MorphTone[],
    labelPart: number[],
    private width: number,
    private cy: number,
  ) {
    this.width = Math.max(1, width);
    const s = (v: number) => createSpring(v, fade, this.schedule);
    this.parts = tones.map((tone) => ({ x0: s(0), x1: s(0), h: s(0), sink: s(0), lit: s(0), fill: s(0), tone }));
    this.labelPart = labelPart;
    this.shows = labelPart.map(() => s(0));
    this.t = s(1);
    this.wx0 = s(0);
    this.wx1 = s(0);
    this.wsink = s(0);
  }

  /** The surface's size changed (its labels were measured, or fonts loaded). */
  resize(width: number, cy = this.cy) {
    this.width = Math.max(1, width);
    this.cy = cy;
    this.draw();
  }

  /** Natural width of a label's content, px. */
  measure(i: number): number {
    const inner = this.els.labels[i]?.firstElementChild as HTMLElement | null;
    return inner ? inner.offsetWidth : 0;
  }

  private schedule = () => {
    if (this.queued) return;
    this.queued = true;
    queueMicrotask(() => {
      this.queued = false;
      this.draw();
    });
  };

  /** Send a spring, in slow motion if asked, with an optional kick (units/s). */
  go(s: Spring, to: number, c: SpringConfig, velocity?: number) {
    if (this.reduced) return s.set(to);
    s.to(to, {
      config: { duration: c.duration * this.slow, bounce: c.bounce },
      velocity: velocity === undefined ? undefined : velocity / this.slow,
    });
  }

  /** Fade a label; under reduced motion this is the only motion left. */
  show(i: number, on: boolean, c: SpringConfig = fade) {
    const s = this.shows[i]!;
    s.to(on ? 1 : 0, { config: this.reduced ? { duration: 0.16, bounce: 0 } : { ...c, duration: c.duration * this.slow } });
  }

  later(seconds: number, fn: () => void) {
    this.timers.push(setTimeout(fn, this.reduced ? 0 : seconds * 1000 * this.slow));
  }

  /** Drop every pending `later`. */
  cancel() {
    this.timers.forEach(clearTimeout);
    this.timers = [];
  }

  /** Call `fn` once, the next time every spring has come to rest. */
  whenSettled(fn: () => void) {
    this.settled = fn;
    this.draw();
  }

  /**
   * At rest to the eye: every spring within a hair of its target and nearly
   * still. Waiting for the last hundredth of a pixel would hold a hand-off
   * for a second after the motion has visibly ended.
   */
  private atRest(): boolean {
    const near = (s: Spring, tol: number) => !s.moving || (Math.abs(s.value - s.target) < tol && Math.abs(s.velocity) < tol * 40);
    const px = [...this.parts.flatMap((p) => [p.x0, p.x1, p.h]), this.wx0, this.wx1];
    const unit = [...this.parts.flatMap((p) => [p.sink, p.lit, p.fill]), ...this.shows, this.t, this.wsink];
    return px.every((s) => near(s, 0.5)) && unit.every((s) => near(s, 0.01));
  }

  /** Put part `i` at [x0, x1] with height h, at rest. */
  place(i: number, x0: number, x1: number, h: number) {
    const p = this.parts[i]!;
    p.x0.set(x0);
    p.x1.set(x1);
    p.h.set(h);
  }

  /** Send part `i` to [x0, x1] at height h; `kick` swells it as it lands. */
  move(i: number, x0: number, x1: number, h: number, c: SpringConfig, kick?: number) {
    const p = this.parts[i]!;
    this.go(p.x0, x0, c);
    this.go(p.x1, x1, c);
    this.go(p.h, h, c, kick);
  }

  /** Grow part `i` out of the point `from` (inside another part) to a box. */
  bud(i: number, from: number, x0: number, x1: number, h: number, c: SpringConfig, kick?: number) {
    this.place(i, from - 1, from + 1, 2);
    this.move(i, x0, x1, h, c, kick);
  }

  /** Draw part `i` into the point `x`, shrinking to nothing: it is swallowed. */
  absorb(i: number, x: number, c: SpringConfig) {
    this.move(i, x, x, 0, c);
  }

  destroy() {
    // A destroyed morph never settles: its stopped springs would read as at
    // rest and hand off a change a newer morph is still drawing.
    this.settled = null;
    this.cancel();
    for (const p of this.parts) for (const s of [p.x0, p.x1, p.h, p.sink, p.lit, p.fill]) s.stop();
    for (const s of [...this.shows, this.t, this.wx0, this.wx1, this.wsink]) s.stop();
  }

  draw() {
    const pills: MorphPill[] = this.parts.map((p) => ({
      x0: p.x0.value,
      x1: p.x1.value,
      h: p.h.value,
      y: 2 * p.sink.value,
      r: this.radius,
    }));
    const whole: MorphPill | null =
      this.wh > 0
        ? { x0: this.wx0.value, x1: this.wx1.value, h: this.wh, y: 2 * this.wsink.value, r: this.radius }
        : null;
    const field = { parts: pills, k: this.k, whole, t: this.t.value };
    const d = outline(field, this.cy);
    for (const path of this.els.paths) path.setAttribute("d", d);
    if (this.els.wells.length) {
      const w = this.well > 0 ? outline(field, this.cy, this.well) : "";
      for (const path of this.els.wells) path.setAttribute("d", w);
    }

    const count = d ? d.split("M").length - 1 : 0;
    if (this.bodies >= 0 && count !== this.bodies) this.onBodies?.(count, this.bodies);
    this.bodies = count;

    // The accent mask runs left to right across the parts. Where two parts
    // touch, their stretches blend across the join instead of cutting; the
    // blend fades out as they part, so no colour bleeds across a gap. A part
    // swallowed to nothing takes no stretch; hidden ones go last.
    const seen = (i: number) => pills[i]!.x1 - pills[i]!.x0 >= 1 && pills[i]!.h >= 1;
    const all = this.parts.map((_, i) => i);
    const order = [...all.filter(seen).sort((a, b) => pills[a]!.x0 - pills[b]!.x0), ...all.filter((i) => !seen(i))];
    let at = 0;
    let last = 0;
    const write = (j: number, marks: [number, number][]) =>
      marks.forEach(([off, lit], k) => {
        const stop = this.els.stops[4 * j + k];
        if (!stop) return;
        stop.setAttribute("offset", off.toFixed(4));
        stop.setAttribute("stop-opacity", lit.toFixed(3));
      });
    order.forEach((i, j) => {
      if (!seen(i)) return write(j, [[1, last], [1, last], [1, last], [1, last]]);
      const p = this.parts[i]!;
      const box = pills[i]!;
      const prev = j > 0 ? pills[order[j - 1]!]! : null;
      const n1 = order[j + 1];
      const next = n1 !== undefined && seen(n1) ? pills[n1]! : null;
      const soft = (gap: number) => Math.min(14, (box.x1 - box.x0) / 4) * Math.max(0, 1 - gap / 12);
      const a = Math.max(at, (box.x0 + (prev ? soft(box.x0 - prev.x1) : 0)) / this.width);
      const b = Math.max(a, (box.x1 - (next ? soft(next.x0 - box.x1) : 0)) / this.width);
      at = b;
      const lit = p.tone === "accent" ? Math.max(0, Math.min(1, p.lit.value)) : 0;
      if (p.tone === "meter") {
        const f = Math.max(0, Math.min(1, p.fill.value));
        const m = Math.max(a, Math.min(b, (box.x0 + (box.x1 - box.x0) * f) / this.width));
        const on = f > 0 ? 1 : 0;
        write(j, [[a, on], [m, on], [m, 0], [b, 0]]);
        last = 0;
      } else {
        write(j, [[a, lit], [a, lit], [b, lit], [b, lit]]);
        last = lit;
      }
    });

    this.labelPart.forEach((pi, i) => {
      const el = this.els.labels[i];
      if (!el) return;
      const box = pi < 0 ? whole : pills[pi];
      if (!box) return;
      const shown = Math.max(0, Math.min(1, this.shows[i]!.value));
      el.style.left = `${box.x0}px`;
      el.style.width = `${Math.max(0, box.x1 - box.x0)}px`;
      el.style.height = `${box.h}px`;
      el.style.top = `${this.cy - box.h / 2 + (box.y ?? 0)}px`;
      el.style.opacity = shown.toFixed(3);
      el.style.setProperty("--in", shown.toFixed(3));
      el.dataset.shown = shown > 0.5 ? "true" : "false";
    });

    if (this.settled && this.atRest()) {
      const fn = this.settled;
      this.settled = null;
      queueMicrotask(fn);
    }
  }
}
