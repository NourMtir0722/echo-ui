/**
 * The rules. Each reads one file's model and returns what's wrong, one
 * finding per mistake, each with the Echo way to do it — a message is for the
 * agent that will fix it, so it says what to write instead, not only what's
 * wrong.
 */
import type { CatalogComponent, ComponentApi } from "../catalog";
import type { CheckRule } from "../config-schema";
import { installName, runCommand } from "../guidance";

import { nearestRole } from "./colour";
import type { CssFile } from "./css";
import { isMotionLibrary, radiusFix, scaleMessage, shadowAdvice, spaceFix, tailwindAdvice, timingAdvice } from "./material";
import { screenRules } from "./screen";
import { slopCss, slopRules } from "./slop";
import { bannedImport, isTeamColour } from "./team";
import { echoItem, type CheckProject } from "./model";
import type { JsxAttr, JsxElement, TsxFile } from "./tsx";

export type RuleId = CheckRule;

export interface Finding {
  rule: RuleId;
  file: string;
  line: number;
  column: number;
  message: string;
}

/** Said, not counted: something the check chose not to check, and why. */
export interface Note {
  file: string;
  line: number;
  message: string;
}

export interface FileResult {
  findings: Finding[];
  notes: Note[];
}

/* ------------------------------------------------------------------ colour */

/** Black or white at part opacity: a shadow or a highlight drawn by hand. */
const SHADE = /^(?:rgba?\(\s*(?:0[\s,]+0[\s,]+0|255[\s,]+255[\s,]+255)\s*(?:[,/]\s*(?:0?\.\d+|\d{1,2}%))\s*\)|#(?:000|fff)[0-9a-f](?:[0-9a-f])?|#(?:000000|ffffff)[0-9a-f]{2}|hsla?\(\s*0[\s,]+0%[\s,]+(?:0|100)%\s*[,/]\s*(?:0?\.\d+|\d{1,2}%)\s*\))$/i;

function colourMessage(text: string, project: CheckProject, property?: string): string {
  if (SHADE.test(text.trim())) {
    return `\`${text}\` is light or shade drawn by hand: Echo's light comes from its material. Use an Echo component, or a shadow recipe (\`var(--echo-shadow-*)\`), and colours from \`var(--echo-*)\`.`;
  }
  const near = nearestRole(text, project.roles, property);
  if (!near) return `\`${text}\` is a colour written by hand: use a role from your theme, \`var(--echo-*)\`.`;
  const role = near.role.replace(/^--echo-/, "");
  return near.same
    ? `\`${text}\` is your ${role}: use \`var(${near.role})\`.`
    : `\`${text}\` is a colour written by hand: use a role from your theme; the nearest is \`var(${near.role})\`.`;
}

/* ---------------------------------------------------------------- material */

const SPACE_PROPERTY = /^(?:padding|margin)(?:-(?:top|right|bottom|left|block|inline)(?:-(?:start|end))?)?$|^(?:gap|row-gap|column-gap)$/;
const RADIUS_PROPERTY = /^border(?:-(?:top|bottom|start|end)-(?:left|right|start|end))?-radius$/;
const TIMING_PROPERTY = /^transition(?:-duration|-timing-function)?$/;

/** A camelCase style key as the CSS property it is: `paddingInline` → `padding-inline`. */
const cssProperty = (key: string) => key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

/** The material finding for one property and value, if it has one. */
function materialFinding(property: string, value: string | number, at: { file: string; line: number; column: number }): Finding | undefined {
  const written = `${property}: ${value}${typeof value === "number" ? "px" : ""}`;
  if (SPACE_PROPERTY.test(property)) {
    const fix = spaceFix(value);
    return fix && { rule: "space", ...at, message: scaleMessage(written, fix, "spacing", `${property}: ${fix.replacement}`) };
  }
  if (RADIUS_PROPERTY.test(property)) {
    const fix = radiusFix(value);
    return fix && { rule: "radius", ...at, message: scaleMessage(written, fix, "radius", `${property}: ${fix.replacement}`) };
  }
  if (typeof value !== "string") return undefined;
  if (property === "box-shadow") {
    const advice = shadowAdvice(value);
    return advice === undefined ? undefined : { rule: "shadow", ...at, message: `\`box-shadow: ${value.replace(/\s+/g, " ").trim().slice(0, 60)}${value.length > 60 ? "…" : ""}\` ${advice}` };
  }
  if (TIMING_PROPERTY.test(property)) {
    const advice = timingAdvice(value);
    return advice === undefined ? undefined : { rule: "timing", ...at, message: `\`${property}\` ${advice}` };
  }
  return undefined;
}

/** A theme token set by hand: it skips the contrast check the seed goes through. */
function tokenMessage(token: string): string {
  const colour = !/^--echo-(space|radius|text|control|duration|ease|z|border|icon|weight|leading|tracking|type|shadow|font|gloss|shade|density|radius-scale|key-angle)(-|$)/.test(token);
  return colour
    ? `\`${token}\` is set outside the theme: a colour set here skips the contrast check every theme colour passes. Change the seed (\`${runCommand("init --yes --seed <hex>")}\`), or give a part a colour of its own with a Scope (\`${runCommand("docs scope")}\`).`
    : `\`${token}\` is set outside the theme: the scales come from the seed's settings (density, radius, finish), so the whole device changes together. Change them in \`createEchoTheme\`, not token by token.`;
}

export function cssRules(file: string, css: CssFile, project: CheckProject): Finding[] {
  const findings: Finding[] = [];
  if (file !== project.themeFile) {
    // A shadow is one finding, not one per colour inside it.
    const shadowLines = new Set<number>();
    for (const d of css.declarations) {
      const found = materialFinding(d.property, d.value, { file, line: d.line, column: d.column });
      if (!found) continue;
      findings.push(found);
      if (found.rule === "shadow") shadowLines.add(d.line);
    }
    for (const c of css.colours) {
      if (c.property === "box-shadow" && shadowLines.has(c.line)) continue;
      if (isTeamColour(project.team, c.text)) continue;
      findings.push({ rule: "colour", file, line: c.line, column: c.column, message: colourMessage(c.text, project, c.property) });
    }
    for (const r of css.rules) {
      const reached = /\.(echo-[\w-]+)|\[(data-echo-[\w-]+)/.exec(r.selector);
      if (!reached) continue;
      const cls = reached[1];
      const owner = cls ? project.classOwners.get(cls) : undefined;
      const title = owner ? project.items.get(owner)?.title : undefined;
      findings.push({
        rule: "restyle",
        file,
        line: r.line,
        column: r.column,
        message: `\`${r.selector.replace(/\s+/g, " ").slice(0, 60)}\` reaches into ${title ?? "Echo"} from outside: the look drifts from every other Echo app, and an update can move the class out from under it. Use its props${owner ? ` (\`${runCommand(`docs ${owner}`)}\`)` : ""}, a Scope, or the seed.`,
      });
    }
    for (const d of css.declarations) {
      if (!project.themeTokens.has(d.property)) continue;
      findings.push({ rule: "restyle", file, line: d.line, column: d.column, message: tokenMessage(d.property) });
    }
    const animated = css.declarations.find(
      (d) => (d.property === "animation" || d.property === "animation-name") && !/^(none|initial|inherit|unset)$/i.test(d.value.trim()),
    );
    if (animated && !css.reducedMotion) {
      findings.push({
        rule: "motion",
        file,
        line: animated.line,
        column: animated.column,
        message: "Animates with no reduced-motion fallback: people who ask their system for less motion still get it. Add `@media (prefers-reduced-motion: reduce) { … { animation: none; } }` for it.",
      });
    }
  }
  for (const f of css.focusRemoved) {
    findings.push({
      rule: "focus-ring",
      file,
      line: f.line,
      column: f.column,
      message: `\`${f.selector}\` takes the focus ring away with nothing in its place: keyboard users lose where they are. Remove it, or draw a ring of your own with \`outline\` or \`box-shadow\` on \`var(--echo-*)\`.`,
    });
  }
  if (file !== project.themeFile) findings.push(...slopCss(file, css, project));
  return findings;
}

/* --------------------------------------------------------------- lookalikes */

const attr = (el: JsxElement, name: string) => el.attrs.find((a) => a.name === name);
const text = (a: JsxAttr | undefined) => (a?.value.kind === "string" ? a.value.text : undefined);

/** A raw element and the Echo item that does its job, if Echo has one. */
/** An explicit role says what an element is, whatever its tag. */
const BY_ROLE: Record<string, string> = {
  switch: "switch",
  checkbox: "checkbox",
  radio: "radio-group",
  radiogroup: "radio-group",
  slider: "slider",
  tab: "tabs",
  tablist: "tabs",
  dialog: "modal",
  alertdialog: "alert-dialog",
  progressbar: "progress",
  combobox: "combobox",
  listbox: "select",
  menu: "menu",
};

export function lookalikeItem(el: JsxElement): string | undefined {
  const role = text(attr(el, "role"));
  if (role && role in BY_ROLE) return BY_ROLE[role];
  switch (el.tag) {
    case "button":
      return "hardware-button";
    case "select":
      return "select";
    case "dialog":
      return "modal";
    case "textarea":
      return "textarea";
    case "progress":
      return "progress";
    case "meter":
      return "meter";
    case "input": {
      const type = attr(el, "type");
      if (type && type.value.kind !== "string") return undefined;
      switch ((text(type) ?? "text").toLowerCase()) {
        case "checkbox":
          return "checkbox";
        case "radio":
          return "radio-group";
        case "range":
          return "slider";
        case "number":
          return "number-field";
        case "submit":
        case "button":
        case "reset":
          return "hardware-button";
        case "text":
        case "email":
        case "password":
        case "search":
        case "tel":
        case "url":
          return "field";
        default:
          return undefined;
      }
    }
    default:
      return undefined;
  }
}

/** How to get to an item: read it if it's installed, add it if not. */
function howTo(item: string, project: CheckProject): string {
  return project.lock?.items[item] ? `\`${runCommand(`docs ${item}`)}\`` : `\`${runCommand(`add ${item}`)}\`, then \`${runCommand(`docs ${item}`)}\``;
}

function describe(el: JsxElement): string {
  const type = text(attr(el, "type"));
  const role = text(attr(el, "role"));
  return `<${el.tag}${type ? ` type="${type}"` : ""}${role ? ` role="${role}"` : ""}>`;
}

/* -------------------------------------------------------------------- props */

/** Words for a component's look, which Echo gives through `variant` instead. */
const LOOK = new Set(["color", "colour", "tone", "intent", "appearance", "theme", "kind", "shade", "colorScheme", "severity", "status"]);

function distance(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)] as number[]);
  for (let j = 1; j <= b.length; j++) d[0]![j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      d[i]![j] = Math.min(d[i - 1]![j]! + 1, d[i]![j - 1]! + 1, d[i - 1]![j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
  }
  return d[a.length]![b.length]!;
}

/** The values of a prop whose type is a union of string literals. */
function literalValues(component: CatalogComponent, prop: string): string[] | undefined {
  const type = component.props.find((p) => p.name === prop)?.type;
  if (!type || !/^"[^"]*"( \| "[^"]*")*$/.test(type)) return undefined;
  return [...type.matchAll(/"([^"]*)"/g)].map((m) => m[1]!);
}

const orList = (xs: readonly string[]) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} or ${xs[xs.length - 1]}`);

function unknownPropMessage(component: string, prop: string, api: ComponentApi, entry: CatalogComponent, item: string): string {
  const base = `${component} has no \`${prop}\` prop.`;
  const variants = literalValues(entry, "variant");
  if (LOOK.has(prop) && variants) return `${base} Its look comes from \`variant\`: ${orList(variants)}.`;
  if (/^on[A-Z]/.test(prop)) {
    const handlers = api.props.filter((p) => /^on\w*Change$/.test(p) && p !== "onChange");
    if (prop === "onChange" && handlers.length) return `${base} Use \`${handlers[0]}\`, which gets the new value.`;
  }
  const near = api.props.filter((p) => distance(p.toLowerCase(), prop.toLowerCase()) <= 2).slice(0, 2);
  if (near.length) return `${base} Did you mean \`${near.join("` or `")}\`?`;
  return `${base} Its props: \`${runCommand(`docs ${item}`)}\`.`;
}

/** How to give a control its name, in words, for the names it takes. */
function nameHow(anyOf: readonly string[]): string {
  const ways = anyOf.map((n) =>
    n === "label" ? "a visible `label`" : n === "aria-labelledby" ? "`aria-labelledby` pointing at visible text" : n === "children" ? "text inside it" : `\`${n}\``,
  );
  return orList(ways);
}

const truthy = (a: JsxAttr | undefined) =>
  a !== undefined && (a.value.kind === "bare" || (a.value.kind === "boolean" && a.value.value) || (a.value.kind === "string" && a.value.text === "true"));

const universal = (name: string) => name === "key" || name === "ref" || /^(aria|data)-/.test(name);

function echoRules(file: string, el: JsxElement, tsx: TsxFile, project: CheckProject, result: FileResult, noted: Set<string>) {
  const [root, ...parts] = el.tag.split(".");
  const imported = tsx.imports.get(root!);
  if (!imported) return;
  const item = echoItem(project, file, imported.from);
  if (!item) return;
  const entry = project.items.get(item);
  const exported = [imported.imported, ...parts].join(".");
  const api = entry?.api?.[exported];
  if (!entry || !api) return;

  // Props are checked against the version the project has. When that isn't
  // the catalog's, a prop may have come or gone in between.
  const installed = project.lock?.items[item]?.version;
  if (installed && entry.version && installed !== entry.version) {
    if (!noted.has(item)) {
      noted.add(item);
      result.notes.push({
        file,
        line: el.line,
        message: `${installName(entry.name)}'s props aren't checked here: this project has ${installed} and the catalog describes ${entry.version}. \`${runCommand(`diff ${item}`)}\` shows what changed.`,
      });
    }
    return;
  }

  for (const a of el.attrs) {
    if ((a.name === "className" || a.name === "style") && !api.props.includes(a.name) && !api.html) {
      result.findings.push({
        rule: "restyle",
        file,
        line: a.line,
        column: a.column,
        message: `${exported} takes no \`${a.name}\`: Echo's components are closed, so they look the same in every app and an update can't break an override. Its look comes from its props (\`${runCommand(`docs ${item}`)}\`); a different colour for a part is a Scope, and a different device is the seed.`,
      });
      continue;
    }
    if (universal(a.name) || api.props.includes(a.name) || (api.html && project.htmlAttributes.has(a.name))) {
      const values = a.value.kind === "string" ? literalValues(entry, a.name) : undefined;
      if (values && a.value.kind === "string" && !values.includes(a.value.text)) {
        result.findings.push({
          rule: "prop",
          file,
          line: a.line,
          column: a.column,
          message: `\`${a.name}\` on ${exported} is ${orList(values)}, not "${a.value.text}".`,
        });
      }
      continue;
    }
    result.findings.push({ rule: "prop", file, line: a.line, column: a.column, message: unknownPropMessage(exported, a.name, api, entry, item) });
  }

  // Anything could arrive through a spread, so what's missing can't be known.
  if (el.spread) return;
  for (const required of api.required ?? []) {
    const present = required === "children" ? el.hasChildren || attr(el, "children") : attr(el, required);
    if (!present) {
      result.findings.push({ rule: "prop", file, line: el.line, column: el.column, message: `<${el.tag}> needs \`${required}\`.` });
    }
  }
  const rule = api.name;
  if (rule) {
    const when = rule.when ? attr(el, rule.when) : undefined;
    // A `when` written as an expression may or may not be true: not ours to guess.
    const applies = !rule.when || truthy(when);
    const named = rule.anyOf.some((n) => (n === "children" ? el.hasChildren : attr(el, n) !== undefined));
    if (applies && !named) {
      result.findings.push({
        rule: "name",
        file,
        line: el.line,
        column: el.column,
        message: `<${el.tag}${rule.when ? ` ${rule.when}` : ""}> has no name: give it ${nameHow(rule.anyOf)}. Without one it's a type error too.`,
      });
    }
  }
}

/* ------------------------------------------------------------------- markup */

const CLICKABLE_BY_HAND = new Set(["div", "span", "li", "p", "section", "article", "td", "tr", "img", "svg", "label", "header", "footer", "main"]);
const FOCUSABLE = new Set(["button", "input", "select", "textarea", "summary"]);

function focusable(el: JsxElement): boolean {
  if (FOCUSABLE.has(el.tag)) return true;
  if (el.tag === "a" && attr(el, "href")) return true;
  const tab = attr(el, "tabIndex");
  return tab?.value.kind === "number" ? tab.value.value >= 0 : tab?.value.kind === "string" ? Number(tab.value.text) >= 0 : false;
}

function markupRules(file: string, el: JsxElement, result: FileResult) {
  const push = (rule: RuleId, message: string, at: { line: number; column: number } = el) =>
    result.findings.push({ rule, file, line: at.line, column: at.column, message });

  if (CLICKABLE_BY_HAND.has(el.tag) && attr(el, "onClick") && !attr(el, "role") && !el.spread) {
    if (!attr(el, "onKeyDown") && !attr(el, "onKeyUp") && !attr(el, "onKeyPress")) {
      push("keyboard", `\`<${el.tag} onClick>\` can't be reached by keyboard: use HardwareButton, or Item for a row.`);
    }
  }
  if (el.tag === "img" && !attr(el, "alt") && !el.spread && !truthy(attr(el, "aria-hidden")) && !attr(el, "aria-label") && !attr(el, "aria-labelledby")) {
    push("img-alt", '`<img>` has no `alt`: say what it shows, or `alt=""` if it only decorates.');
  }
  const tab = attr(el, "tabIndex");
  const tabValue = tab?.value.kind === "number" ? tab.value.value : tab?.value.kind === "string" ? Number(tab.value.text) : undefined;
  if (tab && tabValue !== undefined && tabValue > 0) {
    push("tabindex", `\`tabIndex={${tabValue}}\` takes it out of the page's reading order: use 0, and let the order follow the page.`, tab);
  }
  const hidden = attr(el, "aria-hidden");
  if (truthy(hidden) && focusable(el)) {
    push("hidden-focusable", `\`aria-hidden\` on a focusable \`<${el.tag}>\`: screen readers skip it while the keyboard still lands on it. Remove it, or take it out of the tab order too.`, hidden);
  }
}

/* ------------------------------------------------------------------ access */

const FIELDS = new Set(["input", "select", "textarea"]);
/** Inputs that aren't fields: a button's name is its value, a hidden one is never announced. */
const NOT_FIELDS = new Set(["hidden", "submit", "button", "reset", "image"]);

/** Whether the element at `index` sits inside a `<label>`. */
function insideLabel(tsx: TsxFile, index: number): boolean {
  for (let p = tsx.elements[index]!.parent; p !== undefined; p = tsx.elements[p]!.parent) {
    if (tsx.elements[p]!.tag === "label") return true;
  }
  return false;
}

/**
 * What a keyboard or screen reader user loses in the source: a field nobody
 * named, and an error that's only a colour. The elements `lookalikes` already
 * reported are left to that finding: the Echo component names itself.
 */
function accessRules(file: string, tsx: TsxFile, project: CheckProject, result: FileResult, lookalikes: ReadonlySet<number>) {
  const forIds = new Set(
    tsx.elements.filter((e) => e.tag === "label").flatMap((e) => [text(attr(e, "htmlFor")), text(attr(e, "for"))]).filter((id): id is string => !!id),
  );
  tsx.elements.forEach((el, i) => {
    if (el.intrinsic && FIELDS.has(el.tag) && !lookalikes.has(i) && !el.spread) {
      const type = (text(attr(el, "type")) ?? "text").toLowerCase();
      const id = text(attr(el, "id"));
      const named = attr(el, "aria-label") || attr(el, "aria-labelledby") || attr(el, "title") || (id && forIds.has(id)) || insideLabel(tsx, i);
      if (!(el.tag === "input" && NOT_FIELDS.has(type)) && !named) {
        result.findings.push({
          rule: "label",
          file,
          line: el.line,
          column: el.column,
          message: `\`${describe(el)}\` has no label: a screen reader announces it with no name. Give it a \`<label htmlFor>\`, put it inside a \`<label>\`, or add \`aria-label\`.`,
        });
      }
    }
    if (truthy(attr(el, "aria-invalid")) && !attr(el, "aria-describedby") && !attr(el, "aria-errormessage") && !el.spread) {
      const item = el.intrinsic ? undefined : echoItem(project, file, tsx.imports.get(el.tag.split(".")[0]!)?.from ?? "");
      const hasError = item ? project.items.get(item)?.props.some((prop) => prop.name === "error") : false;
      result.findings.push({
        rule: "error-colour",
        file,
        line: el.line,
        column: el.column,
        message: hasError
          ? `\`aria-invalid\` with no words: set ${el.tag}'s \`error\` to what's wrong instead, which shows it and ties it to the field.`
          : "`aria-invalid` with nothing saying what's wrong: tie the message to it with `aria-describedby`, so the error is words, not only a colour.",
      });
    }
  });
}

/** GSAP used straight, in a file that uses Echo but not its motion. */
function motionRules(file: string, tsx: TsxFile, project: CheckProject, result: FileResult) {
  const froms = [...tsx.imports.values()].map((i) => i.from);
  if (!froms.some((f) => f === "gsap" || f.startsWith("gsap/"))) return;
  if (froms.some((f) => f === "echo-ui-core/motion" || f === "echo-ui-core/tactile")) return;
  if (!usesEcho(file, tsx, project)) return;
  result.findings.push({
    rule: "motion",
    file,
    line: 1,
    column: 1,
    message: `Moves things with GSAP directly, beside Echo: timing written here isn't Echo's, and nothing stops it under reduced motion. Use Echo's motion for your own parts: \`useTactile\`, \`createSpring\` and the tokens in \`echo-ui-core/motion\`, which follow reduced motion for you (\`${runCommand("docs use-tactile")}\`).`,
  });
}

/* ------------------------------------------------------------------ weight */

/** Past this much of its own code, gzipped, an item is worth loading when it's shown. */
const HEAVY = 16 * 1024;

/** A heavy part imported with the page, when it could arrive when it's shown. */
function weightRules(file: string, tsx: TsxFile, project: CheckProject, result: FileResult) {
  for (const [local, { from, imported, line }] of tsx.imports) {
    const item = echoItem(project, file, from);
    const weight = item ? project.items.get(item)?.weight : undefined;
    if (!item || !weight || !(weight.gpu || weight.js >= HEAVY)) continue;
    const name = imported === "default" ? local : imported;
    const how =
      project.framework === "vite"
        ? `\`const ${name} = lazy(() => import("${from}").then((m) => ({ default: m.${name} })));\`, inside \`<Suspense>\``
        : `\`const ${name} = dynamic(() => import("${from}").then((m) => m.${name}), { ssr: false });\` in a client component (\`next/dynamic\`)`;
    result.findings.push({
      rule: "weight",
      file,
      line: line ?? 1,
      column: 1,
      message: `${name} ${weight.gpu ? "draws with WebGL" : `is ${Math.round(weight.js / 1024)} KB of its own`}: imported here, it loads with the page and holds up the first paint. Load it when it's shown: ${how}. (If this file is itself loaded lazily, it can stay.)`,
    });
  }
}

/* --------------------------------------------------------------------- file */

/** Whether a file uses Echo at all: an import from the Echo folder or from echo-ui-core. */
function usesEcho(file: string, tsx: TsxFile, project: CheckProject): boolean {
  for (const { from } of tsx.imports.values()) {
    if (from === "echo-ui-core" || from.startsWith("echo-ui-core/") || echoItem(project, file, from)) return true;
  }
  return false;
}

export function tsxRules(file: string, tsx: TsxFile, project: CheckProject): FileResult {
  const result: FileResult = { findings: [], notes: [] };
  const shadowSites = new Set<string>();
  for (const entry of tsx.styles) {
    if (project.themeTokens.has(entry.key)) {
      result.findings.push({ rule: "restyle", file, line: entry.line, column: entry.column, message: tokenMessage(entry.key) });
      continue;
    }
    if (entry.value === undefined) continue;
    const found = materialFinding(cssProperty(entry.key), entry.value, { file, line: entry.line, column: entry.column });
    if (!found) continue;
    result.findings.push(found);
    if (found.rule === "shadow") shadowSites.add(`${entry.line}:${entry.column}`);
  }
  for (const site of tsx.classNames) {
    for (const advice of tailwindAdvice(site.text)) {
      result.findings.push({ rule: advice.rule, file, line: site.line, column: site.column, message: advice.message });
    }
  }
  // A colour in a style object sits where its entry's value does: that entry names its property.
  const styleAt = new Map(tsx.styles.map((s) => [`${s.line}:${s.column}`, cssProperty(s.key)]));
  for (const c of tsx.colours) {
    if (shadowSites.has(`${c.line}:${c.column}`)) continue;
    if (isTeamColour(project.team, c.text)) continue;
    result.findings.push({ rule: "colour", file, line: c.line, column: c.column, message: colourMessage(c.text, project, styleAt.get(`${c.line}:${c.column}`)) });
  }
  if (usesEcho(file, tsx, project)) {
    for (const { from } of new Map([...tsx.imports.values()].map((i) => [i.from, i])).values()) {
      if (!isMotionLibrary(from)) continue;
      result.findings.push({
        rule: "motion-library",
        file,
        line: 1,
        column: 1,
        message: `\`${from}\` is a second animation library next to Echo's: two engines move things differently and ship twice the code. Move your own parts with Echo's: \`useTactile\`, \`createSpring\` and the motion tokens in \`echo-ui-core\` (\`${runCommand("docs use-tactile")}\`).`,
      });
    }
  }
  const noted = new Set<string>();
  const lookalikes = new Set<number>();
  for (const [index, el] of tsx.elements.entries()) {
    if (el.intrinsic) {
      const item = lookalikeItem(el);
      if (item && project.items.has(item)) {
        lookalikes.add(index);
        const title = project.items.get(item)!.title;
        result.findings.push({
          rule: "lookalike",
          file,
          line: el.line,
          column: el.column,
          message: `${describe(el)} where Echo has ${title}: use ${title} (${howTo(item, project)}).`,
        });
      }
      const className = text(attr(el, "className")) ?? text(attr(el, "class"));
      for (const cls of className?.split(/\s+/) ?? []) {
        if (!cls.startsWith("echo-") || project.materials.has(cls)) continue;
        const owner = project.classOwners.get(cls);
        const title = owner && project.items.get(owner)?.title;
        result.findings.push({
          rule: "echo-class",
          file,
          line: el.line,
          column: el.column,
          message: title
            ? `\`${cls}\` is ${title}'s own class: use ${title} instead of dressing a <${el.tag}> in its look.`
            : `\`${cls}\` looks like one of Echo's own classes: use the Echo component instead of its class (\`${runCommand('which "<the job>"')}\`).`,
        });
      }
      markupRules(file, el, result);
    } else {
      echoRules(file, el, tsx, project, result, noted);
    }
  }
  accessRules(file, tsx, project, result, lookalikes);
  motionRules(file, tsx, project, result);
  screenRules(file, tsx, project, result);
  slopRules(file, tsx, project, result);
  weightRules(file, tsx, project, result);
  const banned = new Set<string>();
  for (const { from, line } of tsx.imports.values()) {
    const message = bannedImport(project.team, from);
    if (message === undefined || banned.has(from)) continue;
    banned.add(from);
    result.findings.push({ rule: "team", file, line: line ?? 1, column: 1, message: `\`${from}\` isn't used here: ${message}` });
  }
  return result;
}
