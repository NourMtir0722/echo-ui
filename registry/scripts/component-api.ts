/**
 * Every exported component's API, read from its TypeScript types, for the
 * catalog: the props it takes, whether it takes the standard HTML attributes
 * too, the props it can't go without, and the names it needs.
 *
 * Read from the types rather than restated anywhere, because the types are
 * what the compiler enforces. A check built on this data agrees with `tsc`
 * about a missing name by construction, and `check-parity.test.ts` holds it
 * to that for every component that needs one.
 */
import ts from "typescript";
import { resolve } from "node:path";

import type { ComponentApi } from "../src/agent/catalog";
import { META_DIRS, type MetaName } from "../src/agent/metas";
import { createProgram, indexExports, itemDir, registryRoot } from "./docs/program";

/** The props a control is named by, in the order a reader should reach for them. */
const NAME_PROPS = ["label", "aria-label", "aria-labelledby", "children"];

/** Attributes accepted by pattern, so never listed. */
const byPattern = (name: string) => /^(aria|data)-/.test(name);

/** A virtual file that gives the checker React's standard HTML attributes. */
const HTML_PROBE = resolve(registryRoot, "src/__html-attributes__.tsx");
const HTML_SOURCE = 'import type { AllHTMLAttributes } from "react";\nexport type Html = AllHTMLAttributes<HTMLElement>;\n';

function isOptional(member: ts.Type, name: string): boolean {
  const prop = member.getProperty(name);
  return !prop || (prop.flags & ts.SymbolFlags.Optional) !== 0;
}

/** Whether `name` is the literal `true` in `member`, as a discriminant is. */
function isTrue(checker: ts.TypeChecker, member: ts.Type, name: string): boolean {
  const prop = member.getProperty(name);
  if (!prop || prop.flags & ts.SymbolFlags.Optional) return false;
  return checker.typeToString(checker.getTypeOfSymbol(prop)) === "true";
}

/** The props object a component is called with, or nothing for anything that isn't one. */
function propsOf(checker: ts.TypeChecker, type: ts.Type): ts.Type | undefined {
  const signature = type.getCallSignatures()[0];
  if (!signature || signature.parameters.length === 0) return undefined;
  const returns = checker.typeToString(signature.getReturnType());
  if (!/Element|ReactNode|JSX/.test(returns)) return undefined;
  return checker.getTypeOfSymbol(signature.parameters[0]!);
}

function apiOf(checker: ts.TypeChecker, props: ts.Type, html: ReadonlySet<string>): ComponentApi {
  const members = props.isUnion() ? props.types : [props];
  // Every name any member takes: a prop only one branch of a union allows is
  // still a prop the component takes.
  const names = new Set<string>();
  for (const member of members) for (const p of checker.getPropertiesOfType(member)) names.add(p.getName());
  const all = [...names].filter((n) => !byPattern(n));
  const takesHtml = all.filter((n) => html.has(n)).length > 100;
  const api: ComponentApi = { props: all.filter((n) => !(takesHtml && html.has(n))).sort() };
  if (takesHtml) api.html = true;

  const always = all.filter((n) => members.every((m) => !isOptional(m, n)));
  const named = members.map((m) => NAME_PROPS.filter((n) => !isOptional(m, n) && !always.includes(n)));
  const needing = members.filter((_, i) => named[i]!.length > 0);
  if (needing.length) {
    const anyOf = NAME_PROPS.filter((n) => named.some((list) => list.includes(n)));
    if (needing.length === members.length) {
      api.name = { anyOf };
    } else {
      // Only some branches need a name: the prop that is `true` in exactly
      // those branches says when (`iconOnly` on HardwareButton).
      const when = all.find((n) => members.every((m, i) => isTrue(checker, m, n) === (named[i]!.length > 0)));
      if (when) api.name = { anyOf, when };
    }
  }
  const required = always.filter((n) => !NAME_PROPS.slice(0, 3).includes(n));
  if (required.length) api.required = required.sort();
  return api;
}

export interface Apis {
  /** Per item (registry name), per exported component. */
  byItem: Map<string, Record<string, ComponentApi>>;
  htmlAttributes: string[];
}

export function componentApis(): Apis {
  const dirs = Object.entries(META_DIRS) as [MetaName, string][];
  const program = createProgram(
    dirs.map(([, dir]) => resolve(itemDir(dir), "index.ts")),
    new Map([[HTML_PROBE, HTML_SOURCE]]),
  );
  const checker = program.getTypeChecker();

  const probe = program.getSourceFile(HTML_PROBE);
  const htmlSymbol = probe && checker.getExportsOfModule(checker.getSymbolAtLocation(probe)!).find((s) => s.getName() === "Html");
  const htmlType = htmlSymbol ? checker.getDeclaredTypeOfSymbol(htmlSymbol) : undefined;
  const html = new Set((htmlType ? checker.getPropertiesOfType(htmlType) : []).map((p) => p.getName()).filter((n) => !byPattern(n)));

  const byItem = new Map<string, Record<string, ComponentApi>>();
  for (const [name, dir] of dirs) {
    const apis: Record<string, ComponentApi> = {};
    for (const [exported, raw] of indexExports(program, dir)) {
      if (!/^[A-Z]/.test(exported)) continue;
      const symbol = raw.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(raw) : raw;
      if (!(symbol.flags & ts.SymbolFlags.Value)) continue;
      const type = checker.getTypeOfSymbol(symbol);
      const props = propsOf(checker, type);
      if (props) apis[exported] = apiOf(checker, props, html);
      // A compound's parts: `Tabs.List`, `Accordion.Item`.
      for (const part of checker.getPropertiesOfType(type)) {
        if (!/^[A-Z]/.test(part.getName())) continue;
        const partProps = propsOf(checker, checker.getTypeOfSymbol(part));
        if (partProps) apis[`${exported}.${part.getName()}`] = apiOf(checker, partProps, html);
      }
    }
    if (Object.keys(apis).length) byItem.set(name, apis);
  }
  return { byItem, htmlAttributes: [...html].sort() };
}
