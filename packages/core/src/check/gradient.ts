/**
 * CSS gradients, read from a computed `background-image` and sampled where
 * the text sits.
 *
 * Every Echo surface is a gradient, often two or three layered: a soft
 * highlight across the top of a cap, over the cap's own top-to-bottom
 * shading. Measuring text against every stop at once pairs the highlight
 * with the lightest shade, a place the two never meet, and reports text as
 * failing that passes where it actually is. So each layer is sampled at the
 * text's own position, the way the browser paints it: linear, radial and
 * conic, repeating or not, sized and positioned by the background properties.
 * A layer this can't place is still counted, at every stop.
 */
import { parseColour, type Rgba } from "./colour";

type Length = { value: number; unit: "%" | "px" | "deg" };
interface Stop {
  colour: Rgba;
  at?: Length;
}

export interface Gradient {
  kind: "linear" | "radial" | "conic";
  repeating: boolean;
  stops: Stop[];
  /** linear: degrees, 0 pointing up, clockwise; or a corner to aim at. */
  angle?: number;
  corner?: [x: -1 | 1, y: -1 | 1];
  /** radial */
  circle?: boolean;
  extent?: "closest-side" | "farthest-side" | "closest-corner" | "farthest-corner";
  radii?: [Length, Length?];
  /** radial and conic: the centre. */
  at?: [Length, Length];
  /** conic: where the turn starts, in degrees. */
  from?: number;
}

const COLOUR_AT_START = /^((?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\([^()]*\)|#[0-9a-f]{3,8}\b|[a-z]+\b)/i;

function length(token: string): Length | undefined {
  const m = /^(-?[\d.]+(?:e-?\d+)?)(%|px|deg|turn|rad|grad)?$/i.exec(token);
  if (!m) return undefined;
  const n = parseFloat(m[1]!);
  switch ((m[2] ?? "px").toLowerCase()) {
    case "%":
      return { value: n, unit: "%" };
    case "deg":
      return { value: n, unit: "deg" };
    case "turn":
      return { value: n * 360, unit: "deg" };
    case "rad":
      return { value: (n * 180) / Math.PI, unit: "deg" };
    case "grad":
      return { value: n * 0.9, unit: "deg" };
    default:
      return { value: n, unit: "px" };
  }
}

const KEYWORD_AT: Record<string, number> = { left: 0, top: 0, center: 50, right: 100, bottom: 100 };

/** `at <position>`: one or two keywords or lengths, in either order for keywords. */
function position(tokens: string[]): [Length, Length] {
  const [a, b] = tokens;
  const read = (t?: string): Length => (t === undefined ? { value: 50, unit: "%" } : t in KEYWORD_AT ? { value: KEYWORD_AT[t]!, unit: "%" } : (length(t) ?? { value: 50, unit: "%" }));
  if (a === "top" || a === "bottom" || b === "left" || b === "right") return [read(b), read(a)];
  return [read(a), read(b)];
}

/** Split on spaces outside parentheses. */
function words(value: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let current = "";
  for (const c of value) {
    if (c === "(") depth++;
    if (c === ")") depth--;
    if (/\s/.test(c) && depth === 0) {
      if (current) out.push(current);
      current = "";
    } else current += c;
  }
  if (current) out.push(current);
  return out;
}

/** Split on commas outside parentheses. */
export function topLevel(value: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < value.length; i++) {
    const c = value[i];
    if (c === "(") depth++;
    else if (c === ")") depth--;
    else if (c === "," && depth === 0) {
      out.push(value.slice(start, i).trim());
      start = i + 1;
    }
  }
  out.push(value.slice(start).trim());
  return out.filter(Boolean);
}

/** One layer of a computed `background-image`, or undefined when it isn't a gradient this reads. */
export function parseGradient(layer: string): Gradient | undefined {
  const m = /^(repeating-)?(linear|radial|conic)-gradient\((.*)\)$/is.exec(layer.trim());
  if (!m) return undefined;
  const g: Gradient = { kind: m[2]!.toLowerCase() as Gradient["kind"], repeating: !!m[1], stops: [] };
  const args = topLevel(m[3]!);
  const lead = COLOUR_AT_START.exec(args[0] ?? "");
  const isStop = lead !== null && parseColour(lead[1]!) !== undefined;
  if (!isStop) configure(g, words(args.shift()!.toLowerCase()));
  for (const arg of args) {
    const colour = COLOUR_AT_START.exec(arg);
    const parsed = colour ? parseColour(colour[1]!) : undefined;
    if (!parsed) continue; // an interpolation hint, or a colour this can't read
    const positions = words(arg.slice(colour![1]!.length)).map(length);
    if (positions.length === 0) g.stops.push({ colour: parsed });
    for (const at of positions) g.stops.push({ colour: parsed, at });
  }
  return g.stops.length > 0 ? g : undefined;
}

function configure(g: Gradient, tokens: string[]) {
  // A colour space to interpolate in (`in oklch`) changes the mix a little; sampled in sRGB regardless.
  const inAt = tokens.indexOf("in");
  if (inAt >= 0) tokens.splice(inAt, tokens.length - inAt >= 3 && /hue$/.test(tokens[inAt + 3] ?? "") ? 4 : 2);
  const atAt = tokens.indexOf("at");
  if (atAt >= 0) g.at = position(tokens.splice(atAt).slice(1));
  if (g.kind === "linear") {
    if (tokens[0] === "to") {
      const sides = tokens.slice(1);
      const x = sides.includes("left") ? -1 : sides.includes("right") ? 1 : 0;
      const y = sides.includes("top") ? -1 : sides.includes("bottom") ? 1 : 0;
      if (x !== 0 && y !== 0) g.corner = [x, y];
      else g.angle = x === 1 ? 90 : x === -1 ? 270 : y === -1 ? 0 : 180;
    } else if (tokens[0]) {
      g.angle = length(tokens[0])?.value;
    }
  } else if (g.kind === "radial") {
    for (const t of tokens) {
      if (t === "circle") g.circle = true;
      else if (t === "ellipse") g.circle = false;
      else if (/^(closest|farthest)-(side|corner)$/.test(t)) g.extent = t as Gradient["extent"];
      else {
        const l = length(t);
        if (l) g.radii = g.radii ? [g.radii[0], l] : [l];
      }
    }
    if (g.radii && g.radii.length === 1 && g.circle === undefined) g.circle = true;
  } else {
    const fromAt = tokens.indexOf("from");
    if (fromAt >= 0) g.from = length(tokens[fromAt + 1] ?? "")?.value;
  }
}

/** Every colour a gradient can show, for when it can't be placed. */
export const allStops = (g: Gradient): Rgba[] => g.stops.map((s) => s.colour);

const px = (l: Length, of: number) => (l.unit === "%" ? (l.value / 100) * of : l.value);

/** Stop positions as fractions of the gradient's length, filled in the way CSS does. */
function fractions(stops: Stop[], lengthPx: number): number[] {
  const at = stops.map((s) => (s.at === undefined ? undefined : s.at.unit === "%" ? s.at.value / 100 : s.at.unit === "deg" ? s.at.value / 360 : lengthPx > 0 ? s.at.value / lengthPx : 0));
  if (at[0] === undefined) at[0] = 0;
  if (at[at.length - 1] === undefined) at[at.length - 1] = 1;
  let max = -Infinity;
  for (let i = 0; i < at.length; i++) if (at[i] !== undefined) at[i] = max = Math.max(max, at[i]!);
  for (let i = 1; i < at.length; i++) {
    if (at[i] !== undefined) continue;
    let j = i;
    while (at[j] === undefined) j++;
    const [from, to] = [at[i - 1]!, at[j]!];
    for (let k = i; k < j; k++) at[k] = from + ((to - from) * (k - i + 1)) / (j - i + 1);
  }
  return at as number[];
}

/** Premultiplied, as gradients are drawn. */
function mix(a: Rgba, b: Rgba, f: number): Rgba {
  const alpha = a.a + (b.a - a.a) * f;
  if (alpha === 0) return { r: 0, g: 0, b: 0, a: 0 };
  const ch = (x: number, y: number) => (x * a.a + (y * b.a - x * a.a) * f) / alpha;
  return { r: ch(a.r, b.r), g: ch(a.g, b.g), b: ch(a.b, b.b), a: alpha };
}

function colourAt(stops: Stop[], at: number[], t: number, repeating: boolean): Rgba {
  const first = at[0]!;
  const last = at[at.length - 1]!;
  if (repeating && last > first) t = first + ((((t - first) % (last - first)) + (last - first)) % (last - first));
  if (t <= first) return stops[0]!.colour;
  if (t >= last) return stops[stops.length - 1]!.colour;
  for (let i = 1; i < at.length; i++) {
    if (t > at[i]!) continue;
    const span = at[i]! - at[i - 1]!;
    return span === 0 ? stops[i]!.colour : mix(stops[i - 1]!.colour, stops[i]!.colour, (t - at[i - 1]!) / span);
  }
  return stops[stops.length - 1]!.colour;
}

/** The gradient's colour at (x, y) in a w × h box, or undefined when it can't be placed. */
export function sampleGradient(g: Gradient, w: number, h: number, x: number, y: number): Rgba | undefined {
  if (w <= 0 || h <= 0) return undefined;
  if (g.kind === "linear") {
    let dx: number;
    let dy: number;
    if (g.corner) {
      // Aimed at a corner: the line through the other two corners is perpendicular to it.
      const n = Math.hypot(w, h);
      [dx, dy] = [(g.corner[0] * h) / n, (g.corner[1] * w) / n];
    } else {
      const a = ((g.angle ?? 180) * Math.PI) / 180;
      [dx, dy] = [Math.sin(a), -Math.cos(a)];
    }
    const lengthPx = Math.abs(w * dx) + Math.abs(h * dy);
    if (lengthPx === 0) return undefined;
    const t = ((x - w / 2) * dx + (y - h / 2) * dy) / lengthPx + 0.5;
    return colourAt(g.stops, fractions(g.stops, lengthPx), t, g.repeating);
  }
  const [cx, cy] = g.at ? [px(g.at[0], w), px(g.at[1], h)] : [w / 2, h / 2];
  if (g.kind === "conic") {
    const turn = (((Math.atan2(x - cx, -(y - cy)) * 180) / Math.PI - (g.from ?? 0)) % 360 + 360) % 360;
    return colourAt(g.stops, fractions(g.stops, 360), turn / 360, g.repeating);
  }
  const sides = { x: [cx, w - cx], y: [cy, h - cy] };
  let rx: number;
  let ry: number;
  if (g.radii) {
    rx = px(g.radii[0], w);
    ry = g.radii[1] ? px(g.radii[1], h) : rx;
  } else {
    const extent = g.extent ?? "farthest-corner";
    const pick = extent.startsWith("closest") ? Math.min : Math.max;
    if (g.circle) {
      rx = ry = extent.endsWith("side")
        ? pick(...sides.x, ...sides.y)
        : pick(...[0, 1].flatMap((i) => [0, 1].map((j) => Math.hypot(sides.x[i]!, sides.y[j]!))));
    } else {
      const scale = extent.endsWith("corner") ? Math.SQRT2 : 1;
      rx = pick(...sides.x) * scale;
      ry = pick(...sides.y) * scale;
    }
  }
  if (rx <= 0 || ry <= 0) return g.stops[g.stops.length - 1]!.colour;
  const t = Math.hypot((x - cx) / rx, (y - cy) / ry);
  return colourAt(g.stops, fractions(g.stops, rx), t, g.repeating);
}
