/**
 * Text against what's behind it, as WCAG 1.4.3 measures it: the text's
 * colour over the background under it, 4.5:1 for body text and 3:1 for large
 * text (24px, or 18.66px bold).
 *
 * The background is read up the element's ancestors. Flat colours composite;
 * a gradient is sampled where the text sits (gradient.ts), at several points
 * along each line, and the worst point counts; the page's ground is the last
 * layer. Without positions (a test's stand-in elements) every stop of a
 * gradient counts instead. What styles can't say is left alone rather than
 * guessed: text over an image, over glass (a `backdrop-filter` shows whatever
 * is behind it), through a filter or a blend mode, or painted by a background
 * clipped to the text.
 */
import { apcaContrast } from "../theme/contrast";
import { APCA_FLOOR } from "../theme/readability";
import { contrast, over, parseColour, type Rgba } from "./colour";
import { allStops, parseGradient, sampleGradient, topLevel, type Gradient } from "./gradient";

export { topLevel } from "./gradient";

type Style = (el: Element) => CSSStyleDeclaration;

export interface Point {
  x: number;
  y: number;
}

interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** Where the text is, and where things are, in viewport coordinates. */
export interface TextGeometry {
  /** Points on the text to measure at. */
  points: readonly Point[];
  /** The box the text's lines fill. */
  area?: Box;
  /** An element's border box. */
  box(el: Element): Box;
}

export interface TextContrast {
  ratio: number;
  /** What the text needs: 4.5, or 3 when it's large. */
  needed: number;
  text: Rgba;
  /** The background it reaches `ratio` against. */
  background: Rgba;
}

/** The layers of a `background-image`, top first, or undefined when one is an image. */
export function backgroundGradients(image: string): Gradient[] | undefined {
  if (image === "none" || image === "") return [];
  const layers: Gradient[] = [];
  for (const layer of topLevel(image)) {
    const g = parseGradient(layer);
    if (!g) return undefined;
    layers.push(g);
  }
  return layers;
}

/** Each layer's colours, top first, or undefined when a layer is an image. */
export function gradientLayers(image: string): Rgba[][] | undefined {
  return backgroundGradients(image)?.map(allStops);
}

/** WCAG's large text: 18pt, or 14pt bold. */
export function isLarge(cs: CSSStyleDeclaration): boolean {
  const size = parseFloat(cs.fontSize);
  return size >= 24 || (size >= 18.66 && (parseInt(cs.fontWeight, 10) || 400) >= 700);
}

const TRANSPARENT: Rgba = { r: 0, g: 0, b: 0, a: 0 };
const BLACK: Rgba = { r: 0, g: 0, b: 0, a: 1 };
/** How many backgrounds to try before keeping only the extremes. */
const MANY = 64;

/**
 * What paints behind the text: a flat colour, or one gradient layer. One
 * painted beside the text (not by an ancestor) is `bounded`: it paints only
 * inside its own box, where an ancestor's background is behind all of its
 * content, scrolled or not.
 */
type Layer = ({ flat: Rgba } | { gradient: Gradient; cs: CSSStyleDeclaration; index: number }) & {
  el?: Element;
  bounded?: boolean;
  /** The opacity it's painted at, its own and its ancestors' up to the text's. */
  fade?: number;
};

/** Things whose pixels styles don't describe. */
const PICTURES = new Set(["img", "svg", "canvas", "video", "picture", "iframe", "object", "embed"]);

const inside = (p: Point, b: Box) => p.x >= b.left && p.x < b.left + b.width && p.y >= b.top && p.y < b.top + b.height;
const overlaps = (a: Box, b: Box) =>
  Math.min(a.left + a.width, b.left + b.width) - Math.max(a.left, b.left) > 1 &&
  Math.min(a.top + a.height, b.top + b.height) - Math.max(a.top, b.top) > 1;

/**
 * What an element that isn't one of the text's ancestors paints over the
 * text's area, nearest first: a positioned highlight, a grid cell stacked on
 * another. Undefined when it's a picture (an image, an SVG, a canvas), whose
 * pixels no style says.
 */
function paintersIn(el: Element, style: Style, geometry: TextGeometry, area: Box, depth = 0, fadeAbove = 1): Layer[] | undefined {
  if (el.hasAttribute("data-echo-check")) return [];
  const cs = style(el);
  const fade = fadeAbove * (parseFloat(cs.opacity) || 0);
  if (cs.display === "none" || cs.visibility !== "visible" || fade === 0) return [];
  if (!overlaps(geometry.box(el), area)) return [];
  if (PICTURES.has(el.localName)) return undefined;
  const gradients = backgroundGradients(cs.backgroundImage);
  if (!gradients) return undefined;
  const inner: Layer[] = [];
  if (depth < 4) {
    for (const child of [...el.children].reverse()) {
      const found = paintersIn(child, style, geometry, area, depth + 1, fade);
      if (!found) return undefined;
      inner.push(...found);
    }
  }
  const flat = parseColour(cs.backgroundColor);
  return [
    ...inner,
    ...gradients.map((gradient, index) => ({ gradient, el, cs, index, bounded: true, fade })),
    ...(flat && flat.a > 0 ? [{ flat, el, bounded: true, fade }] : []),
  ];
}

/** A background size that fills the element. */
const covers = (size: string) => /^(auto|cover|contain)( auto)?$/.test(size) || size === "100% 100%";

/** The `index`th entry of a comma-separated background property, repeating as CSS does. */
const nth = (value: string, index: number) => {
  const list = topLevel(value);
  return list[index % list.length] ?? "";
};

const lengthPx = (token: string | undefined, of: number): number | undefined => {
  if (!token) return undefined;
  const n = parseFloat(token);
  if (Number.isNaN(n)) return undefined;
  return token.endsWith("%") ? (n / 100) * of : n;
};

/**
 * Where `point` falls inside one gradient layer's tile: the tile's size and
 * the point in it. Null when the layer doesn't reach the point (a tile that
 * doesn't repeat); undefined when it can't be placed.
 */
function place(layer: Extract<Layer, { gradient: Gradient }>, point: Point, geometry: TextGeometry) {
  const { cs, index } = layer;
  const box = geometry.box(layer.el!);
  const origin = nth(cs.backgroundOrigin, index) || "padding-box";
  const inset = (side: "top" | "right" | "bottom" | "left") =>
    (origin === "border-box" ? 0 : parseFloat(cs.getPropertyValue(`border-${side}-width`)) || 0) +
    (origin === "content-box" ? parseFloat(cs.getPropertyValue(`padding-${side}`)) || 0 : 0);
  const area = {
    left: box.left + inset("left"),
    top: box.top + inset("top"),
    w: box.width - inset("left") - inset("right"),
    h: box.height - inset("top") - inset("bottom"),
  };
  const size = nth(cs.backgroundSize, index).split(/\s+/);
  let [w, h] = [area.w, area.h];
  if (size[0] && !["auto", "cover", "contain"].includes(size[0])) {
    w = lengthPx(size[0], area.w) ?? area.w;
    h = size[1] && size[1] !== "auto" ? (lengthPx(size[1], area.h) ?? area.h) : area.h;
  }
  if (w <= 0 || h <= 0) return undefined;
  const at = nth(cs.backgroundPosition, index).split(/\s+/);
  const x0 = /^-?[\d.]+(px|%)?$/.test(at[0] ?? "") ? (lengthPx(at[0], area.w - w) ?? 0) : 0;
  const y0 = /^-?[\d.]+(px|%)?$/.test(at[1] ?? "") ? (lengthPx(at[1], area.h - h) ?? 0) : 0;
  let x = point.x - area.left - x0;
  let y = point.y - area.top - y0;
  // `repeat-x` is "repeat no-repeat", `repeat-y` the other way; one keyword otherwise means both.
  const repeat = nth(cs.backgroundRepeat, index).split(/\s+/);
  const [alongX, alongY] =
    repeat[0] === "repeat-x" ? ["repeat", "no-repeat"] : repeat[0] === "repeat-y" ? ["no-repeat", "repeat"] : [repeat[0], repeat[1] ?? repeat[0]];
  const wraps = (how?: string) => how === "repeat" || how === "space" || how === "round";
  if (wraps(alongX)) x = ((x % w) + w) % w;
  else if (x < 0 || x >= w) return null;
  if (wraps(alongY)) y = ((y % h) + h) % h;
  else if (y < 0 || y >= h) return null;
  return { w, h, x, y };
}

/** What a layer can be at `point`: one colour when it can be placed there, every stop when not. */
function coloursOf(layer: Layer, point: Point | undefined, geometry: TextGeometry | undefined): Rgba[] {
  const fade = layer.fade ?? 1;
  const faded = (colours: Rgba[]) => (fade === 1 ? colours : colours.map((c) => ({ ...c, a: c.a * fade })));
  if (point && geometry && layer.bounded && layer.el && !inside(point, geometry.box(layer.el))) return [TRANSPARENT];
  if ("flat" in layer) return faded([layer.flat]);
  if (!point || !geometry) return faded(allStops(layer.gradient));
  const spot = place(layer, point, geometry);
  if (spot === null) return [TRANSPARENT];
  const sampled = spot && sampleGradient(layer.gradient, spot.w, spot.h, spot.x, spot.y);
  return faded(sampled ? [sampled] : allStops(layer.gradient));
}

/**
 * The contrast of `el`'s own text, or undefined when it can't be measured
 * from styles alone. `canvas` is the colour the page is painted on when no
 * element paints a ground (white, unless the page asks for a dark scheme).
 */
export function textContrast(el: Element, style: Style, canvas: Rgba, geometry?: TextGeometry): TextContrast | undefined {
  const cs = style(el);
  if (cs.backgroundClip === "text" || cs.getPropertyValue("-webkit-background-clip") === "text") return undefined;
  const fill = cs.getPropertyValue("-webkit-text-fill-color");
  let text = (fill && fill !== cs.color ? parseColour(fill) : undefined) ?? parseColour(cs.color);
  if (!text || text.a === 0) return undefined;

  /** The layers behind the text, nearest first. */
  const layers: Layer[] = [];
  let opacity = 1;
  let grounded = false;
  const area = geometry?.area;
  for (let node: Element | null = el, below: Element | undefined; node && !grounded; below = node, node = node.parentElement) {
    // What the element just below paints beside itself sits over this one's background.
    if (below && area && geometry) {
      for (const sibling of [...node.children].reverse()) {
        if (sibling === below) continue;
        const painted = paintersIn(sibling, style, geometry, area);
        if (!painted) return undefined;
        layers.push(...painted);
      }
    }
    const s = style(node);
    if (s.backdropFilter && s.backdropFilter !== "none") return undefined;
    if ((s.filter && s.filter !== "none") || (s.mixBlendMode && s.mixBlendMode !== "normal")) return undefined;
    const gradients = backgroundGradients(s.backgroundImage);
    if (!gradients) return undefined;
    for (const [index, gradient] of gradients.entries()) {
      layers.push({ gradient, el: node, cs: s, index });
      // A gradient that's opaque everywhere, over the whole element, is ground enough.
      if (gradient.stops.every((stop) => stop.colour.a >= 1) && covers(nth(s.backgroundSize, index))) {
        grounded = true;
        break;
      }
    }
    if (grounded) break;
    const flat = parseColour(s.backgroundColor);
    if (flat && flat.a > 0) {
      layers.push({ flat, el: node });
      if (flat.a >= 1) grounded = true;
    }
    // Opacity between the text and its ground fades the text into it.
    if (!grounded) opacity *= parseFloat(s.opacity) || 0;
  }
  if (opacity === 0) return undefined;
  text = { ...text, a: text.a * opacity };
  const bottomUp = layers.reverse();

  let worst: TextContrast | undefined;
  const needed = isLarge(cs) ? 3 : 4.5;
  for (const point of geometry?.points.length ? geometry.points : [undefined]) {
    let backgrounds: Rgba[] = [grounded ? TRANSPARENT : canvas];
    for (const layer of bottomUp) {
      const next = new Map<string, Rgba>();
      for (const below of backgrounds) {
        for (const colour of coloursOf(layer, point, geometry)) {
          const c = over(colour, below);
          next.set(`${c.r.toFixed(3)},${c.g.toFixed(3)},${c.b.toFixed(3)},${c.a.toFixed(3)}`, c);
        }
      }
      backgrounds = [...next.values()];
      if (backgrounds.length > MANY) {
        backgrounds.sort((a, b) => contrast(a, BLACK) - contrast(b, BLACK));
        backgrounds = [backgrounds[0]!, backgrounds[backgrounds.length - 1]!];
      }
    }
    for (const bg of backgrounds) {
      const ground = bg.a >= 1 ? bg : over(bg, canvas);
      const seen = over(text, ground);
      const ratio = contrast(seen, ground);
      if (!worst || ratio < worst.ratio) worst = { ratio, needed, text: seen, background: ground };
    }
  }
  return worst;
}

/**
 * Small text that passes the WCAG 2 ratio and is still hard to read: under
 * APCA's floor. The ratio overrates bright, saturated text on a dark ground; a
 * lit blue on black passed at 5.3:1 and read at Lc 36. What to say,
 * or nothing.
 */
export function smallTextHardToRead(text: string, background: string, ratio: number, large: boolean): string | undefined {
  if (large) return undefined;
  const lc = apcaContrast(text, background);
  if (lc >= APCA_FLOOR) return undefined;
  return `${text} on ${background} passes AA at ${ratio.toFixed(1)}:1 and still reads at APCA Lc ${Math.round(lc)}: small text reads well from 60, and under ${APCA_FLOOR} it's hard to read for anyone. Use a text role made for this ground: \`--echo-text\`, \`--echo-text-dim\`, or \`--echo-accent-ink\` for lit text.`;
}
