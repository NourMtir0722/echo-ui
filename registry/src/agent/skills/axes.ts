/**
 * The seven axes a style is placed on, with what a 1, a 3 and a 5 look like
 * on each. Design Eye places a style with these; Style Fit places a product
 * with them. Written once, so the two skills measure with the same ruler, and
 * two readings of the same board land within a point of each other.
 */
import { AXES, type Axis } from "../style-schema";

export const ANCHORS: Record<Axis, { 1: string; 3: string; 5: string }> = {
  warmth: {
    1: "cool neutrals and hard geometry, no trace of a hand: lab equipment, a terminal",
    3: "neutral, with one human touch: a warm accent, a rounded corner, a photograph kept in its place",
    5: "a warm palette, marks made by hand, people in the pictures: paper grain, brush, faces",
  },
  volume: {
    1: "near-monochrome, small type, most of the page is air",
    3: "one confident accent and a clear hierarchy",
    5: "saturated fields, type the size of the screen, colour everywhere",
  },
  density: {
    1: "one idea a screen, wide margins",
    3: "cards with room between them, a few controls at a time",
    5: "tables, many controls at once, a console for an eight-hour day",
  },
  formality: {
    1: "jokes, stickers, bounce, shapes that don't line up",
    3: "friendly, and orderly",
    5: "a strict grid, an institution's voice, no play",
  },
  era: {
    1: "serifs, print craft, ledgers and archives",
    3: "timeless modern: a clean grotesque, nothing dated",
    5: "glass, light and gradients: the future as a surface",
  },
  craft: {
    1: "rough, handmade, unaligned: a zine",
    3: "tidy, with a hand still showing",
    5: "precision everywhere: every value on a scale, nothing approximate",
  },
  ornament: {
    1: "nothing that isn't needed",
    3: "one signature flourish",
    5: "pattern, illustration and decoration throughout",
  },
};

/** The anchors as the skills print them: one row an axis, what 1, 3 and 5 look like. */
export function anchorsMarkdown(): string {
  const rows = (Object.keys(AXES) as Axis[]).map((axis) => {
    const [low, high] = AXES[axis];
    const a = ANCHORS[axis];
    return `| ${axis[0]!.toUpperCase()}${axis.slice(1)} | ${low} ←→ ${high} | ${a[1]} | ${a[3]} | ${a[5]} |`;
  });
  return ["| Axis | 1 ←→ 5 | A 1 looks like | A 3 | A 5 |", "| --- | --- | --- | --- | --- |", ...rows].join("\n");
}
