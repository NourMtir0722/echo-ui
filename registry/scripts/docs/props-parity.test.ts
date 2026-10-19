/**
 * Docs freshness test B: the props a meta documents match
 * the props the component actually takes.
 *
 * The docs' prop table, llms-full.txt and the MCP server's get_component all
 * read the meta's zod schema — and nothing tied that schema to the component.
 * So a prop added to the component was invisible to every reader, and a prop
 * removed from it went on being advertised. Two rules close that:
 *
 * 1. **Every prop Echo declares is documented.** "Declared by Echo" means the
 *    property is declared in registry source, not inherited from React's HTML
 *    attributes or from Base UI — tabulating those would restate their docs.
 * 2. **Every documented prop exists** on the full props type (inherited ones
 *    included, so documenting `disabled` on a button is fine).
 *
 * Compound parts are documented as `Part.prop` (`Content.side`) and checked
 * against that part's props type.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { resolve } from "node:path";
import ts from "typescript";

import { ALL_METAS, META_DIRS, type MetaName } from "../../src/agent/metas";
import { describeProps } from "../../src/agent/props";
import { createProgram, indexExports, itemDir } from "./program";

/**
 * Passthroughs every element takes. Documenting `className` on fifty pages
 * adds nothing; the rules above still apply to everything else.
 */
const UNIVERSAL = new Set(["className", "style", "children", "id", "name"]);

interface Target {
  /** Exported type names, looked up in the item's index.ts (or `module`). */
  types: readonly string[];
  /** Resolve `types` from this file (`<dir>/<file>`, located like the item) instead of `<dir>/index.ts`. */
  module?: string;
  /**
   * Several sibling components documented by ONE flat schema (textures),
   * rather than a root and its parts.
   */
  flat?: boolean;
  /** Part name for the FIRST type, when the item documents a part and no root (Menu → "Content"). */
  prefix?: string;
}

/**
 * Items whose props type is not simply `<Title>Props` in their index. An item
 * missing from here that has no `<Title>Props` export FAILS — it does not
 * silently skip — so a new item cannot opt out by accident.
 */
const TARGETS: Partial<Record<MetaName, Target | { exempt: string }>> = {
  "echo-theme": { exempt: "The seed is documented from the zod schema in seed-schema.ts; seed-parity.test.ts keeps echo-ui-core's validator in step with it." },
  "echo-tabs": { exempt: "Base UI passthrough plus one prop (`size` on Tabs.List) — documented by propsNote, not a table." },
  "echo-accordion": { exempt: "Pure Base UI passthrough — documented by propsNote, not a table." },
  "echo-sound": { types: ["SoundProviderProps"] },
  "echo-motion": { types: ["MotionToken"], module: "motion/motion.ts" },
  "use-tactile": { types: ["TactileConfig"] },
  "use-gsap-presence": { types: ["GsapPresenceConfig"] },
  "echo-menu": { types: ["MenuContentProps"], prefix: "Content" },
  // The title is "OTP field"; the type is OtpFieldProps.
  "echo-otp-field": { types: ["OtpFieldProps"] },
  "echo-sheet": { types: ["SheetProps", "SheetContentProps"] },
  "echo-app-shell": { types: ["AppShellProps", "AppShellRailProps", "AppShellSidebarProps"] },
  "echo-textures": {
    types: ["DitherProps", "NoiseProps", "HalftoneProps", "ScanlinesProps", "GrainFieldProps", "TexturedProps"],
    flat: true,
  },
  "echo-console": { types: ["ConsoleScreenProps"] },
  "echo-chat": { types: ["ChatScreenProps"] },
  // A hook: budOff(from, to, options). The elements are its arguments; the options are its props.
  "echo-bud-off": { types: ["BudOffOptions"] },
  // A hook: useRoll(text, options). The text is its argument; the options are its props.
  "echo-roll": { types: ["RollOptions"] },
  "echo-size": { types: ["SizeProviderProps"] },
  // Two sibling layouts documented by one flat schema, like the textures.
  "echo-layout": { types: ["StackProps", "GridProps"], flat: true },
  "echo-toggle": { types: ["ToggleProps", "ToggleGroupProps"], flat: true },
  "echo-toolbar": { types: ["ToolbarProps", "ButtonGroupProps", "ToolbarGroupProps"], flat: true },
  // One component, two ways in: laid out by hand, or given columns and rows.
  "echo-table": { types: ["TableProps", "TableDataProps"], flat: true },
};

/**
 * Inherited means EVERY declaration is outside registry source. A prop Echo
 * redeclares is Echo's, even when React declares it too: that is how a
 * component turns an optional HTML attribute into a required one.
 */
const isExternal = (sym: ts.Symbol) =>
  (sym.declarations ?? []).length === 0 ||
  (sym.declarations ?? []).every((d) => d.getSourceFile().fileName.includes("node_modules"));

test("B: every meta's documented props match the component's props", () => {
  const program = createProgram([
    ...Object.values(META_DIRS).map((d) => resolve(itemDir(d), "index.ts")),
    resolve(itemDir("motion"), "motion.ts"),
  ]);
  const checker = program.getTypeChecker();
  const failures: string[] = [];

  const moduleExports = (target: Target, dir: string): Map<string, ts.Symbol> => {
    if (!target.module) return indexExports(program, dir);
    const [moduleDir = "", ...rest] = target.module.split("/");
    const sf = program.getSourceFile(resolve(itemDir(moduleDir), ...rest));
    const mod = sf && checker.getSymbolAtLocation(sf);
    return new Map((mod ? checker.getExportsOfModule(mod) : []).map((s) => [s.getName(), s]));
  };

  for (const meta of ALL_METAS) {
    const dir = META_DIRS[meta.name];
    const override = TARGETS[meta.name];
    if (override && "exempt" in override) continue;
    const target: Target = override ?? { types: [`${meta.title}Props`] };
    const exports = moduleExports(target, dir);

    // Part prefix per type: the root type has none; `SheetContentProps` → "Content".
    const root = target.types[0]!.replace(/Props$/, "");
    const resolved: { prefix: string; type: ts.Type }[] = [];
    for (const name of target.types) {
      let sym = exports.get(name);
      if (!sym) {
        failures.push(
          `${meta.name}: no exported type \`${name}\`. Export it, or add a TARGETS entry in props-parity.test.ts naming the props type.`,
        );
        continue;
      }
      if (sym.flags & ts.SymbolFlags.Alias) sym = checker.getAliasedSymbol(sym);
      const part =
        name === target.types[0] ? (target.prefix ?? "") : target.flat ? "" : name.replace(/Props$/, "").replace(root, "");
      resolved.push({ prefix: part ? `${part}.` : "", type: checker.getDeclaredTypeOfSymbol(sym) });
    }
    if (resolved.length !== target.types.length) continue;

    const documented = new Set(describeProps(meta.props).map((p) => p.name));
    const all = new Set<string>();
    const own = new Set<string>();
    for (const { prefix, type } of resolved) {
      for (const p of checker.getPropertiesOfType(type)) {
        all.add(prefix + p.getName());
        if (!isExternal(p) && !UNIVERSAL.has(p.getName())) own.add(prefix + p.getName());
      }
    }

    const undocumented = [...own].filter((p) => !documented.has(p));
    const phantom = [...documented].filter((p) => !all.has(p));
    if (undocumented.length) {
      failures.push(`${meta.name}: takes props the meta does not document: ${undocumented.join(", ")}`);
    }
    if (phantom.length) {
      failures.push(`${meta.name}: documents props the component does not take: ${phantom.join(", ")}`);
    }
  }

  assert.deepEqual(failures, [], `\n${failures.length} prop mismatch(es):\n  ${failures.join("\n  ")}\n`);
});

/**
 * RadioGroup and an icon-only HardwareButton redeclare `aria-label` and
 * `aria-labelledby` so that leaving both out is a type error. React's HTML
 * attributes declare the same two names, and the rule above used to call a
 * prop with ANY outside declaration inherited, so neither name reached the
 * prop table, llms-full.txt or the MCP's get_component. An agent reading the
 * docs was never told the control needs a name.
 */
test("a name the type requires is documented, though React declares it too", () => {
  const cases = [
    { dir: "radio-group", type: "RadioGroupProps", meta: "echo-radio-group" },
    { dir: "hardware-button", type: "HardwareButtonProps", meta: "echo-hardware-button" },
  ] as const;
  const program = createProgram(cases.map((c) => resolve(itemDir(c.dir), "index.ts")));
  const checker = program.getTypeChecker();
  const problems: string[] = [];

  for (const c of cases) {
    let sym = indexExports(program, c.dir).get(c.type);
    assert.ok(sym, `${c.dir} exports ${c.type}`);
    if (sym.flags & ts.SymbolFlags.Alias) sym = checker.getAliasedSymbol(sym);
    const type = checker.getDeclaredTypeOfSymbol(sym);
    const meta = ALL_METAS.find((m) => m.name === c.meta);
    assert.ok(meta, `${c.meta} has a meta`);
    const documented = new Set(describeProps(meta.props).map((p) => p.name));

    for (const name of ["aria-label", "aria-labelledby"]) {
      const prop = checker.getPropertyOfType(type, name);
      if (!prop || isExternal(prop)) problems.push(`${c.type}.${name} should count as Echo's own prop`);
      if (!documented.has(name)) problems.push(`${c.meta} does not document ${name}`);
    }
  }

  assert.deepEqual(problems, [], `\n  ${problems.join("\n  ")}`);
});
