/**
 * A character's paths turned into dots, for one that doesn't bring its own.
 * Each dot is lit by how much of it the shape covers (sampled 4 × 4), so
 * lobes and notches survive at a screen's resolution. Browser only: it asks
 * the canvas whether points are inside the paths.
 */
import type { CreatureCharacter } from "./character";

const list = (d: string | readonly string[] | undefined) => (d === undefined ? [] : typeof d === "string" ? [d] : d);

export function rasterize(character: CreatureCharacter, size: number): string[] {
  const ctx = document.createElement("canvas").getContext("2d");
  if (!ctx) return [];
  const [vx = 0, vy = 0, vw = 1, vh = 1] = character.viewBox.split(/[\s,]+/).map(Number);
  const body = list(character.body).map((d) => new Path2D(d));
  const eyes = list(character.eyes).map((d) => new Path2D(d));
  const pupils = list(character.pupils).map((d) => new Path2D(d));
  const inside = (paths: Path2D[], x: number, y: number) => paths.some((p) => ctx.isPointInPath(p, x, y));
  const cell = Math.max(vw, vh) / size;
  const rows: string[] = [];
  for (let j = 0; j < size; j++) {
    let row = "";
    for (let i = 0; i < size; i++) {
      const cx = vx + (i + 0.5) * cell;
      const cy = vy + (j + 0.5) * cell;
      if (inside(pupils, cx, cy)) row += "*";
      else if (inside(eyes, cx, cy)) row += "o";
      else {
        let covered = 0;
        for (let a = 0; a < 4; a++)
          for (let b = 0; b < 4; b++) if (inside(body, vx + (i + (a + 0.5) / 4) * cell, vy + (j + (b + 0.5) / 4) * cell)) covered++;
        row += covered >= 10 ? "#" : ".";
      }
    }
    rows.push(row);
  }
  // Drop empty rows and columns round the drawing.
  const used = rows.filter((r) => r.includes("#") || r.includes("o"));
  const first = Math.min(...used.map((r) => r.search(/[^.]/)));
  const last = Math.max(...used.map((r) => r.length - 1 - [...r].reverse().join("").search(/[^.]/)));
  return used.map((r) => r.slice(first, last + 1));
}
