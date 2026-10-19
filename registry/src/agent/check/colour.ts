/**
 * Colour literals, and the theme role each one is nearest.
 *
 * A literal is a colour written as a value: hex, a colour function, or one of
 * CSS's named colours. The check names the role closest to it in the
 * project's own theme, compared in OKLCH, so the message can say
 * "#8B6FE8 is your accent" rather than only "don't".
 */
import { deltaEOK, hexToOklch, toHex } from "echo-ui-core/theme";

type Oklch = ReturnType<typeof hexToOklch>;

/** CSS's named colours (CSS Color 4), with their values. */
const NAMED: Record<string, string> = {
  aliceblue: "#f0f8ff", antiquewhite: "#faebd7", aqua: "#00ffff", aquamarine: "#7fffd4", azure: "#f0ffff",
  beige: "#f5f5dc", bisque: "#ffe4c4", black: "#000000", blanchedalmond: "#ffebcd", blue: "#0000ff",
  blueviolet: "#8a2be2", brown: "#a52a2a", burlywood: "#deb887", cadetblue: "#5f9ea0", chartreuse: "#7fff00",
  chocolate: "#d2691e", coral: "#ff7f50", cornflowerblue: "#6495ed", cornsilk: "#fff8dc", crimson: "#dc143c",
  cyan: "#00ffff", darkblue: "#00008b", darkcyan: "#008b8b", darkgoldenrod: "#b8860b", darkgray: "#a9a9a9",
  darkgreen: "#006400", darkgrey: "#a9a9a9", darkkhaki: "#bdb76b", darkmagenta: "#8b008b",
  darkolivegreen: "#556b2f", darkorange: "#ff8c00", darkorchid: "#9932cc", darkred: "#8b0000",
  darksalmon: "#e9967a", darkseagreen: "#8fbc8f", darkslateblue: "#483d8b", darkslategray: "#2f4f4f",
  darkslategrey: "#2f4f4f", darkturquoise: "#00ced1", darkviolet: "#9400d3", deeppink: "#ff1493",
  deepskyblue: "#00bfff", dimgray: "#696969", dimgrey: "#696969", dodgerblue: "#1e90ff", firebrick: "#b22222",
  floralwhite: "#fffaf0", forestgreen: "#228b22", fuchsia: "#ff00ff", gainsboro: "#dcdcdc", ghostwhite: "#f8f8ff",
  gold: "#ffd700", goldenrod: "#daa520", gray: "#808080", green: "#008000", greenyellow: "#adff2f",
  grey: "#808080", honeydew: "#f0fff0", hotpink: "#ff69b4", indianred: "#cd5c5c", indigo: "#4b0082",
  ivory: "#fffff0", khaki: "#f0e68c", lavender: "#e6e6fa", lavenderblush: "#fff0f5", lawngreen: "#7cfc00",
  lemonchiffon: "#fffacd", lightblue: "#add8e6", lightcoral: "#f08080", lightcyan: "#e0ffff",
  lightgoldenrodyellow: "#fafad2", lightgray: "#d3d3d3", lightgreen: "#90ee90", lightgrey: "#d3d3d3",
  lightpink: "#ffb6c1", lightsalmon: "#ffa07a", lightseagreen: "#20b2aa", lightskyblue: "#87cefa",
  lightslategray: "#778899", lightslategrey: "#778899", lightsteelblue: "#b0c4de", lightyellow: "#ffffe0",
  lime: "#00ff00", limegreen: "#32cd32", linen: "#faf0e6", magenta: "#ff00ff", maroon: "#800000",
  mediumaquamarine: "#66cdaa", mediumblue: "#0000cd", mediumorchid: "#ba55d3", mediumpurple: "#9370db",
  mediumseagreen: "#3cb371", mediumslateblue: "#7b68ee", mediumspringgreen: "#00fa9a",
  mediumturquoise: "#48d1cc", mediumvioletred: "#c71585", midnightblue: "#191970", mintcream: "#f5fffa",
  mistyrose: "#ffe4e1", moccasin: "#ffe4b5", navajowhite: "#ffdead", navy: "#000080", oldlace: "#fdf5e6",
  olive: "#808000", olivedrab: "#6b8e23", orange: "#ffa500", orangered: "#ff4500", orchid: "#da70d6",
  palegoldenrod: "#eee8aa", palegreen: "#98fb98", paleturquoise: "#afeeee", palevioletred: "#db7093",
  papayawhip: "#ffefd5", peachpuff: "#ffdab9", peru: "#cd853f", pink: "#ffc0cb", plum: "#dda0dd",
  powderblue: "#b0e0e6", purple: "#800080", rebeccapurple: "#663399", red: "#ff0000", rosybrown: "#bc8f8f",
  royalblue: "#4169e1", saddlebrown: "#8b4513", salmon: "#fa8072", sandybrown: "#f4a460", seagreen: "#2e8b57",
  seashell: "#fff5ee", sienna: "#a0522d", silver: "#c0c0c0", skyblue: "#87ceeb", slateblue: "#6a5acd",
  slategray: "#708090", slategrey: "#708090", snow: "#fffafa", springgreen: "#00ff7f", steelblue: "#4682b4",
  tan: "#d2b48c", teal: "#008080", thistle: "#d8bfd8", tomato: "#ff6347", turquoise: "#40e0d0",
  violet: "#ee82ee", wheat: "#f5deb3", white: "#ffffff", whitesmoke: "#f5f5f5", yellow: "#ffff00",
  yellowgreen: "#9acd32",
};

const HEX = /(?<![\w&-])#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})(?![\w-])/gi;
const FUNCTION = /\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\([^()]*\)/gi;
const WORD = /(?<![\w#.$@-])[a-z]+(?![\w(-])/gi;

export interface Literal {
  text: string;
  /** Offset into the value it was found in. */
  index: number;
}

/**
 * The colour literals in a value, in order. `var(--echo-*)` and a colour-mix
 * of vars hold none; `url(...)` is skipped whole, since a data URI is full of
 * hex that isn't colour. `named: false` for a class string, where `red` is a
 * class name and only `bg-[#fff]`'s hex is a colour.
 */
export function findLiterals(value: string, { named = true } = {}): Literal[] {
  const blank = (s: string) => " ".repeat(s.length);
  // Keep offsets: blank out what can't hold a literal instead of removing it.
  const text = value
    .replace(/url\([^)]*\)/gi, blank)
    .replace(/var\(\s*--[\w-]+/g, blank)
    .replace(/(["'])(?:(?!\1).)*\1/g, (s) => (/^["'](#|rgb|hsl|oklch)/i.test(s) ? s : blank(s)));
  const found: Literal[] = [];
  for (const m of text.matchAll(HEX)) found.push({ text: m[0], index: m.index! });
  for (const m of text.matchAll(FUNCTION)) found.push({ text: m[0], index: m.index! });
  if (named) for (const m of text.matchAll(WORD)) if (m[0].toLowerCase() in NAMED) found.push({ text: m[0], index: m.index! });
  return found.sort((a, b) => a.index - b.index);
}

const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));

function hslToHex(h: number, s: number, l: number): string {
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  };
  return toHex(clamp(f(0) * 255), clamp(f(8) * 255), clamp(f(4) * 255));
}

/** A literal as OKLCH, when it's a kind this can read; alpha is ignored. */
export function toOklch(literal: string): Oklch | undefined {
  const text = literal.trim().toLowerCase();
  try {
    if (text in NAMED) return hexToOklch(NAMED[text]!);
    if (text.startsWith("#")) {
      const hex = text.length <= 5 ? `#${[...text.slice(1, 4)].map((c) => c + c).join("")}` : text.slice(0, 7);
      return hexToOklch(hex);
    }
    const args = /^\w+\(([^)]*)\)$/.exec(text)?.[1]?.split(/[\s,/]+/).filter(Boolean) ?? [];
    const num = (s: string | undefined, scale = 1) => (s?.endsWith("%") ? (parseFloat(s) / 100) * scale : parseFloat(s ?? ""));
    if (text.startsWith("rgb")) {
      return hexToOklch(toHex(clamp(num(args[0], 255)), clamp(num(args[1], 255)), clamp(num(args[2], 255))));
    }
    if (text.startsWith("hsl")) return hexToOklch(hslToHex(parseFloat(args[0] ?? "0"), num(args[1]), num(args[2])));
    if (text.startsWith("oklch")) return { L: num(args[0]), C: parseFloat(args[1] ?? "0"), H: parseFloat(args[2] ?? "0") || 0 };
  } catch {
    /* not one this reads */
  }
  return undefined;
}

/** A role and its colour, from the project's theme. */
export interface RoleColour {
  role: string;
  colour: Oklch;
}

/**
 * The colour roles a theme file sets, read from its `--echo-<role>: <colour>`
 * lines. Only the roles the catalog names count: those are the ones to use.
 */
export function themeRoles(css: string, roles: readonly string[]): RoleColour[] {
  const wanted = new Set(roles);
  const out: RoleColour[] = [];
  for (const m of css.matchAll(/(--echo-[\w-]+)\s*:\s*([^;]+);/g)) {
    if (!wanted.has(m[1]!) || out.some((r) => r.role === m[1])) continue;
    const colour = toOklch(m[2]!);
    if (colour) out.push({ role: m[1]!, colour });
  }
  return out;
}

/**
 * The roles a property's colour is for, best first. Where several roles are
 * one colour (a drawn device in one black is its text, its seam, its glow and
 * its lit ink at once), the first role the theme happens to list would be
 * named. A hairline told to use the glow turns the accent's colour the day
 * the seed changes, so the property decides between them.
 */
function rolesFor(property: string): readonly string[] {
  const p = property.toLowerCase().replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
  if (/^(border|outline|column-rule)|^text-decoration-color$/.test(p)) return ["seam", "text-dim", "text"];
  if (/^background/.test(p)) return ["surface", "cap", "well", "lcd"];
  if (/^(color|caret-color|fill|stroke)$/.test(p)) return ["text", "text-dim", "accent-ink"];
  if (p === "accent-color") return ["accent"];
  return [];
}

/** The role nearest a literal, and whether it's close enough to call it that role. */
export function nearestRole(literal: string, roles: readonly RoleColour[], property?: string): { role: string; same: boolean } | undefined {
  const colour = toOklch(literal);
  if (!colour || roles.length === 0) return undefined;
  let best: { role: string; distance: number } | undefined;
  for (const r of roles) {
    const distance = deltaEOK(colour, r.colour);
    if (!best || distance < best.distance) best = { role: r.role, distance };
  }
  if (!best) return undefined;
  // 0.02 is about the smallest step a person sees between two colours.
  const same = best.distance < 0.02;
  if (same && property) {
    const twins = new Set(roles.filter((r) => deltaEOK(colour, r.colour) < 0.02).map((r) => r.role));
    const fit = rolesFor(property).map((r) => `--echo-${r}`).find((r) => twins.has(r));
    if (fit) return { role: fit, same };
  }
  return { role: best.role, same };
}
