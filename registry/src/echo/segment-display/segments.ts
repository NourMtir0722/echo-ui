/**
 * The seven-segment face. Pure: no React, no DOM, so what lights for a given
 * reading can be tested on its own and shared by everything that draws
 * segments (SegmentDisplay, and the readouts inside Tuner and Keypad).
 *
 *    ─a─
 *   f   b
 *    ─g─
 *   e   c
 *    ─d─   .dp
 *
 * A real segment display never loses the segments it isn't using: they sit
 * dark under the glass, faintly visible. So a cell always draws all seven,
 * and a reading only decides which of them are lit.
 */

export type Segment = "a" | "b" | "c" | "d" | "e" | "f" | "g";
export const SEGMENTS: readonly Segment[] = ["a", "b", "c", "d", "e", "f", "g"];

/** Which segments each character lights. What a seven-segment face can draw, and nothing it can't. */
const FACE: Readonly<Record<string, string>> = {
  "0": "abcdef",
  "1": "bc",
  "2": "abdeg",
  "3": "abcdg",
  "4": "bcfg",
  "5": "acdfg",
  "6": "acdefg",
  "7": "abc",
  "8": "abcdefg",
  "9": "abcdfg",
  " ": "",
  "-": "g",
  _: "d",
  "°": "abfg",
  A: "abcefg",
  b: "cdefg",
  C: "adef",
  c: "deg",
  d: "bcdeg",
  E: "adefg",
  F: "aefg",
  G: "acdef",
  H: "bcefg",
  h: "cefg",
  I: "ef",
  J: "bcde",
  L: "def",
  n: "ceg",
  o: "cdeg",
  P: "abefg",
  r: "eg",
  S: "acdfg",
  t: "defg",
  U: "bcdef",
  u: "cde",
  y: "bcdfg",
};

/** The segments a character lights, or null when the face can't draw it. */
export function segmentsFor(ch: string): readonly Segment[] | null {
  const lit = FACE[ch] ?? FACE[ch.toUpperCase()] ?? FACE[ch.toLowerCase()];
  return lit === undefined ? null : (lit.split("") as Segment[]);
}

/** Whether every character of `text` can be drawn (a dot and a colon always can). */
export function canDraw(text: string): boolean {
  return [...text].every((ch) => ch === "." || ch === ":" || segmentsFor(ch) !== null);
}

/**
 * One position on the face.
 *
 * - `digit`: a seven-segment cell; `lit` is what shows, `dp` its decimal point.
 * - `colon`: the two dots between hours and minutes.
 *
 * `pad` marks a cell the reading didn't fill, added to reach `digits`: a
 * padding zero prints dim (a counter's leading zeros), a padding blank shows
 * only its dark segments.
 */
export type Cell =
  | { kind: "digit"; lit: readonly Segment[]; dp: boolean; pad: boolean }
  | { kind: "colon" };

/**
 * Lays a reading out on the face: right-aligned, the way a counter's digits
 * are, so a shorter reading gains cells on the left.
 *
 * A dot lights the decimal point of the cell before it (a dot with no cell
 * before it gets a blank one); a colon is its own narrow cell. A character
 * the face can't draw is a blank cell.
 */
export function layout(text: string, digits = 0, pad: "0" | " " = "0"): Cell[] {
  const cells: Cell[] = [];
  for (const ch of text) {
    if (ch === ".") {
      const last = cells.at(-1);
      if (last && last.kind === "digit" && !last.dp) cells[cells.length - 1] = { ...last, dp: true };
      else cells.push({ kind: "digit", lit: [], dp: true, pad: false });
      continue;
    }
    if (ch === ":") {
      cells.push({ kind: "colon" });
      continue;
    }
    cells.push({ kind: "digit", lit: segmentsFor(ch) ?? [], dp: false, pad: false });
  }
  const count = cells.filter((c) => c.kind === "digit").length;
  const fill: Cell[] = [];
  for (let i = count; i < digits; i++) {
    fill.push({ kind: "digit", lit: pad === "0" ? (segmentsFor("0") ?? []) : [], dp: false, pad: true });
  }
  // A minus leads its padding zeros (-05, never 0-5); blanks still lead the lot.
  if (pad === "0" && text.startsWith("-")) return [cells[0]!, ...fill, ...cells.slice(1)];
  return [...fill, ...cells];
}

/* ---- Geometry, in one cell's units: 60 wide, 100 tall -------------------- */

export const CELL_W = 60;
export const COLON_W = 22;
export const CELL_H = 100;

const L = 10;
const R = 46;
const T = 6;
const M = 50;
const B = 94;
/** How thick a segment is, and the gap where two meet. */
const TH = 9;
const GAP = 2.5;

function horizontal(y: number, x1: number, x2: number): string {
  const h = TH / 2;
  return `${x1},${y} ${x1 + h},${y - h} ${x2 - h},${y - h} ${x2},${y} ${x2 - h},${y + h} ${x1 + h},${y + h}`;
}
function vertical(x: number, y1: number, y2: number): string {
  const h = TH / 2;
  return `${x},${y1} ${x + h},${y1 + h} ${x + h},${y2 - h} ${x},${y2} ${x - h},${y2 - h} ${x - h},${y1 + h}`;
}

/** Each segment's polygon points in a cell. */
export const SEGMENT_POINTS: Readonly<Record<Segment, string>> = {
  a: horizontal(T, L + GAP, R - GAP),
  g: horizontal(M, L + GAP, R - GAP),
  d: horizontal(B, L + GAP, R - GAP),
  f: vertical(L, T + GAP, M - GAP),
  b: vertical(R, T + GAP, M - GAP),
  e: vertical(L, M + GAP, B - GAP),
  c: vertical(R, M + GAP, B - GAP),
};

/** The decimal point, bottom right of a cell. */
export const DP = { cx: R + 8, cy: B, r: 4.5 } as const;
/** The colon's two dots, centred in its cell. */
export const COLON_DOTS = [
  { cx: COLON_W / 2, cy: 32, r: 4.5 },
  { cx: COLON_W / 2, cy: 68, r: 4.5 },
] as const;

/** A segment face leans forward, as they do. The lean moves the bottom left. */
export const LEAN = 5;
/** How far the lean pushes a cell's bottom left, so the face can make room for it. */
export const LEAN_OFFSET = Math.ceil(Math.tan((LEAN * Math.PI) / 180) * CELL_H);

/** Where each cell starts, and the face's whole width. */
export function place(cells: readonly Cell[]): { x: number[]; width: number } {
  const x: number[] = [];
  let at = LEAN_OFFSET;
  for (const cell of cells) {
    x.push(at);
    at += cell.kind === "colon" ? COLON_W : CELL_W;
  }
  return { x, width: at };
}
