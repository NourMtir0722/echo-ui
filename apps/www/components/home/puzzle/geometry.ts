/**
 * The puzzle's pieces, drawn as cells on a grid and traced into outlines.
 *
 * A layout is a few rows of characters, one per cell: a letter is a piece, a
 * dot is floor. Each piece's cells are traced into one stepped outline (every
 * corner a right angle), then pulled in on every side by half the gap, so
 * neighbours that share an edge on the grid stand apart on the page. The
 * units are grid cells: the SVGs scale to the stage, so the pieces keep their
 * proportions at any width.
 *
 * Pure: characters in, outlines out.
 */

export type Point = [number, number];

export interface Traced {
  /** The outline, clockwise (y down), pulled in by half the gap. */
  points: Point[];
  /** Its bounding box on the grid, before the pull. */
  box: { x: number; y: number; w: number; h: number };
  /** The biggest rectangle inside it: where its words go. */
  body: { x: number; y: number; w: number; h: number };
}

/** The cells a letter covers, as "x,y" keys. */
export function cellsOf(rows: readonly string[], letter: string): Set<string> {
  const cells = new Set<string>();
  rows.forEach((row, y) => [...row].forEach((c, x) => c === letter && cells.add(`${x},${y}`)));
  return cells;
}

/**
 * The outline of a set of cells: every cell edge with no cell of the set on
 * its other side, joined end to end, clockwise, with straight runs merged.
 * The set must be one piece without holes.
 */
export function trace(cells: Set<string>): Point[] {
  const has = (x: number, y: number) => cells.has(`${x},${y}`);
  const next = new Map<string, Point>();
  const key = (p: Point) => `${p[0]},${p[1]}`;
  for (const c of cells) {
    const [x, y] = c.split(",").map(Number) as [number, number];
    if (!has(x, y - 1)) next.set(key([x, y]), [x + 1, y]);
    if (!has(x + 1, y)) next.set(key([x + 1, y]), [x + 1, y + 1]);
    if (!has(x, y + 1)) next.set(key([x + 1, y + 1]), [x, y + 1]);
    if (!has(x - 1, y)) next.set(key([x, y + 1]), [x, y]);
  }
  // Start at the top-left-most corner, which is always a convex corner.
  const first = [...next.keys()]
    .map((k) => k.split(",").map(Number) as Point)
    .sort((a, b) => a[1] - b[1] || a[0] - b[0])[0]!;
  const path: Point[] = [first];
  let at = next.get(key(first))!;
  while (key(at) !== key(first)) {
    path.push(at);
    at = next.get(key(at))!;
  }
  // Merge straight runs: keep only the corners.
  return path.filter((p, i) => {
    const a = path[(i - 1 + path.length) % path.length]!;
    const b = path[(i + 1) % path.length]!;
    return !((a[0] === p[0] && p[0] === b[0]) || (a[1] === p[1] && p[1] === b[1]));
  });
}

/**
 * Pull a clockwise right-angled outline in by `d` on every side. For two edges
 * at a right angle, the corner of the pulled-in outline is the old corner
 * moved by `d` along both edges' inward normals.
 */
export function inset(points: readonly Point[], d: number): Point[] {
  const n = points.length;
  const dir = (a: Point, b: Point): Point => [Math.sign(b[0] - a[0]), Math.sign(b[1] - a[1])];
  // Clockwise with y down, the inside is on the right of travel: (-dy, dx).
  const inward = ([dx, dy]: Point): Point => [-dy, dx];
  return points.map((p, i) => {
    const d1 = dir(points[(i - 1 + n) % n]!, p);
    const d2 = dir(p, points[(i + 1) % n]!);
    const n1 = inward(d1);
    const n2 = inward(d2);
    return [p[0] + d * (n1[0] + n2[0]), p[1] + d * (n1[1] + n2[1])];
  });
}

/** The biggest rectangle of whole cells inside a set (a small brute force: the grids are tiny). */
function largestRect(cells: Set<string>, box: Traced["box"]) {
  let best = { x: box.x, y: box.y, w: 1, h: 1, area: 0 };
  for (let y0 = box.y; y0 < box.y + box.h; y0++)
    for (let x0 = box.x; x0 < box.x + box.w; x0++) {
      if (!cells.has(`${x0},${y0}`)) continue;
      let maxW = Infinity;
      for (let y1 = y0; y1 < box.y + box.h && cells.has(`${x0},${y1}`); y1++) {
        let w = 0;
        while (cells.has(`${x0 + w},${y1}`) && w < maxW) w++;
        maxW = Math.min(maxW, w);
        const h = y1 - y0 + 1;
        // Prefer wide rectangles: words run across.
        const area = maxW * h * (maxW >= h ? 1.15 : 1);
        if (area > best.area) best = { x: x0, y: y0, w: maxW, h, area };
      }
    }
  return { x: best.x, y: best.y, w: best.w, h: best.h };
}

export function tracePiece(rows: readonly string[], letter: string, gap: number): Traced {
  const cells = cellsOf(rows, letter);
  const outline = trace(cells);
  const xs = outline.map((p) => p[0]);
  const ys = outline.map((p) => p[1]);
  const box = { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
  return { points: inset(outline, gap / 2), box, body: largestRect(cells, box) };
}

/**
 * An outline as an SVG path, moved so `origin` is 0,0 and down by `dy`, with
 * every corner rounded by `r` (a molded edge, never a cut one). The corners
 * are all right angles and every edge is longer than 2r, so each corner is a
 * quarter curve between two points r either side of it.
 */
export function toPath(points: readonly Point[], origin: Point = [0, 0], dy = 0, r = 0): string {
  const f = (v: number) => +v.toFixed(3);
  const at = ([x, y]: Point) => `${f(x - origin[0])} ${f(y - origin[1] + dy)}`;
  if (r <= 0) return `M${points.map(at).join("L")}Z`;
  const n = points.length;
  const toward = (a: Point, b: Point, d: number): Point => [a[0] + Math.sign(b[0] - a[0]) * d, a[1] + Math.sign(b[1] - a[1]) * d];
  let d = "";
  points.forEach((p, i) => {
    const prev = points[(i - 1 + n) % n]!;
    const next = points[(i + 1) % n]!;
    const inPt = toward(p, prev, r);
    const outPt = toward(p, next, r);
    d += `${i === 0 ? "M" : "L"}${at(inPt)}Q${at(p)} ${at(outPt)}`;
  });
  return `${d}Z`;
}
