/**
 * A creature on a dot-matrix screen. Pure: no React, no DOM, so what each
 * frame lights can be tested on its own.
 *
 * A character's dots are rows of text (see character.ts): `#` body, `o` eye
 * white, `*` pupil, `.` nothing. A frame is the character in a pose (eyes
 * open or shut, looking one way), placed on the screen's grid, with the few
 * marks a mood adds beside it: a question mark, a Z, a spark.
 */

export type DotInk = "body" | "eye";

/** One lit dot on the screen. Dark dots aren't listed: the grid is dark. */
export interface Dot {
  x: number;
  y: number;
  ink: DotInk;
}

/** The rows as a grid of characters, every row padded to the widest. */
export function gridOf(rows: readonly string[]): string[][] {
  const width = Math.max(0, ...rows.map((r) => r.length));
  return rows.map((r) => r.padEnd(width, ".").split(""));
}

const isEye = (c: string) => c === "o" || c === "*";

/** The rows the eyes are on, top to bottom. */
function eyeRows(grid: string[][]): number[] {
  return grid.flatMap((row, y) => (row.some(isEye) ? [y] : []));
}

/**
 * Eyes shut: the whites and pupils close into one line of white across the
 * middle of where the eyes were, the rest of them body.
 */
export function shut(grid: string[][]): string[][] {
  const rows = eyeRows(grid);
  if (rows.length === 0) return grid;
  const line = rows[Math.floor((rows.length - 1) / 2) + (rows.length > 2 ? 1 : 0)]!;
  return grid.map((row, y) => row.map((c) => (isEye(c) ? (y === line ? "o" : "#") : c)));
}

/**
 * Eyes looking left (-1), ahead (0) or right (1): in each run of white on a
 * row, the pupils move to that side of it.
 */
export function look(grid: string[][], dir: -1 | 0 | 1): string[][] {
  return grid.map((row) => {
    const out = [...row];
    let x = 0;
    while (x < out.length) {
      if (!isEye(out[x]!)) {
        x++;
        continue;
      }
      let end = x;
      while (end < out.length && isEye(out[end]!)) end++;
      const run = out.slice(x, end);
      const pupils = run.filter((c) => c === "*").length;
      if (pupils > 0 && pupils < run.length) {
        const at = dir === -1 ? 0 : dir === 1 ? run.length - pupils : Math.floor((run.length - pupils) / 2);
        for (let i = 0; i < run.length; i++) out[x + i] = i >= at && i < at + pupils ? "*" : "o";
      }
      x = end;
    }
    return out;
  });
}

/** The lit dots of a grid placed at (ox, oy) on a screen, clipped to it. */
export function place(grid: string[][], ox: number, oy: number, cols: number, rows: number): Dot[] {
  const dots: Dot[] = [];
  grid.forEach((row, y) =>
    row.forEach((c, x) => {
      const sx = ox + x;
      const sy = oy + y;
      if (sx < 0 || sy < 0 || sx >= cols || sy >= rows) return;
      if (c === "#") dots.push({ x: sx, y: sy, ink: "body" });
      else if (c === "o") dots.push({ x: sx, y: sy, ink: "eye" });
    }),
  );
  return dots;
}

/** Marks a mood draws beside the creature, in paper. */
export const MARKS = {
  question: ["###", "..#", ".##", "...", ".#."],
  z: ["###", "..#", ".#.", "#..", "###"],
  spark: [".#.", "###", ".#."],
} as const;

/** A mark's lit dots at (ox, oy). */
export function mark(rows: readonly string[], ox: number, oy: number, cols: number, screenRows: number): Dot[] {
  return place(gridOf(rows).map((r) => r.map((c) => (c === "#" ? "o" : "."))), ox, oy, cols, screenRows);
}

/** The screen a character needs: room to walk each side and to hop and dream above it. */
export function screenFor(grid: string[][]): { cols: number; rows: number } {
  const w = grid[0]?.length ?? 0;
  return { cols: w + 14, rows: grid.length + 7 };
}
