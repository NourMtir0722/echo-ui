/**
 * Echo's public API names Echo's own types.
 *
 * Nine components put `BaseX.Root.ChangeEventDetails` straight into a
 * signature a consumer writes against. That made Echo's API a downstream of
 * Base UI's internals: by CHANGELOG.md's own definition ("a prop … changed"),
 * an upstream rename is a BREAKING Echo release caused by somebody else's
 * refactor, on a schedule nobody here controls.
 *
 * Base UI stays the implementation — this is only about what a consumer has to
 * write down. `echo-ui-core/events` holds the Echo-named structural subsets,
 * so the same object still arrives at runtime.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";

import { registryRoot } from "./docs/program";

const echoDir = resolve(registryRoot, "src/echo");

interface Source {
  file: string;
  text: string;
}

function sources(): Source[] {
  const out: Source[] = [];
  for (const dir of readdirSync(echoDir, { withFileTypes: true })) {
    if (!dir.isDirectory()) continue;
    for (const file of readdirSync(join(echoDir, dir.name))) {
      if (!/\.tsx?$/.test(file)) continue;
      const path = join(echoDir, dir.name, file);
      out.push({
        file: relative(registryRoot, path),
        // Comments legitimately discuss Base UI at length.
        text: readFileSync(path, "utf8")
          .replace(/\/\*[\s\S]*?\*\//g, "")
          .replace(/^[ \t]*\/\/.*$/gm, ""),
      });
    }
  }
  return out;
}

/**
 * The local names a file binds to `@base-ui/react/*` imports.
 *
 * `import type { … }` and a per-specifier `{ type X }` are collected too
 *. Leaving them out meant the ONE import form whose only possible
 * purpose is to put an upstream name in a type position was the one form this
 * never looked at — so the leak it exists to catch could be reintroduced by
 * writing it the way a modern codebase writes it.
 */
function baseAliases(text: string): string[] {
  const names: string[] = [];
  for (const m of text.matchAll(
    /import\s+(?:type\s+)?(?:\*\s+as\s+(\w+)|{([^}]*)})\s+from\s+["']@base-ui\/react[^"']*["']/g,
  )) {
    if (m[1]) names.push(m[1]);
    for (const part of (m[2] ?? "").split(",")) {
      const alias = /(?:\bas\s+(\w+)|^\s*(?:type\s+)?(\w+))\s*$/.exec(part.trim());
      const name = alias?.[1] ?? alias?.[2];
      if (name) names.push(name);
    }
  }
  return names;
}

/**
 * Every type declaration in a file, exported or not, with its body — found by
 * matching braces from the declaration so nested shapes come with it.
 *
 * Not just the exported ones. The library's actual convention is a PRIVATE
 * interface re-exported through an intersection:
 *
 *     interface SwitchOwnProps { onCheckedChange?: (…) => void }
 *     export type SwitchProps = SwitchOwnProps & AccessibleName;
 *
 * so a check that reads only `export` declarations sees none of the props it
 * is supposed to be checking, and passes for the wrong reason. This collects
 * everything and `reachable()` works out what is public.
 */
function typeBlocks(text: string): { name: string; body: string; exported: boolean }[] {
  const blocks: { name: string; body: string; exported: boolean }[] = [];
  for (const m of text.matchAll(/^(export\s+)?(?:interface|type)\s+(\w+)/gm)) {
    const start = m.index! + m[0].length;
    let depth = 0;
    let seenBrace = false;
    let i = start;
    for (; i < text.length; i++) {
      const c = text[i];
      if (c === "{") {
        depth++;
        seenBrace = true;
      } else if (c === "}") {
        depth--;
        if (depth === 0 && seenBrace) {
          i++;
          break;
        }
      } else if (c === ";" && depth === 0 && !seenBrace) {
        break; // a one-line `export type X = A & B;`
      }
    }
    blocks.push({ name: m[2]!, body: text.slice(start, i), exported: Boolean(m[1]) });
  }
  return blocks;
}

/**
 * The public type surface: every exported type, plus every local type one of
 * them names, transitively. `SwitchProps` is public, so `SwitchOwnProps` is
 * public too, whatever its own keyword says.
 */
function reachable(blocks: { name: string; body: string; exported: boolean }[]) {
  const byName = new Map(blocks.map((b) => [b.name, b]));
  const seen = new Set<string>();
  const queue = blocks.filter((b) => b.exported).map((b) => b.name);
  while (queue.length) {
    const name = queue.pop()!;
    if (seen.has(name)) continue;
    seen.add(name);
    const block = byName.get(name);
    if (!block) continue;
    for (const ref of block.body.match(/\b[A-Z]\w*/g) ?? []) {
      if (byName.has(ref) && !seen.has(ref)) queue.push(ref);
    }
  }
  return blocks.filter((b) => seen.has(b.name));
}

const ALL = sources();

test("there are component sources to check", () => {
  assert.ok(ALL.length > 40, `expected the whole library, found ${ALL.length} sources`);
});

/**
 * What still leaks, listed so it cannot grow.
 *
 * Both entries are wholesale PASSTHROUGH — `extends ComponentProps<typeof
 * Drawer.Root>` and the like — which is not an accidental leak but a
 * deliberate open API, and it is now the one PRINCIPLES.md says Echo does not
 * have. Closing it changes what props those components accept, not just
 * what the props are called, so it is a design change, not a rename.
 *
 * `RadioGroupProps` joined the list when the check was widened, and was
 * taken off again by narrowing the component to `EchoInterop`. Menu and Sheet are
 * what remain.
 */
const KNOWN: Record<string, string[]> = {
  "src/echo/menu/menu.tsx": ["MenuContentProps"],
  "src/echo/sheet/sheet.tsx": ["SheetProps", "SheetContentProps"],
};


test("no Base UI type appears in an exported signature", () => {
  const leaks: string[] = [];
  for (const { file, text } of ALL) {
    const aliases = baseAliases(text);
    if (aliases.length === 0) continue;
    for (const { name, body } of reachable(typeBlocks(text))) {
      for (const alias of aliases) {
        // Both forms. `BaseSwitch.Root.ChangeEventDetails` is the namespaced
        // one this check first removed; a BARE `ChangeEventDetails`, imported by name from
        // `@base-ui/react/...`, is the same leak written the modern way and
        // was invisible to the narrower check — which is exactly the form someone
        // reaches for once the namespaces are gone.
        if (!new RegExp(`\\b${alias}\\b`).test(body)) continue;
        if (KNOWN[file]?.includes(name)) continue;
        leaks.push(`${file}: ${name} names ${alias} — an upstream rename would be an Echo breaking change`);
      }
    }
  }
  assert.deepEqual(
    [...new Set(leaks)],
    [],
    "use the Echo-named equivalent from echo-ui-core/events",
  );
});

/**
 * And the list shrinks rather than being maintained. A name that stops leaking
 * has to come off, so `KNOWN` cannot quietly become a permanent exemption.
 */
test("the known-leak list has no stale entries", () => {
  const stale: string[] = [];
  for (const [file, names] of Object.entries(KNOWN)) {
    const source = ALL.find((s) => s.file === file);
    if (!source) {
      stale.push(`${file} no longer exists`);
      continue;
    }
    const aliases = baseAliases(source.text);
    const blocks = reachable(typeBlocks(source.text));
    for (const name of names) {
      const block = blocks.find((b) => b.name === name);
      if (!block) {
        stale.push(`${file}: ${name} no longer exists`);
        continue;
      }
      if (!aliases.some((a) => new RegExp(`\\b${a}\\b`).test(block.body))) {
        stale.push(`${file}: ${name} no longer leaks — take it off the list`);
      }
    }
  }
  assert.deepEqual(stale, [], "this list only shrinks; remove what has been fixed");
});
