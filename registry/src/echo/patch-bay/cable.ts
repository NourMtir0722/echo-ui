/**
 * A patch cable's curve. Pure: no React, no DOM.
 *
 * A cable hangs between two sockets: it leaves each one sideways and sags
 * under its own weight, more for a longer run. `sag` is how far the middle
 * hangs below the straight line, in px.
 */
export interface Point {
  x: number;
  y: number;
}

/** How far a cable of this length hangs when it's still. */
export function restingSag(a: Point, b: Point): number {
  const run = Math.hypot(b.x - a.x, b.y - a.y);
  return Math.min(90, 18 + run * 0.18);
}

/** The cable as an SVG path from `a` to `b`. */
export function cablePath(a: Point, b: Point, sag: number): string {
  const reach = Math.max(24, Math.abs(b.x - a.x) * 0.35);
  const dir = b.x >= a.x ? 1 : -1;
  const c1 = { x: a.x + reach * dir, y: a.y + sag };
  const c2 = { x: b.x - reach * dir, y: b.y + sag };
  const f = (n: number) => n.toFixed(1);
  return `M${f(a.x)} ${f(a.y)} C${f(c1.x)} ${f(c1.y)} ${f(c2.x)} ${f(c2.y)} ${f(b.x)} ${f(b.y)}`;
}
