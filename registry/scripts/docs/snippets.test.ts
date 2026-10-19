/**
 * Docs freshness test A: every code snippet in every meta
 * compiles against the real components.
 *
 * Each example becomes a virtual .tsx file in `src/__snippets__/` that has
 * every registry export in scope, and the whole set is type-checked in one
 * program. A renamed prop, a removed variant, a component that no longer
 * exists — each is now a failing test instead of a doc page that quietly lies.
 *
 * What a snippet may leave undeclared, so examples can stay short:
 *
 * - **lowercase names** (`record`, `levels`, `setOpen`) — the reader's own
 *   values. They are declared `any`, which still checks that the PROP they are
 *   passed to exists; it only stops checking the value's type.
 * - **the reader's own components** in PLACEHOLDER_COMPONENTS (`PlayIcon`).
 *
 * An unknown PascalCase name is NOT forgiven: that is how a renamed Echo
 * component would show up, and forgiving it would defeat the test.
 *
 * **Usage snippets are stricter.** They carry their own import lines
 * (`@/echo/<item>`, the path a reader's project uses) and get NO scope
 * header, so the import a reader copies is checked along with the code.
 *
 * A snippet that starts with `<` is wrapped in a fragment, so several sibling
 * elements (`<Kbd>⌘</Kbd> <Kbd>K</Kbd>`) are fine. Anything else is a function
 * body, so hooks and `return` work.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { resolve } from "node:path";
import ts from "typescript";

import { ALL_METAS, META_DIRS } from "../../src/agent/metas";
import type { MetaDocsFields } from "../../src/agent/meta-types";
import { createProgram, formatDiagnostic, indexExports, itemDir, itemImportPath, registryRoot } from "./program";

/** Components a snippet may use that belong to the reader, not to Echo. */
const PLACEHOLDER_COMPONENTS = ["App", "Hero", "Inbox", "PlayIcon", "Readout", "RecIcon", "Wordmark", "SearchIcon", "ClearIcon", "BoldIcon", "ItalicIcon", "MuteIcon", "ClockIcon", "StarIcon", "PinIcon", "WifiIcon", "MoonIcon", "BluetoothIcon", "SunIcon", "SpeakerIcon"];

/** Third-party names snippets may use, and where they come from. */
const EXTERNALS: Record<string, string> = {
  Dialog: 'import { Dialog } from "@base-ui/react/dialog";',
  gsap: 'import gsap from "gsap";',
  React: 'import * as React from "react";',
};

/**
 * Browser globals a snippet may genuinely mean. Every OTHER lowercase name
 * that resolves to a DOM global (`open`, `name`, `status`, `close`) is almost
 * certainly the reader's own variable that happens to collide with one — so
 * it is shadowed as `any` like any other free name, rather than type-checked
 * as `window.open`.
 */
const REAL_GLOBALS = new Set(["window", "document", "console", "fetch", "navigator", "localStorage", "setTimeout", "clearTimeout", "requestAnimationFrame"]);

interface Snippet {
  item: string;
  label: string;
  code: string;
  file: string;
  /** Usage snippets: the reader's own import lines, and no auto-imported scope. */
  imports?: string;
}

function collectSnippets(): Snippet[] {
  const out: Snippet[] = [];
  for (const meta of ALL_METAS) {
    const dir = META_DIRS[meta.name];
    const usage = (meta as MetaDocsFields).usage;
    if (usage) {
      out.push({
        item: meta.name,
        label: "usage",
        code: usage.code,
        imports: usage.imports,
        file: resolve(registryRoot, "src/__snippets__", `${dir}--usage.tsx`),
      });
    }
    meta.examples.forEach((ex, i) => {
      out.push({
        item: meta.name,
        label: `example "${ex.title}"`,
        code: ex.code,
        file: resolve(registryRoot, "src/__snippets__", `${dir}--example-${i}.tsx`),
      });
    });
  }
  return out;
}

/** `import { … } from "../echo/<dir>"` (or `echo-ui-core/…`) for every item, values and types separately. */
function scopeImports(): string {
  const program = createProgram(Object.values(META_DIRS).map((d) => resolve(itemDir(d), "index.ts")));
  const seen = new Set<string>();
  const lines: string[] = [];
  for (const dir of Object.values(META_DIRS)) {
    const values: string[] = [];
    const types: string[] = [];
    for (const [name, sym] of indexExports(program, dir)) {
      if (seen.has(name)) continue;
      seen.add(name);
      const flags = sym.flags & ts.SymbolFlags.Alias ? program.getTypeChecker().getAliasedSymbol(sym).flags : sym.flags;
      (flags & ts.SymbolFlags.Value ? values : types).push(name);
    }
    if (values.length) lines.push(`import { ${values.join(", ")} } from "${itemImportPath(dir)}";`);
    if (types.length) lines.push(`import type { ${types.join(", ")} } from "${itemImportPath(dir)}";`);
  }
  return lines.join("\n");
}

function wrap(snippet: Snippet, header: string, freeNames: readonly string[]): string {
  const externals = Object.entries(EXTERNALS)
    .filter(() => snippet.imports === undefined)
    .filter(([name]) => new RegExp(`\\b${name}\\b`).test(snippet.code))
    .map(([, line]) => line);
  const placeholders = PLACEHOLDER_COMPONENTS.map((n) => `declare function ${n}(props: Record<string, unknown>): null;`);
  const free = freeNames.map((n) => `declare const ${n}: any;`);
  const trimmed = snippet.code.trim();
  const body = trimmed.startsWith("<") ? `return (<>\n${trimmed}\n</>);` : trimmed;
  // A reader's `@/echo/<item>` is this repo's `src/echo/<item>`.
  const scope = snippet.imports === undefined ? header : snippet.imports.replaceAll('"@/echo/', '"../echo/');
  return [
    "/* eslint-disable */",
    scope,
    ...externals,
    ...placeholders,
    ...free,
    // The body starts on a known line so diagnostics can point into the snippet.
    "export function Snippet() {",
    body,
    "}",
  ].join("\n");
}

const CANNOT_FIND_NAME = new Set([2304, 2552, 2582]);

test("A: every meta snippet compiles against the real components", () => {
  const snippets = collectSnippets();
  const header = scopeImports();

  // Pass 1: find the names each snippet leaves undeclared.
  const firstPass = new Map(snippets.map((s) => [s.file, wrap(s, header, [])]));
  const program1 = createProgram([], firstPass);
  const free = new Map<string, Set<string>>();
  const failures: string[] = [];

  for (const s of snippets) {
    const names = new Set<string>();
    for (const d of program1.getSemanticDiagnostics(program1.getSourceFile(s.file))) {
      if (!CANNOT_FIND_NAME.has(d.code) || d.start === undefined) continue;
      const name = d.file!.text.slice(d.start, d.start + d.length!);
      if (/^[a-z_$]/.test(name)) names.add(name);
      else failures.push(`${s.item} ${s.label}: unknown component or type \`${name}\``);
    }
    // Free names that happen to be DOM globals never raise "cannot find name".
    const sf = program1.getSourceFile(s.file)!;
    const checker = program1.getTypeChecker();
    const visit = (node: ts.Node): void => {
      if (ts.isIdentifier(node) && /^[a-z]/.test(node.text) && !REAL_GLOBALS.has(node.text)) {
        const decls = checker.getSymbolAtLocation(node)?.declarations ?? [];
        if (decls.length > 0 && decls.every((d) => /lib\.dom|lib\.es/.test(d.getSourceFile().fileName))) {
          names.add(node.text);
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sf);
    free.set(s.file, names);
  }

  // Pass 2: the real check, with the reader's own values declared.
  const secondPass = new Map(snippets.map((s) => [s.file, wrap(s, header, [...free.get(s.file)!])]));
  const program2 = createProgram([], secondPass);
  for (const s of snippets) {
    const sf = program2.getSourceFile(s.file)!;
    const bodyStart = sf.text.split("\n").indexOf("export function Snippet() {") + 1;
    const diags = [...program2.getSyntacticDiagnostics(sf), ...program2.getSemanticDiagnostics(sf)];
    for (const d of diags) {
      if (CANNOT_FIND_NAME.has(d.code)) continue; // reported in pass 1
      const line = d.start === undefined ? 0 : sf.getLineAndCharacterOfPosition(d.start).line - bodyStart + 1;
      failures.push(`${s.item} ${s.label} (line ${line}): ${formatDiagnostic(d)}`);
    }
  }

  const unique = [...new Set(failures)];
  assert.deepEqual(unique, [], `\n${unique.length} snippet(s) do not compile:\n  ${unique.join("\n  ")}\n`);
});
