/**
 * The blueprint's parts, lifted off the sheet one by one: each part's lines
 * and fills as a drawing of its own, and where it lies on the sheet (px, from
 * the sheet's top left, as the sheet is laid out now). These are what fly to
 * the real components and become them.
 */
import { PARTS, VIEW, type PartName } from "@/components/home/journey/blueprint";

export interface DrawnPart {
  part: PartName;
  /** An inline SVG of the part alone. */
  svg: string;
  /** Where it lies on the sheet, px. */
  box: { x: number; y: number; w: number; h: number };
}

const n = (v: number) => Math.round(v * 100) / 100;

export function drawnParts(sheet: HTMLElement): DrawnPart[] {
  const plate = sheet.querySelector<SVGSVGElement>(".jy-plate");
  if (!plate) return [];
  const box = sheet.getBoundingClientRect();
  const pr = plate.getBoundingClientRect();
  const k = Math.min(pr.width / VIEW.w, pr.height / VIEW.h);
  const ox = pr.left - box.left + (pr.width - VIEW.w * k) / 2;
  const oy = pr.top - box.top + (pr.height - VIEW.h * k) / 2;
  return (Object.keys(PARTS) as PartName[]).map((part) => {
    const els = [...plate.querySelectorAll<SVGGraphicsElement>(`[data-part="${part}"]`)];
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    const paths = els.map((el) => {
      const b = el.getBBox();
      x0 = Math.min(x0, b.x);
      y0 = Math.min(y0, b.y);
      x1 = Math.max(x1, b.x + b.width);
      y1 = Math.max(y1, b.y + b.height);
      const s = getComputedStyle(el);
      return `<path d="${el.getAttribute("d")}" fill="${s.fill}" stroke="${s.stroke}" stroke-width="${s.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>`;
    });
    // Room for the strokes, which a bounding box leaves out.
    const pad = 4;
    x0 -= pad;
    y0 -= pad;
    x1 += pad;
    y1 += pad;
    return {
      part,
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${n(x0)} ${n(y0)} ${n(x1 - x0)} ${n(y1 - y0)}" preserveAspectRatio="none" width="100%" height="100%" overflow="visible">${paths.join("")}</svg>`,
      box: { x: ox + x0 * k, y: oy + y0 * k, w: (x1 - x0) * k, h: (y1 - y0) * k },
    };
  });
}
