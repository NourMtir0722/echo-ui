/**
 * Text stays readable under the page's lights: the shader fields and the
 * light Echo carries are measured against the text they fall on, and held
 * down wherever they'd take it under WCAG.
 *
 * - Every run of text is read for its colour and size: large text (24px, or
 *   18.66px bold) needs 3:1, the rest 4.5:1. A visitor who asks for more
 *   contrast (prefers-contrast: more) gets AAA, 4.5:1 and 7:1.
 * - A light can only lift what's behind the text (`maxBehind`: how bright
 *   the ground under it may get), or, screened over the page, lift the text
 *   and its ground together (`screened`).
 *
 * Colours are read the way the browser resolved them (any CSS syntax),
 * through a canvas, as sRGB 0..1.
 */

export type Rgb = [number, number, number];

/**
 * Colours already read, by what the browser resolved them to. A page has a few dozen; the lights look at
 * its text every second or so, and read through the canvas every time, the page stuttered while they did.
 */
const cache = new Map<string, [Rgb, number]>();
let ctx: CanvasRenderingContext2D | null = null;

/** A resolved CSS colour as sRGB 0..1, and its alpha. */
export function rgba(css: string): [Rgb, number] {
  let c = cache.get(css);
  if (c) return c;
  if (!ctx) ctx = document.createElement("canvas").getContext("2d", { willReadFrequently: true })!;
  ctx.clearRect(0, 0, 1, 1);
  // A colour the canvas can't read would leave the last one standing: black, said once.
  ctx.fillStyle = CSS.supports("color", css) ? css : "#000";
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
  c = [[r! / 255, g! / 255, b! / 255], a! / 255];
  // A colour that keeps changing (one mid-transition) would fill it for good: start again past a few hundred.
  if (cache.size > 500) cache.clear();
  cache.set(css, c);
  return c;
}

export function rgb(css: string): Rgb {
  return rgba(css)[0];
}

const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);

/** WCAG relative luminance. */
export function luminance([r, g, b]: Rgb): number {
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export function ratio(a: Rgb, b: Rgb): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Asked for more contrast: AAA instead of AA. */
export const moreContrast = () => typeof window !== "undefined" && window.matchMedia("(prefers-contrast: more)").matches;

/**
 * The contrast an element's text needs, from its size and weight. Reading a page's worth, pass its style and
 * whether more contrast is asked for, so neither is looked up again for every element.
 */
export function needed(el: Element, s: CSSStyleDeclaration = getComputedStyle(el), more = moreContrast()): number {
  const size = parseFloat(s.fontSize);
  const large = size >= 24 || (size >= 18.66 && Number(s.fontWeight) >= 700);
  return large ? (more ? 4.5 : 3) : more ? 7 : 4.5;
}

/** A little over the line, so rounding never lands under it. */
export const MARGIN = 0.15;

/**
 * The brightest the ground behind light text may be (relative luminance),
 * for text of luminance `text` that needs `need`:1.
 */
export function maxBehind(text: number, need: number): number {
  return Math.max(0, (text + 0.05) / (need + MARGIN) - 0.05);
}

/** A colour with a light screened over it: `light` (sRGB 0..1) at strength `a`. */
export function screened([r, g, b]: Rgb, light: Rgb, a: number): Rgb {
  return [r + a * light[0] * (1 - r), g + a * light[1] * (1 - g), b + a * light[2] * (1 - b)];
}

/** A colour with a light laid over it at strength `a` (normal compositing). */
export function lit([r, g, b]: Rgb, light: Rgb, a: number): Rgb {
  return [r + a * (light[0] - r), g + a * (light[1] - g), b + a * (light[2] - b)];
}

/** Does it still read? */
export const reads = (fg: Rgb, bg: Rgb, need: number) => ratio(fg, bg) >= need + MARGIN;

export interface Run {
  el: Element;
  /** Its text's colour. */
  fg: Rgb;
  need: number;
  /** What's behind it: the nearest painted background, or the page's ground. */
  bg: Rgb;
  /** Nothing opaque between it and the ground: a light behind the page reaches it. */
  onGround: boolean;
}

/** Colours a gradient or a background paints, so the worst of them can be taken. */
function paints(s: CSSStyleDeclaration): Rgb[] {
  const out: Rgb[] = [];
  const [c, a] = rgba(s.backgroundColor);
  if (a > 0.95) out.push(c);
  const img = s.backgroundImage;
  if (img && img !== "none") {
    for (const m of img.matchAll(/(?:rgba?|oklab|oklch|lab|lch|color|hsla?)\([^()]*(?:\([^()]*\)[^()]*)*\)/g)) {
      const [g, ga] = rgba(m[0]);
      if (ga > 0.95) out.push(g);
    }
  }
  return out;
}

/** The text that sits inside `root` (or the whole page), one run per element with text of its own. */
export function runs(root: ParentNode, ground: Rgb): Run[] {
  const out: Run[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => (n.nodeValue && n.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT),
  });
  const seen = new Set<Element>();
  const more = moreContrast();
  // What paints behind each element, from it outward, worked out once: the page's text shares its ancestors.
  const under = new Map<Element, Rgb[] | null>();
  const behind = (a: Element | null): Rgb[] | null => {
    if (!a) return null;
    let found = under.get(a);
    if (found !== undefined) return found;
    const colours = paints(getComputedStyle(a));
    found = colours.length ? colours : a.classList.contains("home-lit") ? null : behind(a.parentElement);
    under.set(a, found);
    return found;
  };
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const el = n.parentElement;
    if (!el || seen.has(el)) continue;
    seen.add(el);
    const s = getComputedStyle(el);
    if (s.visibility === "hidden" || s.display === "none" || Number(s.opacity) === 0) continue;
    const [fg, fa] = rgba(s.color);
    if (fa < 0.05) continue;
    // Behind it: the first ancestor that paints. Of a gradient, whichever colour reads worst.
    const colours = behind(el);
    const bg = colours ? colours.reduce((w, c) => (ratio(fg, c) < ratio(fg, w) ? c : w)) : ground;
    out.push({ el, fg, need: needed(el, s, more), bg, onGround: !colours });
  }
  return out;
}
