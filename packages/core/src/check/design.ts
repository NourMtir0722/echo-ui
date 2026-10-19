/**
 * The design tests: what a designer checks on a screen an agent built,
 * measured on the rendered page, beside the page check's contrast.
 *
 * - `alignment`: text cut off with an ellipsis; cards side by side whose
 *   actions sit at different heights; a lone action off its column's edge.
 * - `depth`: a control that glows without being lit; a raised surface on a
 *   raised surface with no well between. (A shadow drawn by hand is the source
 *   check's `shadow` rule, which can say which line drew it.)
 * - `corners`: parts of one kind with different corners; a corner inside a
 *   corner that doesn't follow it (the inner one is the outer one less the gap).
 * - `icons`: the icons of one group at different sizes or stroke weights, or
 *   filled beside outlined.
 *
 * Each finding says what was measured and the one change that fixes it, and
 * that nothing else should change: an agent told "fix the alignment" redoes
 * the screen, and one told "line these three keys up" lines them up.
 *
 * Every distance has one tolerance, 2px: what a person can't see isn't a
 * finding. Echo's parts are held to what an app can get wrong with them (how
 * they're placed, nested and grouped), not to how each is built inside.
 */
import { hexOf, oklab, parseColour, type Rgba } from "./colour";
import { topLevel } from "./gradient";
import type { PageFinding, PageRule } from "./types";

/** How far apart two edges, sizes or corners can be before it shows. */
export const DESIGN_TOLERANCE = 2;

export const DESIGN_RULES = ["alignment", "depth", "corners", "icons"] as const;
export type DesignRule = (typeof DESIGN_RULES)[number];

export interface DesignContext {
  rendered: readonly Element[];
  shown(el: Element): boolean;
  style(el: Element): CSSStyleDeclaration;
  /** Echo's own: an `echo-` part, or the unclassed structure inside one. */
  echoOwned(el: Element): boolean;
  where(el: Element): { where: string; selector: string };
  off: ReadonlySet<PageRule>;
}

/* ---------------------------------------------------------------- shadows */

export interface ShadowLayer {
  x: number;
  y: number;
  blur: number;
  spread: number;
  inset: boolean;
  colour?: Rgba;
}

const LENGTH = /^(-?\d*\.?\d+)(px)?$/;

/** A computed `box-shadow`, layer by layer. */
export function parseShadows(value: string): ShadowLayer[] {
  if (!value || value === "none") return [];
  return topLevel(value).map((layer) => {
    let rest = layer;
    let colour: Rgba | undefined;
    const fn = rest.match(/[a-z-]+\((?:[^()]|\([^()]*\))*\)/i);
    if (fn) {
      colour = parseColour(fn[0]);
      rest = rest.replace(fn[0], " ");
    }
    const inset = /\binset\b/.test(rest);
    const lengths: number[] = [];
    for (const word of rest.replace(/\binset\b/, " ").trim().split(/\s+/)) {
      const m = word.match(LENGTH);
      if (m) lengths.push(parseFloat(m[1]!));
      else if (word && !colour) colour = parseColour(word);
    }
    const [x = 0, y = 0, blur = 0, spread = 0] = lengths;
    return { x, y, blur, spread, inset, colour };
  });
}

const seen = (l: ShadowLayer) => (l.colour?.a ?? 1) > 0.02 && (l.blur > 0 || l.spread !== 0 || l.x !== 0 || l.y !== 0);
/** A ring or outline drawn with a shadow: a line, not depth. */
const isLine = (l: ShadowLayer) => l.blur === 0 && l.x === 0 && l.y === 0;
const lightness = (c: Rgba | undefined) => (c ? oklab(c)[0] : 0);
const chroma = (c: Rgba | undefined) => (c ? Math.hypot(oklab(c)[1], oklab(c)[2]) : 0);
/** Set into the surface: an inset shade. */
export const recessed = (layers: ShadowLayer[]) => layers.some((l) => seen(l) && l.inset && !isLine(l));
/** Standing off the surface: a shade below it. A pale lip a pixel down is a highlight, not a stand. */
export const raised = (layers: ShadowLayer[]) =>
  layers.some((l) => seen(l) && !l.inset && l.y >= 1 && !(lightness(l.colour) > 0.85 && l.blur <= 1));
/** Light around it: a soft shadow that isn't below it and isn't a shade. */
export function glowOf(layers: ShadowLayer[]): ShadowLayer | undefined {
  return layers.find(
    (l) => seen(l) && !l.inset && l.blur >= 4 && Math.abs(l.x) <= 1 && Math.abs(l.y) <= 1 && (lightness(l.colour) >= 0.45 || chroma(l.colour) >= 0.1),
  );
}

/* --------------------------------------------------------------- geometry */

const near = (a: number, b: number) => Math.abs(a - b) <= DESIGN_TOLERANCE;
const px = (n: number) => `${Math.round(n)}px`;
const READABLE = /[\p{L}\p{N}]/u;
const words = (el: Element) => (el.textContent ?? "").replace(/\s+/g, " ").trim();
const quote = (el: Element) => {
  const text = words(el);
  return text.length > 40 ? `"${text.slice(0, 39)}…"` : `"${text}"`;
};

/** The pressable things an action row is made of. */
const ACTION = 'button, [role="button"], input[type="submit"], input[type="button"], .echo-hw, a[class*="button" i], a[class*="btn" i]';
/** An action as the eye sees it: a HardwareButton is its whole key, well and all. */
const actionRoot = (el: Element) => el.closest(".echo-hw") ?? el;
/** A control that can be lit: the current page, a chosen tab, a key that's on. */
const LIT = '[aria-current]:not([aria-current="false"]), [aria-selected="true"], [aria-pressed="true"], [aria-checked="true"], :checked, [data-state="on"], [data-state="active"], [data-state="checked"]';
const CONTROL = 'button, a[href], input, select, textarea, [role="button"], [role="switch"], [role="tab"], [role="checkbox"], [role="radio"], [role="menuitem"], [role="option"], [role="slider"]';
/** Where a lone action at the end is the convention, not a slip. */
const END_ACTIONS_OK = 'dialog, [role="dialog"], [role="alertdialog"], [role="toolbar"], nav, header, [role="banner"], [role="menu"], table';
const REPLACED = new Set(["img", "svg", "video", "canvas", "picture", "iframe", "input", "select", "textarea"]);

/** A piece of an Echo part (`echo-x__y`): how the part is built inside, which is Echo's to lay out, not the app's. */
const piece = (el: Element) => [...el.classList].some((c) => /^echo-[a-z0-9-]+__/.test(c));

/** An Echo part's block: the element that carries its `echo-x` class (not an `echo-x__y` piece). */
function echoBlock(el: Element): Element | null {
  for (let at: Element | null = el; at; at = at.parentElement) {
    if ([...at.classList].some((c) => /^echo-[a-z0-9-]+$/.test(c) && !c.startsWith("echo-check"))) return at;
  }
  return null;
}

/** Echo's grids, by the part each belongs to: today's let fewer items share the row, so one that doesn't is an older copy. */
const ECHO_GRIDS: Record<string, string> = { "echo-grid": "layout", "echo-choice-cards__grid": "choice-cards", "echo-shortcut-map__list": "shortcut-map" };

/* ------------------------------------------------------------- the tests */

export function designFindings(ctx: DesignContext): PageFinding[] {
  const { rendered, shown, style, echoOwned, off } = ctx;
  const findings: PageFinding[] = [];
  const add = (rule: DesignRule, el: Element, what: string, fix: string, measured: string, related: Element[] = [], detail = "") => {
    const { where, selector } = ctx.where(el);
    findings.push({
      rule,
      message: `${what} ${fix}`,
      fix,
      measured,
      where,
      selector,
      related: related.length ? related.map((r) => ctx.where(r).selector) : undefined,
      element: el,
      key: `${rule}:${selector}:${detail}`,
    });
  };

  const rects = new Map<Element, DOMRect>();
  const box = (el: Element) => {
    let r = rects.get(el);
    if (!r) rects.set(el, (r = el.getBoundingClientRect()));
    return r;
  };
  const shadows = new Map<Element, ShadowLayer[]>();
  const layersOf = (el: Element) => {
    let l = shadows.get(el);
    if (!l) shadows.set(el, (l = parseShadows(style(el).boxShadow)));
    return l;
  };
  const visible = rendered.filter(shown);
  const kids = (el: Element) => [...el.children].filter((c) => shown(c) && box(c).height > 0 && box(c).width > 0);
  const ltrOf = (el: Element) => style(el).direction !== "rtl";
  const startOf = (r: DOMRect, ltr: boolean) => (ltr ? r.left : r.right);
  const painted = (el: Element) => {
    const cs = style(el);
    if ((parseColour(cs.backgroundColor)?.a ?? 0) > 0.02 || cs.backgroundImage !== "none") return true;
    if (layersOf(el).some(seen)) return true;
    return ["top", "right", "bottom", "left"].some(
      (side) =>
        parseFloat(cs.getPropertyValue(`border-${side}-width`)) > 0 &&
        !["none", "hidden"].includes(cs.getPropertyValue(`border-${side}-style`)) &&
        (parseColour(cs.getPropertyValue(`border-${side}-color`))?.a ?? 0) > 0.02,
    );
  };
  const positioned = (el: Element) => ["absolute", "fixed"].includes(style(el).position);

  /** Where the first thing you'd see in `el` starts: its text, or a painted box in it. */
  const inkStart = (el: Element, ltr: boolean): number | undefined => {
    let best: number | undefined;
    const take = (x: number) => {
      if (best === undefined || (ltr ? x < best : x > best)) best = x;
    };
    const visit = (node: Element, depth: number) => {
      if (depth > 12 || !shown(node) || positioned(node)) return;
      if (node !== el && (painted(node) || REPLACED.has(node.localName) || node.matches(ACTION))) {
        take(startOf(box(node), ltr));
        return;
      }
      for (const child of node.childNodes) {
        if (child.nodeType === Node.TEXT_NODE && READABLE.test(child.textContent ?? "")) {
          const range = node.ownerDocument.createRange();
          range.selectNodeContents(child);
          for (const line of range.getClientRects()) if (line.width > 0) take(startOf(line, ltr));
        } else if (child.nodeType === Node.ELEMENT_NODE) visit(child as Element, depth + 1);
      }
    };
    // A part that paints its own surface (a card, a ticket) starts where its surface does.
    if (painted(el) || REPLACED.has(el.localName)) return startOf(box(el), ltr);
    visit(el, 0);
    return best;
  };

  /* ---- alignment ---- */
  if (!off.has("alignment")) {
    // Text cut off: it needs more room than it has, and ends in "…". One finding a list.
    const cut = new Map<Element, { el: Element; needs: string; over: number; fix: string }[]>();
    for (const el of visible) {
      if (REPLACED.has(el.localName) || !READABLE.test(el.textContent ?? "")) continue;
      const cs = style(el);
      const clamp = cs.getPropertyValue("-webkit-line-clamp");
      const cutAcross = cs.textOverflow === "ellipsis" && cs.overflowX !== "visible" && el.scrollWidth > el.clientWidth + 1;
      const cutDown = !!clamp && clamp !== "none" && el.scrollHeight > el.clientHeight + 1;
      if (!cutAcross && !cutDown) continue;
      if (el.closest('[data-truncate], [aria-hidden="true"]')) continue;
      const needs = cutAcross ? `${px(el.scrollWidth)} wide and has ${px(el.clientWidth)}` : `${px(el.scrollHeight)} tall and has ${px(el.clientHeight)}`;
      const own = echoOwned(el);
      // Echo's Item wraps now unless it's asked to `truncate` (which is let be): cut off, it's an older copy.
      const fix = el.closest(".echo-item")
        ? "This copy of Echo's Item cuts its text off: `npx echo-ui-cli update item` brings the one that wraps (one line only with `truncate`). Change nothing else."
        : own
          ? "Give it the room it needs, or say it in fewer words. Change only its width or its words, not the part."
          : `Let it wrap (drop the \`white-space: nowrap\` and \`text-overflow\`${cutDown ? " and the line clamp" : ""}), or say it in fewer words. Change only this text, not the layout around it.`;
      const list = el.parentElement?.closest('ul, ol, dl, table, [role="list"], [role="grid"], [role="listbox"]') ?? el;
      const over = cutAcross ? el.scrollWidth - el.clientWidth : el.scrollHeight - el.clientHeight;
      cut.set(list, [...(cut.get(list) ?? []), { el, needs, over, fix }]);
    }
    for (const texts of cut.values()) {
      const [first] = texts;
      if (texts.length === 1) {
        add("alignment", first!.el, `${quote(first!.el)} is cut off: it needs ${first!.needs}, so it ends in "…".`, first!.fix, `needs ${first!.needs}`, [], "cut");
        continue;
      }
      const worst = texts.reduce((a, b) => (b.over > a.over ? b : a));
      const named = texts.slice(0, 2).map((t) => quote(t.el)).join(", ");
      add(
        "alignment",
        first!.el,
        `${texts.length} lines in this list are cut off (${named}${texts.length > 2 ? ", …" : ""}) and end in "…": the longest needs ${worst.needs}.`,
        first!.fix.replace("this row", "these rows").replace("this text", "these texts"),
        `${texts.length} cut off; the longest needs ${worst.needs}`,
        texts.slice(1).map((t) => t.el),
        "cut",
      );
    }

    // A grid row that leaves columns empty: two cards in three columns.
    for (const grid of visible) {
      const cs = style(grid);
      if (!/grid/.test(cs.display)) continue;
      const tracks = cs.gridTemplateColumns.split(/\s+/).map(parseFloat).filter((n) => n > 0);
      // Equal columns, as auto-fill makes: a layout of unequal ones (a sidebar, a gutter) is its own.
      if (tracks.length < 2 || tracks.some((t) => Math.abs(t - tracks[0]!) > 1)) continue;
      const items = kids(grid).filter((k) => !positioned(k));
      if (!items.length || items.length >= tracks.length || items.some((k) => !near(box(k).top, box(items[0]!).top))) continue;
      const ltr = ltrOf(grid);
      const r = box(grid);
      const end = ltr ? r.right - parseFloat(cs.borderRightWidth) - parseFloat(cs.paddingRight) : r.left + parseFloat(cs.borderLeftWidth) + parseFloat(cs.paddingLeft);
      const reach = ltr ? Math.max(...items.map((k) => box(k).right)) : Math.min(...items.map((k) => box(k).left));
      const empty = Math.abs(end - reach);
      if (empty < Math.min(...tracks) - DESIGN_TOLERANCE) continue;
      const echoGrid = ECHO_GRIDS[[...grid.classList].find((c) => c in ECHO_GRIDS) ?? ""];
      add(
        "alignment",
        grid,
        `this grid puts ${items.length} ${items.length === 1 ? "item" : "items"} in ${tracks.length} columns, leaving ${px(empty)} of the row empty at the end.`,
        echoGrid
          ? `This copy of Echo's ${echoGrid} leaves them: \`npx echo-ui-cli update ${echoGrid}\` brings the one where fewer items share the row. Change nothing else.`
          : "Let the items share the row: `repeat(auto-fit, …)` instead of `auto-fill` (Echo's Grid does), or as many columns as there are items. Change only the grid's columns, not what's in them.",
        `${items.length} items, ${tracks.length} columns, ${px(empty)} empty`,
        items,
        "empty",
      );
    }

    // Cards side by side whose actions sit at different heights.
    for (const parent of visible) {
      const row = kids(parent);
      if (row.length < 2) continue;
      const byTop: Element[][] = [];
      for (const el of [...row].sort((a, b) => box(a).top - box(b).top)) {
        const last = byTop.at(-1);
        if (last && near(box(last[0]!).top, box(el).top)) last.push(el);
        else byTop.push([el]);
      }
      for (const members of byTop) {
        // Cards made the same way: one tag and one class list.
        const made = (m: Element) => `${m.localName}.${m.getAttribute("class") ?? ""}`;
        if (members.length < 2 || members.some((m) => made(m) !== made(members[0]!) || m.matches(ACTION) || piece(m))) continue;
        // Cells the row stands at one height (a grid row, a stretched flex row): there, keys out of line show.
        if (members.some((m) => !near(box(m).height, box(members[0]!).height))) continue;
        const actions = members.map((m) => {
          const found = [...m.querySelectorAll(ACTION)].filter(shown).map(actionRoot);
          return found.at(-1);
        });
        if (actions.some((a) => !a) || new Set(actions).size < actions.length) continue;
        const keys = actions as Element[];
        // The same key in each card, in the same place: not one card's menu against another's face.
        const placed = (k: Element) => `${made(k)}<${k.parentElement ? made(k.parentElement) : ""}`;
        if (keys.some((k) => placed(k) !== placed(keys[0]!))) continue;
        const tops = keys.map((k) => box(k).top);
        const spread = Math.max(...tops) - Math.min(...tops);
        if (spread <= DESIGN_TOLERANCE) continue;
        const rowTop = Math.min(...members.map((m) => box(m).top));
        const heights = tops.map((t) => px(t - rowTop)).join(", ");
        // A card that stops short of its cell is the usual cause.
        const short = members.some((m) => {
          const inner = kids(m);
          return inner.length === 1 && box(m).bottom - box(inner[0]!).bottom > DESIGN_TOLERANCE;
        });
        // Today's Echo Card fills a list item it's alone in, with its footer at the bottom: one that doesn't is an older copy.
        const oldCard = short && members.every((m) => m.matches("li") && kids(m)[0]?.classList.contains("echo-card"));
        const fix = oldCard
          ? "This copy of Echo's Card doesn't fill its list item: `npx echo-ui-cli update card` brings the one that does, with its footer at the bottom. Change nothing else."
          : short
          ? "Line them up at the bottom: make each card fill its cell (an Echo Card alone in a list item does; a card of your own needs `height: 100%`) and put its actions last, at `margin-top: auto`. Change only the cards' layout, not the actions, the text or the colours."
          : "Line them up at the bottom of their cards: put each card's actions last, at `margin-top: auto` (an Echo Card's footer is). Change only the cards' layout, not the actions, the text or the colours.";
        add(
          "alignment",
          keys[tops.indexOf(Math.max(...tops))]!,
          `${members.length} cards side by side have their actions at ${new Set(tops.map(Math.round)).size} heights (${heights} from the top of the row).`,
          fix,
          `action tops ${heights}; ${DESIGN_TOLERANCE}px allowed`,
          keys,
          "row",
        );
      }
    }

    // A lone action off its column's edge: not where the content starts, not centred, not full width.
    for (const column of visible) {
      const stack = kids(column).filter((k) => !positioned(k));
      if (stack.length < 2) continue;
      const ordered = [...stack].sort((a, b) => box(a).top - box(b).top);
      if (ordered.some((k, i) => i > 0 && box(k).top < box(ordered[i - 1]!).bottom - DESIGN_TOLERANCE)) continue;
      const lone = ordered.filter((k) => {
        const inside = [...new Set([...(k.matches(ACTION) ? [k] : []), ...k.querySelectorAll(ACTION)].filter(shown).map(actionRoot))];
        if (inside.length !== 1 || words(k) !== words(inside[0]!)) return false;
        // Nothing else shares its line: no field, no other part, no picture.
        const key = inside[0]!;
        return ![...k.querySelectorAll("*")].some(
          (d) => !key.contains(d) && !d.contains(key) && shown(d) && box(d).width > 0 && (REPLACED.has(d.localName) || d.matches(CONTROL) || painted(d)),
        );
      });
      // Only what comes last, a footer: a header bar's action at the end is the convention.
      if (lone.at(-1) !== ordered.at(-1)) continue;
      lone.splice(0, lone.length - 1);
      if (!lone.length || column.closest(END_ACTIONS_OK)) continue;
      const ltr = ltrOf(column);
      const starts = ordered.filter((k) => !lone.includes(k)).map((k) => inkStart(k, ltr)).filter((x): x is number => x !== undefined);
      if (!starts.length) continue;
      const edge = ltr ? Math.min(...starts) : Math.max(...starts);
      const cs = style(column);
      const r = box(column);
      const left = r.left + parseFloat(cs.borderLeftWidth) + parseFloat(cs.paddingLeft);
      const right = r.right - parseFloat(cs.borderRightWidth) - parseFloat(cs.paddingRight);
      for (const k of lone) {
        const key = actionRoot([...k.querySelectorAll(ACTION)].find(shown) ?? k);
        const a = box(key);
        if (near(startOf(a, ltr), edge) || near((a.left + a.right) / 2, (left + right) / 2) || a.width >= right - left - 2 * DESIGN_TOLERANCE) continue;
        const chain: Element[] = [];
        for (let at = key.parentElement; at && at !== column; at = at.parentElement) chain.push(at);
        // Placed by an Echo part's own pieces: the project's copy of the part does it.
        const part = chain.length && chain.every(piece) ? [...chain.at(-1)!.classList].map((c) => /^echo-([a-z0-9-]+)__/.exec(c)?.[1]).find(Boolean) : undefined;
        // What places it: the nearest box wider than it. At that box's start, or centred in it, it's placed, not stranded.
        const holder = chain.find((at) => box(at).width > a.width + 2 * DESIGN_TOLERANCE);
        if (holder) {
          const hs = style(holder);
          const h = box(holder);
          const hl = h.left + parseFloat(hs.borderLeftWidth) + parseFloat(hs.paddingLeft);
          const hr = h.right - parseFloat(hs.borderRightWidth) - parseFloat(hs.paddingRight);
          if (near(startOf(a, ltr), ltr ? hl : hr) || near((a.left + a.right) / 2, (hl + hr) / 2)) continue;
        }
        const off = Math.abs(startOf(a, ltr) - edge);
        add(
          "alignment",
          key,
          `${quote(key)} sits ${px(off)} from where the rest of its column starts, and isn't centred in it either.`,
          part
            ? `This copy of Echo's ${part} puts it there: \`npx echo-ui-cli update ${part}\` brings the one that starts it under the title. Change nothing else.`
            : "Start it where the content starts, under the title (an Echo Card's footer does), or centre it if everything above it is centred. Change only where the action sits, not the action, the text or the colours.",
          `${px(off)} off the content's start edge; ${DESIGN_TOLERANCE}px allowed`,
          [],
          "edge",
        );
      }
    }
  }

  /* ---- depth ---- */
  if (!off.has("depth")) {
    for (const el of visible) {
      const layers = layersOf(el);
      if (!layers.some(seen)) continue;
      const own = echoOwned(el);

      // A control that glows at rest: light means state in Echo, and a glow on a key is decoration.
      const glow = glowOf(layers);
      if (glow && !own && el.matches(CONTROL) && !el.matches(LIT) && !el.closest(LIT) && !el.matches(":focus, :focus-visible")) {
        add(
          "depth",
          el,
          `this ${el.getAttribute("role") ?? el.localName} glows at rest (${px(glow.blur)} of ${glow.colour ? hexOf(glow.colour) : "light"} around it), though nothing about it is lit.`,
          "Take the glow off: in Echo, light says a state (the page you're on, a key that's on). Change only its shadow, not its colour or its size.",
          `glow ${px(glow.blur)} blur`,
          [],
          "glow",
        );
        continue;
      }

      // A raised surface on a raised surface, with no well between.
      if (raised(layers) && !positioned(el) && !el.matches(CONTROL) && box(el).height >= 64 && box(el).width >= 120) {
        let under: Element | undefined;
        for (let at = el.parentElement; at && at !== el.ownerDocument.body; at = at.parentElement) {
          const l = layersOf(at);
          if (recessed(l)) break;
          if (positioned(at) || at.matches('dialog, [role="dialog"], [role="alertdialog"], [popover]')) break;
          if (raised(l)) {
            under = at;
            break;
          }
        }
        const block = echoBlock(el);
        if (under && !(block && echoOwned(under) && echoBlock(under) === block)) {
          add(
            "depth",
            el,
            `a raised surface sits on another raised surface (${ctx.where(under).where}) with no well between, so two shadows stack.`,
            "Set the inner one flat (no shadow; a hairline if it needs an edge) or into a well (`var(--echo-shadow-well)`); never a Card in a Card. Change only the inner part's shadow, not its size, its text or its colours.",
            "raised on raised",
            [under],
            "stack",
          );
          continue;
        }
      }

    }
  }

  /* ---- corners ---- */
  if (!off.has("corners")) {
    type Corner = { r: number; pill: boolean };
    const CORNERS = ["top-left", "top-right", "bottom-right", "bottom-left"] as const;
    const cornerOf = (el: Element, which: (typeof CORNERS)[number]): Corner => {
      const b = box(el);
      const raw = style(el).getPropertyValue(`border-${which}-radius`).trim().split(/\s+/)[0] ?? "0";
      const half = Math.min(b.width, b.height) / 2;
      const value = raw.endsWith("%") ? (parseFloat(raw) / 100) * Math.min(b.width, b.height) : parseFloat(raw) || 0;
      const r = Math.min(value, half);
      return { r, pill: half > 0 && r >= half - 0.5 };
    };
    const surfaces = visible.filter((el) => REPLACED.has(el.localName) || painted(el));
    const isSurface = new Set(surfaces);

    // Parts of one kind with different corners: the same slot in a row or a list.
    const groups = new Map<string, Element[]>();
    const slotIds = new Map<Element, number>();
    const slot = (el: Element) => {
      let w: Element = el;
      while (w.parentElement && w.parentElement !== el.ownerDocument.body && kids(w.parentElement).length === 1 && !isSurface.has(w.parentElement)) w = w.parentElement;
      const parent = w.parentElement;
      if (!parent) return undefined;
      if (!slotIds.has(parent)) slotIds.set(parent, slotIds.size);
      // A part's size and variant are on its block, not on the piece that's painted.
      const part = (echoOwned(el) && echoBlock(el)) || el;
      const made = ["data-size", "data-variant", "data-shape"].map((name) => part.getAttribute(name) ?? "").join("|");
      return `${slotIds.get(parent)}>${w.localName}>${el.localName}.${el.getAttribute("class") ?? ""}[${made}]`;
    };
    for (const el of surfaces) {
      if (REPLACED.has(el.localName) || positioned(el)) continue;
      const key = slot(el);
      if (key) groups.set(key, [...(groups.get(key) ?? []), el]);
    }
    for (const members of groups.values()) {
      if (members.length < 2) continue;
      // Side by side, or a list, and the same size: a column of unrelated panels isn't one kind.
      const sameRow = members.every((m) => near(box(m).top, box(members[0]!).top));
      const listed = members.every((m) => m.closest("li, [role='listitem']") && m.closest("ul, ol, [role='list']") === members[0]!.closest("ul, ol, [role='list']"));
      const alike = members.every((m) => Math.abs(box(m).width - box(members[0]!).width) <= Math.max(DESIGN_TOLERANCE, box(members[0]!).width * 0.1));
      if (!(sameRow || listed) || !alike) continue;
      // Parts that touch are one shape (a joined strip, a button group): only its outer corners round.
      const sorted = [...members].sort((p, q) => box(p).left - box(q).left || box(p).top - box(q).top);
      if (sorted.some((m, i) => i > 0 && (box(m).left - box(sorted[i - 1]!).right <= 1 && sameRow || box(m).top - box(sorted[i - 1]!).bottom <= 1 && !sameRow))) continue;
      const corners = members.map((m) => cornerOf(m, "top-left"));
      if (corners.some((c) => c.pill)) continue;
      const counts = new Map<number, number>();
      for (const c of corners) counts.set(Math.round(c.r), (counts.get(Math.round(c.r)) ?? 0) + 1);
      const common = [...counts].sort((a, b) => b[1] - a[1])[0]![0];
      const odd = members.filter((_, i) => !near(corners[i]!.r, common));
      if (!odd.length || odd.length * 2 > members.length) continue;
      const first = odd[0]!;
      add(
        "corners",
        first,
        `${members.length} parts of one kind side by side have different corners: ${odd.length === 1 ? "this one is" : `${odd.length} are`} ${px(cornerOf(first, "top-left").r)} and the rest ${px(common)}.`,
        `Give it the same corner as the others, ${px(common)}. Change only its radius.`,
        `radius ${px(cornerOf(first, "top-left").r)} vs ${px(common)}`,
        members.filter((m) => !odd.includes(m)).slice(0, 3),
        "kind",
      );
    }

    // A corner inside a corner: concentric, the outer radius less the gap between them.
    for (const el of surfaces) {
      if (positioned(el)) continue;
      let outer: Element | undefined;
      let clipped = false;
      for (let at = el.parentElement; at && at !== el.ownerDocument.body; at = at.parentElement) {
        if (style(at).overflow !== "visible") clipped = true;
        if (isSurface.has(at)) {
          outer = at;
          break;
        }
      }
      // Echo inside Echo is Echo's design: the test is for the corners the app sets.
      if (!outer || clipped || (echoOwned(el) && echoOwned(outer))) continue;
      const a = box(outer);
      const cs = style(outer);
      const inner = { left: a.left + parseFloat(cs.borderLeftWidth), right: a.right - parseFloat(cs.borderRightWidth), top: a.top + parseFloat(cs.borderTopWidth), bottom: a.bottom - parseFloat(cs.borderBottomWidth) };
      const b = box(el);
      for (const which of CORNERS) {
        const out = cornerOf(outer, which);
        const mine = cornerOf(el, which);
        if (out.pill || mine.pill || out.r <= DESIGN_TOLERANCE) continue;
        const gx = which.endsWith("left") ? b.left - inner.left : inner.right - b.right;
        const gy = which.startsWith("top") ? b.top - inner.top : inner.bottom - b.bottom;
        const gap = Math.max(gx, gy);
        // Only a corner that sits in the outer one's curve follows it; further in, any corner reads as its own.
        if (gx < -1 || gy < -1 || gap >= out.r / 2) continue;
        const should = Math.max(0, out.r - Math.max(0, gap));
        if (Math.abs(mine.r - should) <= Math.max(DESIGN_TOLERANCE, out.r / 10)) continue;
        add(
          "corners",
          el,
          `its ${which} corner is ${px(mine.r)} inside a ${px(out.r)} corner ${px(gap)} away, so the two curves don't run side by side.`,
          `Make it ${px(should)}: the outer corner less the gap. Change only this part's radius.`,
          `inner ${px(mine.r)}, outer ${px(out.r)}, gap ${px(gap)}; should be ${px(should)}`,
          [outer],
          "nested",
        );
        break;
      }
    }
  }

  /* ---- icons ---- */
  if (!off.has("icons")) {
    const GROUP = 'nav, [role="toolbar"], [role="tablist"], [role="menubar"], [role="menu"], [role="radiogroup"], ul, ol, menu';
    const ITEM = 'li, a[href], button, [role="tab"], [role="menuitem"], [role="menuitemradio"], [role="menuitemcheckbox"], [role="radio"]';
    const SHAPES = "path, circle, ellipse, line, polygon, polyline, rect";
    const groups = new Map<Element, Element[]>();
    for (const svg of visible) {
      if (svg.localName !== "svg" || svg.parentElement?.closest("svg")) continue;
      const b = box(svg);
      if (b.width < 8 || b.width > 48 || b.height > 48) continue;
      const item = svg.closest(ITEM);
      const group = (item ?? svg).parentElement?.closest(GROUP);
      if (!item || !group || item.closest(GROUP) !== group) continue;
      // The icon that leads the item, not a chevron or a cross after its words.
      const lead = [...item.querySelectorAll("svg")].find((s) => shown(s) && !s.parentElement?.closest("svg"));
      if (lead !== svg) continue;
      groups.set(group, [...(groups.get(group) ?? []), svg]);
    }
    const label = (svg: Element) => {
      const item = svg.closest(ITEM)!;
      return words(item) ? quote(item) : (item.getAttribute("aria-label") ?? "an item");
    };
    const majority = <T,>(values: T[]) => {
      const counts = new Map<T, number>();
      for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
      return [...counts].sort((a, b) => b[1] - a[1])[0]![0];
    };
    for (const [group, icons] of groups) {
      if (icons.length < 2) continue;
      const what = group.getAttribute("role") ?? (group.localName === "nav" ? "navigation" : "list");

      const sizes = icons.map((s) => Math.round(box(s).width));
      const size = majority(sizes);
      const odd = icons.filter((_, i) => !near(sizes[i]!, size));
      if (odd.length && odd.length * 2 <= icons.length) {
        add(
          "icons",
          odd[0]!,
          `the icons in this ${what} are different sizes: ${label(odd[0]!)}'s is ${px(box(odd[0]!).width)} and the rest ${px(size)}.`,
          `Make it ${px(size)} like the others (\`--echo-icon-*\` has the steps). Change only that icon's size.`,
          `icon ${px(box(odd[0]!).width)} vs ${px(size)}`,
          icons.filter((s) => !odd.includes(s)).slice(0, 3),
          "size",
        );
        continue;
      }

      const drawn = icons.map((svg) => {
        let stroke = 0;
        let filled = false;
        const scale = (() => {
          const vb = (svg as SVGSVGElement).viewBox?.baseVal;
          return vb && vb.width > 0 ? box(svg).width / vb.width : 1;
        })();
        for (const shape of svg.querySelectorAll(SHAPES)) {
          const cs = style(shape);
          const strokeColour = cs.stroke !== "none" ? parseColour(cs.stroke) : undefined;
          const width = parseFloat(cs.strokeWidth) || 0;
          if ((strokeColour?.a ?? (cs.stroke !== "none" ? 1 : 0)) > 0 && width > 0) stroke = Math.max(stroke, width * scale);
          if (cs.fill !== "none" && (parseColour(cs.fill)?.a ?? 1) > 0) filled = true;
        }
        return { svg, stroke, kind: stroke > 0 ? "outlined" : filled ? "filled" : "none" };
      });
      const resting = drawn.filter((d) => d.kind !== "none" && !d.svg.closest(LIT));
      const kinds = resting.map((d) => d.kind);
      if (kinds.includes("outlined") && kinds.includes("filled")) {
        const common = majority(kinds);
        const stray = resting.filter((d) => d.kind !== common);
        if (stray.length * 2 <= resting.length) {
          add(
            "icons",
            stray[0]!.svg,
            `${label(stray[0]!.svg)}'s icon is ${stray[0]!.kind} and the rest in this ${what} are ${common}.`,
            `Use the ${common} one: one set, one style. Change only that icon.`,
            `${stray[0]!.kind} beside ${common}`,
            resting.filter((d) => d.kind === common).slice(0, 3).map((d) => d.svg),
            "style",
          );
          continue;
        }
      }
      const outlined = drawn.filter((d) => d.kind === "outlined");
      if (outlined.length >= 2) {
        const weights = outlined.map((d) => Math.round(d.stroke * 4) / 4);
        const weight = majority(weights);
        const thick = outlined.filter((_, i) => Math.abs(weights[i]! - weight) > 0.5);
        if (thick.length && thick.length * 2 <= outlined.length) {
          add(
            "icons",
            thick[0]!.svg,
            `${label(thick[0]!.svg)}'s icon is drawn ${thick[0]!.stroke.toFixed(1)}px thick and the rest in this ${what} ${weight.toFixed(1)}px.`,
            "Draw it with the same stroke as the others (Lucide's `strokeWidth`). Change only that icon.",
            `stroke ${thick[0]!.stroke.toFixed(1)}px vs ${weight.toFixed(1)}px`,
            outlined.filter((d) => !thick.includes(d)).slice(0, 3).map((d) => d.svg),
            "stroke",
          );
        }
      }
    }
  }

  return findings;
}
