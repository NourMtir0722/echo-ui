/**
 * What a TSX file does with elements, read with TypeScript's own parser: the
 * imports, every JSX element with its attributes, and the colour literals in
 * its style and class strings.
 */
import ts from "typescript";

import { colourLiterals, type Located } from "./colours";

export interface JsxAttribute {
  name: string;
  /** The literal value when it's a string (`type="checkbox"`), true for a bare attribute. */
  value?: string | true;
  line: number;
}

export interface JsxElement {
  /** As written: `button`, `HardwareButton`, `Tabs.List`. */
  tag: string;
  /** A lowercase tag: a DOM element, not a component. */
  intrinsic: boolean;
  line: number;
  attributes: JsxAttribute[];
  /** `{...props}` among the attributes: anything could arrive through it. */
  spread: boolean;
  /** Has children between an opening and a closing tag. */
  hasChildren: boolean;
}

export interface ReadFile {
  /** Local name → module specifier, for every binding an import creates. */
  imports: Map<string, { from: string; imported: string }>;
  elements: JsxElement[];
  colours: Located[];
}

/** Object keys whose string value is a colour when it's written as one. */
const COLOUR_KEYS = /^(color|background|backgroundColor|borderColor|border|borderTop|borderRight|borderBottom|borderLeft|outline|outlineColor|fill|stroke|boxShadow|textShadow|caretColor|accentColor)$/;

export function readTsx(fileName: string, source: string): ReadFile {
  const file = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const lineOf = (node: ts.Node) => file.getLineAndCharacterOfPosition(node.getStart(file)).line + 1;
  const imports = new Map<string, { from: string; imported: string }>();
  const elements: JsxElement[] = [];
  const colours: Located[] = [];

  const colourStrings = (node: ts.Node) => {
    const visitString = (n: ts.Node) => {
      if (ts.isStringLiteralLike(n) || ts.isTemplateHead(n) || ts.isTemplateMiddle(n) || ts.isTemplateTail(n)) {
        for (const text of colourLiterals(n.text)) colours.push({ line: lineOf(n), text });
      }
      ts.forEachChild(n, visitString);
    };
    visitString(node);
  };

  const readElement = (tagName: ts.JsxTagNameExpression, attrs: ts.JsxAttributes, hasChildren: boolean, node: ts.Node) => {
    const tag = tagName.getText(file);
    const element: JsxElement = {
      tag,
      intrinsic: /^[a-z]/.test(tag) && !tag.includes("."),
      line: lineOf(node),
      attributes: [],
      spread: false,
      hasChildren,
    };
    for (const attr of attrs.properties) {
      if (ts.isJsxSpreadAttribute(attr)) {
        element.spread = true;
        continue;
      }
      const name = attr.name.getText(file);
      let value: string | true | undefined;
      if (!attr.initializer) value = true;
      else if (ts.isStringLiteral(attr.initializer)) value = attr.initializer.text;
      else if (ts.isJsxExpression(attr.initializer) && attr.initializer.expression && ts.isStringLiteralLike(attr.initializer.expression)) {
        value = attr.initializer.expression.text;
      }
      element.attributes.push({ name, ...(value !== undefined ? { value } : {}), line: lineOf(attr) });
      // Colours written into a style or a class string.
      if ((name === "style" || name === "className" || name === "class") && attr.initializer) colourStrings(attr.initializer);
    }
    elements.push(element);
  };

  const visit = (node: ts.Node) => {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      const from = node.moduleSpecifier.text;
      const clause = node.importClause;
      if (clause?.name) imports.set(clause.name.text, { from, imported: "default" });
      const bindings = clause?.namedBindings;
      if (bindings && ts.isNamedImports(bindings)) {
        for (const spec of bindings.elements) {
          imports.set(spec.name.text, { from, imported: (spec.propertyName ?? spec.name).text });
        }
      } else if (bindings && ts.isNamespaceImport(bindings)) {
        imports.set(bindings.name.text, { from, imported: "*" });
      }
    } else if (ts.isJsxElement(node)) {
      readElement(node.openingElement.tagName, node.openingElement.attributes, node.children.length > 0, node);
    } else if (ts.isJsxSelfClosingElement(node)) {
      readElement(node.tagName, node.attributes, false, node);
    } else if (ts.isPropertyAssignment(node) && COLOUR_KEYS.test(node.name.getText(file).replace(/["']/g, ""))) {
      // A style object built outside the JSX: `const card = { background: "#fff" }`.
      colourStrings(node.initializer);
    }
    ts.forEachChild(node, visit);
  };
  visit(file);

  // One literal can be reached twice (a style object inside a style attribute).
  const seen = new Set<string>();
  const unique = colours.filter((c) => {
    const key = `${c.line}:${c.text}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return { imports, elements, colours: unique };
}
