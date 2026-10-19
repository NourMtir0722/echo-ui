/**
 * The style sheet's drawing (StyleSheets.tsx): the parts the style is for,
 * drawn as a blueprint. A button, a segmented control, a slider, a knob and
 * a switch, the parts Pick it, and try it on shows for real, each where it
 * sits on the sheet, in the drawing's own units (`VIEW`). Where something is
 * solid in the style (Ink Instrument fills what's on and what's chosen with
 * its ink), the drawing fills it too, after its outline.
 *
 * Every line has a length of 1 (`pathLength`), so a dash offset from 1 to 0
 * draws it, at any size.
 */

export const VIEW = { w: 480, h: 310 } as const;

const n = (v: number) => Math.round(v * 100) / 100;
const pt = (x: number, y: number) => `${n(x)} ${n(y)}`;

/** A rounded rectangle as one path, drawn clockwise from the top of its left end. */
function pill(x: number, y: number, w: number, h: number, r = h / 2) {
  return `M${pt(x + r, y)}H${n(x + w - r)}A${r} ${r} 0 0 1 ${pt(x + w - r, y + h)}H${n(x + r)}A${r} ${r} 0 0 1 ${pt(x + r, y)}Z`;
}

const circle = (cx: number, cy: number, r: number) => `M${pt(cx - r, cy)}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`;

/** A point on a circle, at `deg` degrees clockwise from twelve o'clock. */
function polar(cx: number, cy: number, r: number, deg: number): [number, number] {
  const t = ((deg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(t), cy + r * Math.sin(t)];
}

/** Where each part sits, in the drawing's units: the box a real component takes its place in. */
export const PARTS = {
  button: { x: 24, y: 30, w: 160, h: 44 },
  segmented: { x: 24, y: 118, w: 270, h: 40 },
  slider: { x: 24, y: 240, w: 270, h: 28 },
  knob: { x: 335, y: 38, w: 116, h: 132 },
  switch: { x: 351, y: 232, w: 84, h: 44 },
} as const;

export type PartName = keyof typeof PARTS;

/** The knob turns through 270°, from seven o'clock to five; it's set at 60%. */
const KNOB = { cx: 393, cy: 104, r: 46, from: -135, sweep: 270, at: 0.6 };

export interface Line {
  d: string;
  part: PartName | "frame" | "measure";
}

export interface Fill {
  d: string;
  part: PartName;
  /** Drawn in the sheet's paper colour, over the ink: a label on a solid key, the thumb on its track. */
  paper?: boolean;
  /** A heavy line rather than a shape: the knob's pointer. */
  stroke?: boolean;
}

/** The outlines, in the order they're drawn. */
export const LINES: readonly Line[] = (() => {
  const b = PARTS.button;
  const s = PARTS.segmented;
  const sw = PARTS.switch;
  const ticks = Array.from({ length: 11 }, (_, i) => {
    const deg = KNOB.from + (KNOB.sweep * i) / 10;
    const [x1, y1] = polar(KNOB.cx, KNOB.cy, KNOB.r + 8, deg);
    const [x2, y2] = polar(KNOB.cx, KNOB.cy, KNOB.r + (i % 5 === 0 ? 18 : 14), deg);
    return `M${pt(x1, y1)}L${pt(x2, y2)}`;
  });
  return [
    { part: "frame", d: `M0.5 0.5H${VIEW.w - 0.5}V${VIEW.h - 0.5}H0.5Z` },
    { part: "button", d: pill(b.x, b.y, b.w, b.h) },
    { part: "segmented", d: pill(s.x, s.y, s.w, s.h) },
    { part: "segmented", d: `M${pt(s.x + s.w / 3, s.y + 8)}V${n(s.y + s.h - 8)}M${pt(s.x + (2 * s.w) / 3, s.y + 8)}V${n(s.y + s.h - 8)}` },
    { part: "slider", d: `M${pt(24, 254)}H294` },
    { part: "knob", d: circle(KNOB.cx, KNOB.cy, KNOB.r) },
    { part: "knob", d: circle(KNOB.cx, KNOB.cy, KNOB.r - 10) },
    ...ticks.map((d) => ({ part: "knob" as const, d })),
    { part: "switch", d: pill(sw.x, sw.y, sw.w, sw.h) },
    // The draughtsman's marks: a dimension under the button, the knob's centre lines.
    { part: "measure", d: `M${pt(b.x, b.y + b.h + 12)}H${n(b.x + b.w)}M${pt(b.x, b.y + b.h + 8)}V${n(b.y + b.h + 16)}M${pt(b.x + b.w, b.y + b.h + 8)}V${n(b.y + b.h + 16)}` },
    { part: "measure", d: `M${pt(KNOB.cx - KNOB.r - 26, KNOB.cy)}H${n(KNOB.cx + KNOB.r + 26)}M${pt(KNOB.cx, KNOB.cy - KNOB.r - 26)}V${n(KNOB.cy + KNOB.r + 26)}` },
  ];
})();

/** What's solid: poured in after the outlines, then what sits on it in the paper's colour. */
export const FILLS: readonly Fill[] = (() => {
  const b = PARTS.button;
  const s = PARTS.segmented;
  const sw = PARTS.switch;
  const seg = s.w / 3;
  const r = s.h / 2;
  const [ix, iy] = polar(KNOB.cx, KNOB.cy, KNOB.r - 18, KNOB.from + KNOB.sweep * KNOB.at);
  const [ox, oy] = polar(KNOB.cx, KNOB.cy, KNOB.r - 4, KNOB.from + KNOB.sweep * KNOB.at);
  return [
    { part: "button", d: pill(b.x, b.y, b.w, b.h) },
    { part: "button", d: pill(b.x + 52, b.y + b.h / 2 - 2.5, b.w - 104, 5), paper: true },
    // The chosen segment, the first: solid ink.
    { part: "segmented", d: `M${pt(s.x + r, s.y)}H${n(s.x + seg)}V${n(s.y + s.h)}H${n(s.x + r)}A${r} ${r} 0 0 1 ${pt(s.x + r, s.y)}Z` },
    { part: "segmented", d: pill(s.x + 26, s.y + s.h / 2 - 2.5, seg - 44, 5), paper: true },
    { part: "segmented", d: pill(s.x + seg + 22, s.y + s.h / 2 - 2.5, seg - 44, 5) },
    { part: "segmented", d: pill(s.x + 2 * seg + 22, s.y + s.h / 2 - 2.5, seg - 44, 5) },
    // The slider's travel so far, and its thumb.
    { part: "slider", d: pill(24, 252, 162, 4) },
    { part: "slider", d: circle(186, 254, 13) },
    { part: "slider", d: circle(186, 254, 10), paper: true },
    // The knob's pointer.
    { part: "knob", d: `M${pt(ix, iy)}L${pt(ox, oy)}`, stroke: true },
    // The switch, on: its track in ink, its knob in paper, at the right.
    { part: "switch", d: pill(sw.x, sw.y, sw.w, sw.h) },
    { part: "switch", d: circle(sw.x + sw.w - sw.h / 2, sw.y + sw.h / 2, 16), paper: true },
  ];
})();
