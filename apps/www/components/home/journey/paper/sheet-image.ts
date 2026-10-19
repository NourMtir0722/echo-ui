/**
 * A picture of one style sheet (StyleSheets.tsx) exactly as it's laid out on
 * the page, for a sheet of paper to carry: its paper and outline, its words,
 * the blueprint, the chips, the window. Every place is measured from the page,
 * so the paper that takes off is the sheet that was there, to the pixel.
 *
 * An SVG, because the blueprint already is one and the rest is boxes and type.
 * Styles are written onto it (an SVG drawn as an image sees no stylesheet),
 * and the window's photo goes in as data (nor does it fetch).
 */

const INK = "#1c1c1c";
/** Where the baseline sits in a line's box, per font, as a share of its size. */
const ASCENT: Record<string, number> = { arial: 0.905, "courier new": 0.833 };

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const n = (v: number) => Math.round(v * 100) / 100;

async function asData(src: string): Promise<string> {
  const blob = await (await fetch(src)).blob();
  return new Promise((resolve) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.readAsDataURL(blob);
  });
}

export interface SheetPicture {
  src: string;
  /** Height over width. */
  aspect: number;
}

/**
 * `parts: false` leaves the blueprint's parts off the picture (its frame, ground and marks stay):
 * the paper the parts lift off when they become components.
 */
export async function sheetImage(sheet: HTMLElement, { scale = 2, parts = true } = {}): Promise<SheetPicture> {
  const box = sheet.getBoundingClientRect();
  const W = box.width;
  const H = box.height;
  const at = (r: DOMRect) => ({ x: r.left - box.left, y: r.top - box.top, w: r.width, h: r.height });
  const out: string[] = [];
  const defs: string[] = [];
  const fill = getComputedStyle(sheet).getPropertyValue("--fill").trim() || "#f3f3f3";
  const ink = sheet.classList.contains("jy-sheet--ink");

  out.push(`<rect x="0.5" y="0.5" width="${n(W - 1)}" height="${n(H - 1)}" rx="6" fill="${fill}"${ink ? ` stroke="${INK}" stroke-width="1"` : ""}/>`);

  // The window: its photo, blurred as it is on the page, in its rounded box.
  const win = sheet.querySelector<HTMLImageElement>(".jy-sheet__window");
  if (win) {
    const r = at(win.getBoundingClientRect());
    const data = await asData(win.currentSrc || win.src);
    defs.push(
      `<clipPath id="w"><rect x="${n(r.x)}" y="${n(r.y)}" width="${n(r.w)}" height="${n(r.h)}" rx="3"/></clipPath>`,
      `<filter id="b" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="5"/><feColorMatrix type="saturate" values="1.2"/></filter>`,
    );
    out.push(
      `<g clip-path="url(#w)"><image href="${data}" x="${n(r.x)}" y="${n(r.y)}" width="${n(r.w)}" height="${n(r.h)}" preserveAspectRatio="xMidYMid slice" filter="url(#b)"/></g>`,
    );
  }

  // The blueprint: a copy of its SVG, in its place, with its styles written on.
  const plate = sheet.querySelector<SVGSVGElement>(".jy-plate");
  if (plate) {
    const r = at(plate.getBoundingClientRect());
    const copy = plate.cloneNode(true) as SVGSVGElement;
    const from = plate.querySelectorAll<SVGElement>("path, rect, circle");
    copy.querySelectorAll<SVGElement>("path, rect, circle").forEach((el, i) => {
      const part = from[i]!.getAttribute("data-part");
      if (!parts && part && part !== "frame" && part !== "measure") {
        el.remove();
        return;
      }
      const s = getComputedStyle(from[i]!);
      el.removeAttribute("class");
      el.setAttribute("fill", el.closest("pattern") ? s.fill : s.fill === "none" ? "none" : s.fill);
      el.setAttribute("stroke", s.stroke);
      el.setAttribute("stroke-width", s.strokeWidth);
      el.setAttribute("stroke-linecap", s.strokeLinecap);
      el.setAttribute("stroke-linejoin", s.strokeLinejoin);
      el.setAttribute("opacity", s.opacity);
      el.removeAttribute("style");
    });
    const grid = copy.querySelector("rect");
    if (grid && !grid.closest("pattern")) grid.setAttribute("fill", "url(#jy-bp-dots)");
    copy.removeAttribute("class");
    copy.setAttribute("x", String(n(r.x)));
    copy.setAttribute("y", String(n(r.y)));
    copy.setAttribute("width", String(n(r.w)));
    copy.setAttribute("height", String(n(r.h)));
    out.push(new XMLSerializer().serializeToString(copy));
  }

  // The chips.
  for (const chip of sheet.querySelectorAll<HTMLElement>(".jy-swatch__chip")) {
    const r = at(chip.getBoundingClientRect());
    const c = getComputedStyle(chip.closest(".jy-swatch")!).getPropertyValue("--fill").trim();
    out.push(`<rect x="${n(r.x + 0.5)}" y="${n(r.y + 0.5)}" width="${n(r.w - 1)}" height="${n(r.h - 1)}" rx="3" fill="${c}" stroke="${INK}" stroke-width="1"/>`);
  }

  // The words, each on its own baseline, in its own face.
  for (const el of sheet.querySelectorAll<HTMLElement>(".jy-sheet__title, .jy-sheet__name, .jy-swatch__hex")) {
    const text = el.textContent ?? "";
    if (!text.trim()) continue;
    const s = getComputedStyle(el);
    const range = document.createRange();
    range.selectNodeContents(el);
    const line = at(range.getBoundingClientRect());
    const size = parseFloat(s.fontSize);
    const face = s.fontFamily.split(",")[0]!.replace(/["']/g, "").trim();
    const base = line.y + size * (ASCENT[face.toLowerCase()] ?? 0.9) + (line.h - size * 1.117) / 2;
    const spacing = s.letterSpacing === "normal" ? "0" : s.letterSpacing;
    out.push(
      `<text x="${n(line.x)}" y="${n(base)}" font-family="${esc(s.fontFamily)}" font-size="${n(size)}" font-weight="${s.fontWeight}" letter-spacing="${spacing}" fill="${INK}">${esc(text)}</text>`,
    );
    if (el.classList.contains("jy-sheet__title")) {
      const r = at(el.getBoundingClientRect());
      out.push(`<rect x="${n(r.x)}" y="${n(r.y + r.h - 1)}" width="${n(r.w)}" height="1" fill="${INK}"/>`);
    }
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.round(W * scale)}" height="${Math.round(H * scale)}" viewBox="0 0 ${n(W)} ${n(H)}"><defs>${defs.join("")}</defs>${out.join("")}</svg>`;
  return { src: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`, aspect: H / W };
}
