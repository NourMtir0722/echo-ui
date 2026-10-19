/**
 * The canonical vectors as points: an SVG path flattened into polylines.
 *
 * The bloom needs the mark's outline as numbers (to grow into it exactly), and
 * the tests need it to check the drawing itself. Covers the commands the brand
 * paths use — M L H V C S Q T Z, absolute and relative — not arcs.
 *
 * Pure: no DOM, no window.
 */
export type Pt = readonly [number, number];

const TOKEN = /([MmLlHhVvCcSsQqTtZz])|(-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?)/g;

/** Each subpath as a polyline; curves are cut into `perCurve` straight steps. */
export function flatten(d: string, perCurve = 16): Pt[][] {
  const tokens = [...d.matchAll(TOKEN)].map((m) => m[1] ?? Number(m[2]));
  const out: Pt[][] = [];
  let sub: Pt[] = [];
  let x = 0;
  let y = 0;
  let sx = 0;
  let sy = 0;
  // The last control point, for S and T.
  let cx = 0;
  let cy = 0;
  let prev = "";
  let cmd = "";
  let i = 0;

  const num = () => tokens[i++] as number;
  const push = (px: number, py: number) => {
    sub.push([px, py]);
    x = px;
    y = py;
  };
  const cubic = (x1: number, y1: number, x2: number, y2: number, ex: number, ey: number) => {
    const x0 = x;
    const y0 = y;
    for (let k = 1; k <= perCurve; k++) {
      const t = k / perCurve;
      const u = 1 - t;
      push(
        u * u * u * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * ex,
        u * u * u * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * ey,
      );
    }
    cx = x2;
    cy = y2;
  };
  const quad = (x1: number, y1: number, ex: number, ey: number) => {
    const x0 = x;
    const y0 = y;
    for (let k = 1; k <= perCurve; k++) {
      const t = k / perCurve;
      const u = 1 - t;
      push(u * u * x0 + 2 * u * t * x1 + t * t * ex, u * u * y0 + 2 * u * t * y1 + t * t * ey);
    }
    cx = x1;
    cy = y1;
  };

  while (i < tokens.length) {
    const t = tokens[i];
    if (typeof t === "string") {
      cmd = t;
      i++;
    } else if (cmd === "M") cmd = "L";
    else if (cmd === "m") cmd = "l";

    const rel = cmd === cmd.toLowerCase();
    const ox = rel ? x : 0;
    const oy = rel ? y : 0;
    switch (cmd.toUpperCase()) {
      case "M": {
        if (sub.length) out.push(sub);
        sub = [];
        const px = ox + num();
        const py = oy + num();
        push(px, py);
        sx = px;
        sy = py;
        break;
      }
      case "L":
        push(ox + num(), oy + num());
        break;
      case "H":
        push(ox + num(), y);
        break;
      case "V":
        push(x, oy + num());
        break;
      case "C":
        cubic(ox + num(), oy + num(), ox + num(), oy + num(), ox + num(), oy + num());
        break;
      case "S": {
        const smooth = /[CcSs]/.test(prev);
        const x1 = smooth ? 2 * x - cx : x;
        const y1 = smooth ? 2 * y - cy : y;
        cubic(x1, y1, ox + num(), oy + num(), ox + num(), oy + num());
        break;
      }
      case "Q":
        quad(ox + num(), oy + num(), ox + num(), oy + num());
        break;
      case "T": {
        const smooth = /[QqTt]/.test(prev);
        quad(smooth ? 2 * x - cx : x, smooth ? 2 * y - cy : y, ox + num(), oy + num());
        break;
      }
      case "Z":
        x = sx;
        y = sy;
        if (sub.length) out.push(sub);
        sub = [];
        break;
      default:
        throw new Error(`flatten: unsupported path command "${cmd}"`);
    }
    prev = cmd;
  }
  if (sub.length) out.push(sub);
  return out;
}

/** Signed area of a closed polyline (positive = clockwise on screen). */
export function area(poly: readonly Pt[]): number {
  let a = 0;
  for (let k = 0; k < poly.length; k++) {
    const [x1, y1] = poly[k]!;
    const [x2, y2] = poly[(k + 1) % poly.length]!;
    a += x1 * y2 - x2 * y1;
  }
  return a / 2;
}
