/**
 * One look at a rendered page: every check the page check has, as findings.
 *
 * It only reads. The one thing it adds is a hidden probe outside the body,
 * which the browser uses to turn a theme value into a colour.
 *
 * What's the app's and what's Echo's: the colour check looks only at what the
 * app paints. An element with an `echo-` class is Echo's, and so are the
 * unclassed elements inside one (its own structure). Anything with a class or
 * a style of its own is the app's, and so is a native link or control: its
 * colours are whatever the app, or the browser's defaults, gave it. Contrast
 * and names are checked everywhere, Echo's parts included, since those are
 * what a person meets.
 */
import type { PageCheckNote } from "./channel";
import { hexOf, parseColour, type Rgba } from "./colour";
import { CONTROLS, accessibleName, hiddenFromAssistiveTech, roleOf } from "./name";
import { Palette, THEME_COLOUR_TOKENS } from "./palette";
import { designFindings, DESIGN_RULES } from "./design";
import { screenFindings } from "./screen";
import { gradientLayers, isLarge, smallTextHardToRead, textContrast, type Point, type TextGeometry } from "./text-contrast";
import { PAGE_RULES, type PageFinding, type PageCheckOptions, type PageRule } from "./types";

/** Never looked inside. */
const SKIP = new Set(["script", "style", "noscript", "template", "iframe", "object", "embed"]);
/** Native parts whose colours are the app's (or the browser's defaults) even inside an Echo part. */
const NATIVE = new Set(["a", "button", "input", "select", "textarea"]);
/** SVG shapes, which paint with fill and stroke. */
const SHAPES = new Set(["path", "circle", "ellipse", "line", "polygon", "polyline", "rect", "text"]);
/** Text a person reads: a letter or a digit, not a lone symbol. */
const READABLE = /[\p{L}\p{N}]/u;
/**
 * Contrast is measured on colours rounded to 8 bits, and Echo's themes are
 * built to clear AA exactly; a ratio this close to the line is rounding, not
 * a problem.
 */
const ROUNDING = 0.05;
const PROBE = "echo-check-probe";

/**
 * A per-run reader for colour values the browser resolves (a theme token,
 * `Canvas`). The probe it sets them on is in a shadow root of its own, where
 * the page check's watcher can't see it change.
 */
function probeIn(doc: Document): (value: string) => Rgba | undefined {
  let host = doc.querySelector(PROBE);
  if (!host?.shadowRoot) {
    host = doc.createElement(PROBE);
    host.setAttribute("data-echo-check", "");
    host.attachShadow({ mode: "open" }).append(doc.createElement("span"));
    doc.documentElement.appendChild(host);
  }
  const el = host.shadowRoot!.querySelector("span")!;
  el.style.display = "none";
  const seen = new Map<string, Rgba | undefined>();
  return (value) => {
    if (!seen.has(value)) {
      el.style.color = "";
      el.style.color = value;
      // An invalid value leaves the property empty rather than set.
      seen.set(value, el.style.color ? parseColour(getComputedStyle(el).color) : undefined);
    }
    return seen.get(value);
  };
}

/** A CSS selector that finds `el` again, short enough to read. */
export function selectorOf(el: Element): string {
  const parts: string[] = [];
  for (let node: Element | null = el; node && parts.length < 5; node = node.parentElement) {
    if (node.id) {
      parts.unshift(`#${CSS.escape(node.id)}`);
      break;
    }
    const tag = node.localName;
    if (tag === "body" || tag === "html") {
      parts.unshift(tag);
      break;
    }
    const cls = [...node.classList].find((c) => c.startsWith("echo-")) ?? node.classList[0];
    let part = cls ? `${tag}.${CSS.escape(cls)}` : tag;
    const siblings = node.parentElement ? [...node.parentElement.children].filter((c) => c.localName === tag) : [];
    if (siblings.length > 1) part += `:nth-of-type(${siblings.indexOf(node) + 1})`;
    parts.unshift(part);
  }
  return parts.join(" > ");
}

const hasOwnText = (el: Element) =>
  [...el.childNodes].some((n) => n.nodeType === Node.TEXT_NODE && READABLE.test(n.textContent ?? ""));

/**
 * `el` as a person would point at it: `button.echo-hw__cap "Save"`. Its words
 * are quoted when they're its own or few; a container's run together into
 * nothing anyone would recognise. An element with no words of its own (an
 * icon key, a field) is quoted by its `aria-label`, which is what a screen
 * reader calls it.
 */
export function describe(el: Element): string {
  const cls = [...el.classList].find((c) => c.startsWith("echo-")) ?? el.classList[0];
  const text = (el.textContent ?? "").replace(/\s+/g, " ").trim() || (el.getAttribute("aria-label") ?? "").trim();
  const quoted = text && (text.length <= 40 || hasOwnText(el)) ? ` "${text.length > 40 ? `${text.slice(0, 39)}…` : text}"` : "";
  return `${el.localName}${el.id ? `#${el.id}` : ""}${cls ? `.${cls}` : ""}${quoted}`;
}

export function checkPage(doc: Document, options: PageCheckOptions = {}, notes: Iterable<PageCheckNote> = []): PageFinding[] {
  const body = doc.body;
  if (!body) return [];
  const off = new Set<PageRule>(options.ignore ?? []);
  const findings: PageFinding[] = [];
  const add = (rule: PageRule, el: Element | undefined, message: string, detail = "") => {
    const selector = el ? selectorOf(el) : undefined;
    findings.push({ rule, message, where: el ? describe(el) : undefined, selector, element: el, key: `${rule}:${selector ?? ""}:${detail}` });
  };

  const styles = new Map<Element, CSSStyleDeclaration>();
  const style = (el: Element) => {
    let cs = styles.get(el);
    if (!cs) styles.set(el, (cs = getComputedStyle(el)));
    return cs;
  };
  const probe = probeIn(doc);

  // Walk the rendered page once: what's laid out, and what of it can be seen.
  const rendered: Element[] = [body];
  const faded = new Set<Element>();
  const walk = (el: Element, fadedAbove: boolean) => {
    for (const child of el.children) {
      if (SKIP.has(child.localName) || child.hasAttribute("data-echo-check")) continue;
      const cs = style(child);
      if (cs.display === "none") continue;
      const isFaded = fadedAbove || parseFloat(cs.opacity) === 0;
      if (isFaded) faded.add(child);
      rendered.push(child);
      walk(child, isFaded);
    }
  };
  walk(body, false);
  const laidOut = new Set(rendered);
  const shown = (el: Element) => {
    if (!laidOut.has(el) || faded.has(el) || style(el).visibility !== "visible") return false;
    const box = el.getBoundingClientRect();
    return box.width > 1 && box.height > 1;
  };

  const echoParts = rendered.filter((el) => [...el.classList].some((c) => c.startsWith("echo-")));
  const owned = new Map<Element, boolean>();
  const echoOwned = (el: Element): boolean => {
    const known = owned.get(el);
    if (known !== undefined) return known;
    let result: boolean;
    if ([...el.classList].some((c) => c.startsWith("echo-"))) result = true;
    else if (el === body || el === doc.documentElement || NATIVE.has(el.localName)) result = false;
    else if (el.getAttribute("class")?.trim() || el.hasAttribute("style")) result = false;
    else result = el.parentElement ? echoOwned(el.parentElement) : false;
    owned.set(el, result);
    return result;
  };

  // Setup: what every Echo page needs before anything else can look right.
  if (!off.has("setup")) {
    const first = echoParts[0];
    if (first && !style(first).getPropertyValue("--echo-surface").trim()) {
      add("setup", undefined, "Echo's theme isn't on this page, so its parts have no colour. Import `echo-theme.css` (init wrote it into the Echo folder) from the root layout, or the stylesheet every page loads.", "theme");
    }
    const ground = [doc.documentElement, body].some((el) => {
      const cs = style(el);
      return (parseColour(cs.backgroundColor)?.a ?? 0) > 0 || cs.backgroundImage !== "none";
    });
    if (first && !ground) {
      add("setup", body, "the page has no ground, so Echo's parts sit on the browser's white. Give it the device's: `body { background: var(--echo-well); color: var(--echo-text); font-family: var(--echo-font-sans); }`.", "ground");
    }
    for (const note of notes) if (note.rule === "setup") findings.push({ ...note });
  }

  // Names: every control a person can reach says what it is.
  if (!off.has("name")) {
    for (const el of rendered) {
      if (!el.matches(CONTROLS)) continue;
      const role = roleOf(el);
      if (role === "presentation" || role === "none" || hiddenFromAssistiveTech(el, style)) continue;
      if (accessibleName(el, style)) continue;
      const fix = /^(textbox|searchbox|combobox|spinbutton|slider)$/.test(role)
        ? "Label it: Field's `label`, a `<label>`, or `aria-label`."
        : "Give it words, or `aria-label` when it shows only an icon.";
      add("name", el, `this ${role} has no name, so a screen reader says only "${role}". ${fix}`);
    }
  }

  // Contrast: every piece of text a person reads, against what's behind it.
  if (!off.has("contrast")) {
    const canvas = probe("Canvas") ?? { r: 1, g: 1, b: 1, a: 1 };
    const boxes = new Map<Element, DOMRect>();
    const box = (el: Element) => {
      let rect = boxes.get(el);
      if (!rect) boxes.set(el, (rect = el.getBoundingClientRect()));
      return rect;
    };
    /** Points across each of the text's first lines, where a gradient behind it is sampled. */
    const onText = (el: Element): Point[] => {
      const points: Point[] = [];
      for (const node of el.childNodes) {
        if (node.nodeType !== Node.TEXT_NODE || !READABLE.test(node.textContent ?? "")) continue;
        const range = doc.createRange();
        range.selectNodeContents(node);
        for (const line of [...range.getClientRects()].slice(0, 3)) {
          if (line.width < 1 || line.height < 1) continue;
          for (const fy of [0.3, 0.5, 0.7]) for (const fx of [0.1, 0.5, 0.9]) points.push({ x: line.left + line.width * fx, y: line.top + line.height * fy });
        }
      }
      return points;
    };
    const INACTIVE = ':disabled, [aria-disabled="true"]';
    /**
     * Inactive parts and decoration are exempt (WCAG 1.4.3). So is what names
     * or describes a disabled control from beside it, as a field's label and
     * help text do: they're part of the inactive control.
     */
    const exempt = (el: Element): boolean => {
      if (el.closest(`${INACTIVE}, [aria-hidden="true"]`)) return true;
      if (el.closest("label")?.control?.matches(INACTIVE)) return true;
      for (let at: Element | null = el; at; at = at.parentElement) {
        if (!at.id) continue;
        const id = CSS.escape(at.id);
        for (const user of doc.querySelectorAll(`[aria-labelledby~="${id}"], [aria-describedby~="${id}"]`)) {
          if (user.closest(INACTIVE)) return true;
        }
      }
      return false;
    };
    for (const el of rendered) {
      if (!hasOwnText(el) || !shown(el) || el.closest("svg")) continue;
      if (exempt(el)) continue;
      const points = onText(el);
      const xs = points.map((p) => p.x);
      const ys = points.map((p) => p.y);
      const area = points.length ? { left: Math.min(...xs), top: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs) + 1, height: Math.max(...ys) - Math.min(...ys) + 1 } : undefined;
      const geometry: TextGeometry = { points, area, box };
      const measured = textContrast(el, style, canvas, geometry);
      if (!measured) continue;
      if (measured.ratio + ROUNDING >= measured.needed) {
        // AA by the WCAG 2 ratio, which overrates bright, saturated text on a dark ground: small
        // text is measured in APCA too, and under its floor it's hard to read for anyone.
        const hard = smallTextHardToRead(hexOf(measured.text), hexOf(measured.background), measured.ratio, isLarge(style(el)));
        if (hard) add("contrast", el, hard);
        continue;
      }
      const ratio = `${measured.ratio.toFixed(1)}:1 (${hexOf(measured.text)} on ${hexOf(measured.background)})`;
      // Engraving is low contrast on purpose; it's fine where an icon or a caption says what the cap does.
      const engraved = el.closest("[data-engraved]");
      if (engraved) {
        const cap = engraved.closest(".echo-hw");
        if (cap?.querySelector(".echo-hw__icon, .echo-hw__caption")) continue;
        add("contrast", el, `an engraved label, ${ratio}: below AA by design, so it can't be the only thing saying what the cap does. Give the cap an icon or a caption that does, or drop \`engraved\`.`);
        continue;
      }
      const size = isLarge(style(el)) ? "Large text" : "Text this size";
      add(
        "contrast",
        el,
        `${ratio}. ${size} needs ${measured.needed}:1. Use a text role made for this ground: \`--echo-text\`, or \`--echo-text-dim\` for secondary text.`,
      );
    }
  }

  // Colour: what the app paints comes from its seed.
  if (!off.has("colour")) {
    const extra = (options.colours ?? []).map(probe).filter((c): c is Rgba => c !== undefined);
    const palettes = new Map<string, Palette>();
    const paletteAt = (el: Element) => {
      const cs = style(el);
      const values = THEME_COLOUR_TOKENS.map((token) => cs.getPropertyValue(token).trim());
      if (!values[0]) return undefined;
      const key = values.join("|");
      let palette = palettes.get(key);
      if (!palette) {
        const colours = new Map<string, Rgba>();
        THEME_COLOUR_TOKENS.forEach((token, i) => {
          const colour = values[i] ? probe(values[i]!) : undefined;
          if (colour) colours.set(token, colour);
        });
        palettes.set(key, (palette = new Palette(colours, extra)));
      }
      return palette;
    };
    /** Where a text colour was set: the highest ancestor that has it, unless Echo set it. */
    const setter = (el: Element): Element | undefined => {
      const colour = style(el).color;
      let at = el;
      for (let p = el.parentElement; p && style(p).color === colour; p = p.parentElement) {
        if (echoOwned(p)) return undefined;
        at = p;
      }
      return at;
    };

    const painted = new Map<Element, Map<string, { colour: Rgba; how: Set<string> }>>();
    const paint = (el: Element, how: string, colour: Rgba | undefined) => {
      if (!colour || colour.a === 0) return;
      const byColour = painted.get(el) ?? new Map();
      const hex = hexOf(colour);
      const entry = byColour.get(hex) ?? { colour, how: new Set<string>() };
      entry.how.add(how);
      byColour.set(hex, entry);
      painted.set(el, byColour);
    };
    for (const el of rendered) {
      if (!shown(el)) continue;
      if (hasOwnText(el) && !el.closest("svg")) {
        const at = setter(el);
        if (at && !echoOwned(at)) paint(at, "text", parseColour(style(el).color));
      }
      if (echoOwned(el)) continue;
      const cs = style(el);
      paint(el, "background", parseColour(cs.backgroundColor));
      for (const side of ["top", "right", "bottom", "left"]) {
        const width = parseFloat(cs.getPropertyValue(`border-${side}-width`));
        const line = cs.getPropertyValue(`border-${side}-style`);
        if (width > 0 && line !== "none" && line !== "hidden") paint(el, "border", parseColour(cs.getPropertyValue(`border-${side}-color`)));
      }
      if (cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0) paint(el, "outline", parseColour(cs.outlineColor));
      for (const stop of (gradientLayers(cs.backgroundImage) ?? []).flat()) paint(el, "gradient", stop);
      if (SHAPES.has(el.localName) && el.closest("svg")) {
        paint(el, "fill", parseColour(cs.fill));
        paint(el, "stroke", parseColour(cs.stroke));
      }
    }
    for (const [el, byColour] of painted) {
      const palette = paletteAt(el);
      if (!palette) continue;
      for (const [hex, { colour, how }] of byColour) {
        const match = palette.match(colour);
        if (match.ours) continue;
        const fix = match.nearest
          ? `It's standing in for \`${match.nearest}\`: use \`var(${match.nearest})\`.`
          : "Paint it with a `var(--echo-*)` role, or list it in `colours` if it's a brand colour on purpose.";
        add("colour", el, `${hex} (${[...how].join(", ")}) isn't one of this theme's colours. ${fix}`, hex);
      }
    }
  }

  if (DESIGN_RULES.some((rule) => !off.has(rule))) {
    findings.push(
      ...designFindings({
        rendered,
        shown,
        style,
        echoOwned,
        where: (el) => ({ where: describe(el), selector: selectorOf(el) }),
        off,
      }),
    );
  }

  if (!off.has("screen")) {
    findings.push(...screenFindings(doc, shown, (el) => ({ where: describe(el), selector: selectorOf(el) })));
  }

  const order = (f: PageFinding) => PAGE_RULES.indexOf(f.rule);
  return findings.sort((a, b) => order(a) - order(b));
}
