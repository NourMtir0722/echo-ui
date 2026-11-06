import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * The homepage's stylesheets, and Support's and Supporters', which share them, stay in the document
 * after a link moves on without a reload: Next adds a page's styles and never takes them away. A
 * rule of theirs that another page's markup also matches restyles that page, for a reader who came
 * through these pages and never on a fresh load. So every selector in them must name a class, an id
 * or an attribute that only these pages render.
 */
const www = join(dirname(fileURLToPath(import.meta.url)), "../..");
const repo = join(www, "../..");
const OWN = ["components/home", "components/support", "components/supporters"].map((d) => join(www, d));
const isOwn = (file: string) => OWN.some((d) => file.startsWith(d + "/"));

function files(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files(path, out);
    else out.push(path);
  }
  return out;
}

const withoutComments = (source: string) => source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|\s)\/\/.*$/gm, "$1");

const literals = (code: string) => [...code.matchAll(/"([^"\n]*)"|'([^'\n]*)'|`([^`]*)`/g)].map((m) => m[1] ?? m[2] ?? m[3] ?? "");
const words = (text: string) => text.split(/[^\w-]+/).filter(Boolean);

/** The text of the value or call that opens at `start`: a quoted string, or a `{…}` or `(…)` group. */
function opening(source: string, start: number): string {
  const first = source[start];
  if (first === '"' || first === "'") return source.slice(start, source.indexOf(first, start + 1) + 1);
  const close = first === "{" ? "}" : first === "(" ? ")" : null;
  if (!close) return "";
  let depth = 0;
  for (let i = start; i < source.length; i++) {
    if (source[i] === first) depth++;
    else if (source[i] === close && --depth === 0) return source.slice(start, i + 1);
  }
  return "";
}

/**
 * Every name the rest of the site can render. A plain word counts where markup or code sets a class
 * or an id with it, since elsewhere it is usually prose; a name with a `-` or `_` in it counts in
 * any string, so one held in a constant is still found. So does every attribute JSX sets. An `echo-`
 * name is the registry's, which any page can draw, so it is never one of these pages' own.
 */
function namesRenderedElsewhere(): Set<string> {
  const names = new Set<string>();
  const sources = [...files(join(www, "app")), ...files(join(www, "components")), ...files(join(repo, "registry/src"))].filter(
    (f) => /\.(tsx?|mdx)$/.test(f) && !/\.test\.tsx?$/.test(f) && !isOwn(f),
  );
  for (const file of sources) {
    const source = withoutComments(readFileSync(file, "utf8"));
    for (const literal of literals(source)) for (const word of words(literal)) if (/[-_]/.test(word)) names.add(word);
    const setters = /\b(?:className|class|id)\s*=\s*|\b(?:cx|cn|clsx)\s*(?=\()|\bclassList\.(?:add|toggle|replace)\s*(?=\()/g;
    for (const m of source.matchAll(setters)) {
      const value = opening(source, m.index + m[0].length);
      const strings = /^["']/.test(value) ? [value.slice(1, -1)] : literals(value);
      for (const s of strings) for (const word of words(s)) names.add(word);
    }
    for (const [, attribute] of source.matchAll(/\s(data-[\w-]+|aria-[\w-]+)=/g)) names.add(attribute!);
  }
  return names;
}

/** Each selector, with the at-rules around it; keyframe stops are not selectors. */
function selectors(css: string): string[] {
  const out: string[] = [];
  const open: string[] = [];
  for (const [, head, brace] of withoutComments(css).matchAll(/([^{};]*)([{};])/g)) {
    const prelude = head!.trim();
    if (brace === "}") open.pop();
    else if (brace === "{") {
      const inKeyframes = open.some((p) => p.startsWith("@keyframes"));
      open.push(prelude);
      if (prelude.startsWith("@") || inKeyframes) continue;
      out.push(...splitList(prelude));
    }
  }
  return out;
}

/** A selector list split at its own commas, not the ones inside `:is()` or `:not()`. */
function splitList(list: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (const ch of list) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      parts.push(current.trim());
      current = "";
    } else current += ch;
  }
  parts.push(current.trim());
  return parts.filter(Boolean);
}

/** The classes, ids and attribute names a selector asks for. */
const named = (selector: string) => [
  ...[...selector.matchAll(/[.#](-?[_a-zA-Z][\w-]*)/g)].map((m) => m[1]!),
  ...[...selector.matchAll(/\[\s*([\w-]+)/g)].map((m) => m[1]!),
];

test("every rule in the homepage's stylesheets is held to something only the homepage, Support and Supporters draw", () => {
  const elsewhere = namesRenderedElsewhere();
  const own = (name: string) => !name.startsWith("echo-") && !elsewhere.has(name);
  const loose: string[] = [];
  for (const file of OWN.flatMap((d) => files(d)).filter((f) => f.endsWith(".css"))) {
    for (const selector of selectors(readFileSync(file, "utf8"))) {
      if (!named(selector).some(own)) loose.push(`${relative(www, file)}: ${selector}`);
    }
  }
  assert.deepEqual(loose, [], "these rules can match another page's markup:\n" + loose.join("\n"));
});
