/**
 * What a TSX or JSX file does with elements, read with Babel's parser (pure
 * JavaScript, bundled into the CLI's one file, so nothing native has to
 * install): its imports, every JSX element with its attributes, the colours
 * written into styles, class strings and style objects, and the written-out
 * entries of `style={{ … }}` and the class strings themselves.
 */
import { parse } from "@babel/parser";

import { findLiterals } from "./colour";

export type AttrValue =
  | { kind: "string"; text: string }
  | { kind: "number"; value: number }
  | { kind: "boolean"; value: boolean }
  /** Written with no value: `<Switch disabled />`. */
  | { kind: "bare" }
  /** Anything computed, which a static check can't know; `names` are the identifiers it mentions. */
  | { kind: "expression"; names?: string[] };

export interface JsxAttr {
  name: string;
  value: AttrValue;
  line: number;
  column: number;
}

export interface JsxElement {
  /** As written: `button`, `Switch`, `Tabs.List`. */
  tag: string;
  intrinsic: boolean;
  line: number;
  column: number;
  attrs: JsxAttr[];
  /** `{...props}`: anything could arrive through it. */
  spread: boolean;
  hasChildren: boolean;
  /** The element it sits inside, as an index into the file's elements. */
  parent?: number;
  /** Its own text, as written: `Delete project` in `<HardwareButton>Delete project</HardwareButton>`. */
  text?: string;
}

export interface ColourSite {
  text: string;
  line: number;
  column: number;
}

/** One entry of a `style={{ … }}` object. `value` is there when it's written out. */
export interface StyleEntry {
  key: string;
  value?: string | number;
  line: number;
  column: number;
}

/** A class string: a `className` literal, or a literal inside `cn(…)` or `clsx(…)` there. */
export interface ClassSite {
  text: string;
  line: number;
  column: number;
}

export interface TsxFile {
  /** Local binding → the module, the name it was imported as, and the import's line. */
  imports: Map<string, { from: string; imported: string; line?: number }>;
  elements: JsxElement[];
  colours: ColourSite[];
  styles: StyleEntry[];
  classNames: ClassSite[];
}

/** Style-object keys whose string value is a colour when it's written as one. */
const COLOUR_KEYS = new Set([
  "color", "background", "backgroundColor", "borderColor", "border", "borderTop", "borderRight", "borderBottom",
  "borderLeft", "borderTopColor", "borderRightColor", "borderBottomColor", "borderLeftColor", "outline",
  "outlineColor", "fill", "stroke", "boxShadow", "textShadow", "caretColor", "accentColor", "textDecorationColor",
  "columnRuleColor", "backgroundImage",
]);
/** SVG and legacy attributes that take a colour directly. */
const COLOUR_ATTRIBUTES = new Set(["fill", "stroke", "color", "stopColor", "floodColor", "lightingColor"]);

type Node = { type: string; loc?: { start: { line: number; column: number } }; [key: string]: unknown };

const isNode = (v: unknown): v is Node => typeof v === "object" && v !== null && typeof (v as Node).type === "string";

function children(node: Node): Node[] {
  const out: Node[] = [];
  for (const [key, value] of Object.entries(node)) {
    if (key === "loc" || key === "leadingComments" || key === "trailingComments" || key === "extra") continue;
    if (Array.isArray(value)) {
      for (const v of value) if (isNode(v)) out.push(v);
    } else if (isNode(value)) {
      out.push(value);
    }
  }
  return out;
}

function nameOf(node: Node): string {
  switch (node.type) {
    case "JSXIdentifier":
      return node.name as string;
    case "JSXMemberExpression":
      return `${nameOf(node.object as Node)}.${nameOf(node.property as Node)}`;
    case "JSXNamespacedName":
      return `${nameOf(node.namespace as Node)}:${nameOf(node.name as Node)}`;
    default:
      return "";
  }
}

function valueOf(node: Node | null | undefined): AttrValue {
  if (!node) return { kind: "bare" };
  if (node.type === "StringLiteral") return { kind: "string", text: node.value as string };
  if (node.type === "JSXExpressionContainer") {
    const expr = node.expression as Node;
    if (expr.type === "StringLiteral") return { kind: "string", text: expr.value as string };
    if (expr.type === "NumericLiteral") return { kind: "number", value: expr.value as number };
    if (expr.type === "BooleanLiteral") return { kind: "boolean", value: expr.value as boolean };
    if (expr.type === "TemplateLiteral" && (expr.expressions as unknown[]).length === 0) {
      return { kind: "string", text: ((expr.quasis as Node[])[0]!.value as { cooked: string }).cooked };
    }
    if (expr.type === "UnaryExpression" && expr.operator === "-" && (expr.argument as Node).type === "NumericLiteral") {
      return { kind: "number", value: -((expr.argument as Node).value as number) };
    }
    const names = identifiers(expr);
    return names.length ? { kind: "expression", names } : { kind: "expression" };
  }
  return { kind: "expression" };
}

/** The identifiers an expression mentions, property names included: `router.push` gives both. */
function identifiers(node: Node): string[] {
  const found = new Set<string>();
  const visit = (n: Node) => {
    if (found.size >= 24) return;
    if (n.type === "Identifier" || n.type === "JSXIdentifier") found.add(n.name as string);
    for (const c of children(n)) visit(c);
  };
  visit(node);
  return [...found];
}

const position = (node: Node) => ({ line: node.loc?.start.line ?? 0, column: (node.loc?.start.column ?? 0) + 1 });

/** Throws Babel's SyntaxError when the file can't be read at all. */
export function readTsx(fileName: string, source: string): TsxFile {
  const ast = parse(source, {
    sourceType: "module",
    plugins: /\.jsx$/.test(fileName) ? ["jsx"] : ["jsx", "typescript"],
    errorRecovery: true,
  }) as unknown as Node;

  const imports = new Map<string, { from: string; imported: string; line?: number }>();
  const elements: JsxElement[] = [];
  const colours: ColourSite[] = [];
  const styles: StyleEntry[] = [];
  const classNames: ClassSite[] = [];

  const classStrings = (node: Node) => {
    const visit = (n: Node) => {
      if (n.type === "StringLiteral") classNames.push({ text: n.value as string, ...position(n) });
      else if (n.type === "TemplateElement") classNames.push({ text: (n.value as { cooked: string }).cooked ?? "", ...position(n) });
      for (const c of children(n)) visit(c);
    };
    visit(node);
  };

  const styleEntries = (value: Node) => {
    const expr = value.type === "JSXExpressionContainer" ? (value.expression as Node) : undefined;
    if (!expr || expr.type !== "ObjectExpression") return;
    for (const prop of expr.properties as Node[]) {
      if (prop.type !== "ObjectProperty") continue;
      const key = prop.key as Node;
      const name = key.type === "Identifier" ? (key.name as string) : key.type === "StringLiteral" ? (key.value as string) : undefined;
      const v = prop.value as Node;
      const literal = v.type === "StringLiteral" || v.type === "NumericLiteral" ? (v.value as string | number) : undefined;
      if (name !== undefined) styles.push({ key: name, ...(literal !== undefined ? { value: literal } : {}), ...position(v) });
    }
  };

  const colourStrings = (node: Node, named: boolean) => {
    const visit = (n: Node) => {
      if (n.type === "StringLiteral") {
        for (const lit of findLiterals(n.value as string, { named })) colours.push({ text: lit.text, ...position(n) });
      } else if (n.type === "TemplateElement") {
        for (const lit of findLiterals((n.value as { cooked: string }).cooked ?? "", { named })) colours.push({ text: lit.text, ...position(n) });
      }
      for (const c of children(n)) visit(c);
    };
    visit(node);
  };

  /** The elements the traversal is inside, innermost last. */
  const open: number[] = [];

  const visit = (node: Node) => {
    // Seeds passed to the theme engine are the one place a colour belongs.
    if (node.type === "CallExpression") {
      const callee = node.callee as Node;
      const name = callee.type === "Identifier" ? callee.name : callee.type === "MemberExpression" ? (callee.property as Node).name : undefined;
      if (name === "createEchoTheme") return;
    }
    if (node.type === "ImportDeclaration") {
      const from = (node.source as Node).value as string;
      const { line } = position(node);
      for (const spec of node.specifiers as Node[]) {
        const local = (spec.local as Node).name as string;
        if (spec.type === "ImportDefaultSpecifier") imports.set(local, { from, imported: "default", line });
        else if (spec.type === "ImportNamespaceSpecifier") imports.set(local, { from, imported: "*", line });
        else {
          const imported = spec.imported as Node;
          imports.set(local, { from, imported: (imported.name ?? imported.value) as string, line });
        }
      }
    } else if (node.type === "JSXElement") {
      const opening = node.openingElement as Node;
      const tag = nameOf(opening.name as Node);
      const element: JsxElement = {
        tag,
        intrinsic: /^[a-z]/.test(tag) && !tag.includes("."),
        ...position(opening),
        attrs: [],
        spread: false,
        hasChildren: (node.children as Node[]).some((c) => c.type !== "JSXText" || String(c.value).trim() !== ""),
      };
      const text = (node.children as Node[])
        .map((c) =>
          c.type === "JSXText"
            ? String(c.value)
            : c.type === "JSXExpressionContainer" && (c.expression as Node).type === "StringLiteral"
              ? String((c.expression as Node).value)
              : "",
        )
        .join("")
        .replace(/\s+/g, " ")
        .trim();
      if (text) element.text = text;
      if (open.length) element.parent = open[open.length - 1];
      for (const attr of opening.attributes as Node[]) {
        if (attr.type === "JSXSpreadAttribute") {
          element.spread = true;
          continue;
        }
        const name = nameOf(attr.name as Node);
        const value = attr.value as Node | null;
        element.attrs.push({ name, value: valueOf(value), ...position(attr) });
        if (!value) continue;
        if (name === "style") {
          colourStrings(value, true);
          styleEntries(value);
        } else if (name === "className" || name === "class") {
          colourStrings(value, false);
          classStrings(value);
        }
        else if (element.intrinsic && COLOUR_ATTRIBUTES.has(name)) colourStrings(value, true);
      }
      elements.push(element);
      open.push(elements.length - 1);
      for (const child of children(node)) visit(child);
      open.pop();
      return;
    } else if (node.type === "ObjectProperty") {
      const key = node.key as Node;
      const name = key.type === "Identifier" ? key.name : key.type === "StringLiteral" ? key.value : undefined;
      if (typeof name === "string" && COLOUR_KEYS.has(name)) colourStrings(node.value as Node, true);
    }
    for (const child of children(node)) visit(child);
  };
  visit(ast);

  const seen = new Set<string>();
  return {
    imports,
    elements,
    styles,
    classNames,
    colours: colours.filter((c) => {
      const key = `${c.line}:${c.column}:${c.text}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }),
  };
}
