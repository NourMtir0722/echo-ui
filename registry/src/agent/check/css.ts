/**
 * What a stylesheet does, read with postcss: its declarations, the colour
 * literals in them, and the rules that take a focus ring away.
 */
import postcss, { type Declaration, type Rule } from "postcss";

import { findLiterals } from "./colour";

export interface CssColour {
  text: string;
  property: string;
  line: number;
  column: number;
}

export interface FocusRingRemoved {
  selector: string;
  line: number;
  column: number;
}

export interface CssDeclaration {
  property: string;
  value: string;
  line: number;
  column: number;
}

export interface CssRule {
  selector: string;
  line: number;
  column: number;
  /** Its own declarations, property (lower case) to value: what one rule does together. */
  props: Record<string, string>;
}

export interface CssFile {
  colours: CssColour[];
  focusRemoved: FocusRingRemoved[];
  declarations: CssDeclaration[];
  rules: CssRule[];
  /** Whether the file says anything for people who ask for less motion. */
  reducedMotion: boolean;
}

/** An outline or a shadow that draws something, as opposed to taking it away. */
const draws = (value: string) => !/^(none|0|0px|transparent|unset|initial)$/i.test(value.trim());

/** Whether a rule reaches focused or focusable things: a `:focus` rule, a global one, or the controls themselves. */
function reachesFocus(selector: string): boolean {
  return selector.split(",").some((part) => {
    const s = part.trim();
    return /:focus(-visible|-within)?\b/.test(s) || /^(\*|:root \*|html \*|body \*|:where\(\*\)|\*::?[\w-]+)$/.test(s) || /^(button|a|input|select|textarea|summary)$/i.test(s);
  });
}

export function readCss(source: string, from: string): CssFile {
  const root = postcss.parse(source, { from });
  const colours: CssColour[] = [];
  const focusRemoved: FocusRingRemoved[] = [];
  const declarations: CssDeclaration[] = [];

  root.walkDecls((decl: Declaration) => {
    const valueStart = decl.source?.start;
    declarations.push({ property: decl.prop.toLowerCase(), value: decl.value, line: valueStart?.line ?? 0, column: valueStart?.column ?? 0 });
    for (const lit of findLiterals(decl.value)) {
      colours.push({ text: lit.text, property: decl.prop, line: valueStart?.line ?? 0, column: valueStart?.column ?? 0 });
    }
  });

  const rules: CssRule[] = [];
  root.walkRules((rule: Rule) => {
    const props: Record<string, string> = {};
    rule.each((node) => {
      if (node.type === "decl") props[node.prop.toLowerCase()] = node.value;
    });
    rules.push({ selector: rule.selector, line: rule.source?.start?.line ?? 0, column: rule.source?.start?.column ?? 0, props });
    if (!reachesFocus(rule.selector)) return;
    let removed: Declaration | undefined;
    let replaced = false;
    rule.each((node) => {
      if (node.type !== "decl") return;
      const prop = node.prop.toLowerCase();
      if ((prop === "outline" || prop === "outline-style" || prop === "outline-width") && !draws(node.value)) removed ??= node;
      else if ((prop === "outline" || prop === "outline-style" || prop === "outline-width" || prop === "outline-color") && draws(node.value)) replaced = true;
      else if (prop === "box-shadow" && draws(node.value)) replaced = true;
      else if (/^border(-color|-bottom|-width)?$/.test(prop) && draws(node.value) && /:focus/.test(rule.selector)) replaced = true;
    });
    if (removed && !replaced) {
      focusRemoved.push({ selector: rule.selector, line: removed.source?.start?.line ?? 0, column: removed.source?.start?.column ?? 0 });
    }
  });
  return { colours, focusRemoved, declarations, rules, reducedMotion: /prefers-reduced-motion/.test(source) };
}
