/**
 * Colour literals: a colour written as a value instead of taken from the
 * system's roles. Hex, the colour functions and CSS's named colours.
 *
 * This is the benchmark's own counter, written separately from Echo's check on
 * purpose: when the two are later run on the same saved apps, each is how the
 * other is tested.
 */

/** CSS's named colours (CSS Color 4), minus the keywords that aren't a colour choice. */
const NAMED = new Set(
  (
    "aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue blueviolet brown " +
    "burlywood cadetblue chartreuse chocolate coral cornflowerblue cornsilk crimson cyan darkblue darkcyan " +
    "darkgoldenrod darkgray darkgreen darkgrey darkkhaki darkmagenta darkolivegreen darkorange darkorchid " +
    "darkred darksalmon darkseagreen darkslateblue darkslategray darkslategrey darkturquoise darkviolet " +
    "deeppink deepskyblue dimgray dimgrey dodgerblue firebrick floralwhite forestgreen fuchsia gainsboro " +
    "ghostwhite gold goldenrod gray green greenyellow grey honeydew hotpink indianred indigo ivory khaki " +
    "lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan lightgoldenrodyellow " +
    "lightgray lightgreen lightgrey lightpink lightsalmon lightseagreen lightskyblue lightslategray " +
    "lightslategrey lightsteelblue lightyellow lime limegreen linen magenta maroon mediumaquamarine " +
    "mediumblue mediumorchid mediumpurple mediumseagreen mediumslateblue mediumspringgreen mediumturquoise " +
    "mediumvioletred midnightblue mintcream mistyrose moccasin navajowhite navy oldlace olive olivedrab " +
    "orange orangered orchid palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff peru " +
    "pink plum powderblue purple rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown " +
    "seagreen seashell sienna silver skyblue slateblue slategray slategrey snow springgreen steelblue tan " +
    "teal thistle tomato turquoise violet wheat white whitesmoke yellow yellowgreen"
  ).split(" "),
);

const FUNCTION = /\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(/i;
const HEX = /(?<![\w&-])#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})(?![\w-])/i;

/**
 * The colour literals in one CSS value (or a string used as one), in order.
 * `var(--x)` and `color-mix(in oklch, var(--a), var(--b))` hold none;
 * `color-mix(in oklch, var(--a), #fff)` holds one.
 */
export function colourLiterals(value: string): string[] {
  const found: string[] = [];
  // Take custom-property references out first, so `var(--red)` isn't read as `red`.
  const text = value.replace(/var\(\s*--[\w-]+/g, "var(");
  for (const match of text.matchAll(new RegExp(HEX.source, "gi"))) found.push(match[0]);
  for (const match of text.matchAll(new RegExp(`${FUNCTION.source}[^)]*\\)`, "gi"))) found.push(match[0]);
  for (const match of text.matchAll(/(?<![\w#.-])[a-z]+(?![\w(-])/gi)) {
    if (NAMED.has(match[0].toLowerCase())) found.push(match[0]);
  }
  return found;
}

export interface Located {
  line: number;
  text: string;
}

/**
 * Colour literals in a stylesheet's declarations, with their line numbers.
 * Selectors and comments are skipped: `#main` is an id, not a colour.
 */
export function cssColourLiterals(css: string): Located[] {
  const out: Located[] = [];
  // Blank comments out, keeping their newlines so line numbers still hold.
  const source = css.replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, " "));
  const lineAt = (index: number) => source.slice(0, index).split("\n").length;

  // A declaration is what sits between `{` or `;` and the next `;` or `}`
  // inside a block. A segment that ends at `{` is a selector or an at-rule's
  // prelude, never a value, so it's dropped when the brace opens.
  let depth = 0;
  let start = 0;
  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    if (ch === "{") {
      depth++;
      start = i + 1;
    } else if (ch === ";" || ch === "}") {
      if (depth > 0) {
        const segment = source.slice(start, i);
        const colon = segment.indexOf(":");
        if (colon > 0 && /^\s*(--)?[\w-]+\s*$/.test(segment.slice(0, colon))) {
          const valueStart = start + colon + 1 + (segment.slice(colon + 1).length - segment.slice(colon + 1).trimStart().length);
          for (const text of colourLiterals(segment.slice(colon + 1))) out.push({ line: lineAt(valueStart), text });
        }
      }
      if (ch === "}") depth = Math.max(0, depth - 1);
      start = i + 1;
    }
  }
  return out;
}
