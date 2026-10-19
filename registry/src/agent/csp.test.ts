import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { CSP_NEEDS, cspPolicy } from "./csp";

/**
 * The CSP list is the truth only while the code agrees with it. This reads
 * every file Echo ships (the registry's components and echo-ui-core) for the
 * things a strict policy blocks.
 */
const registryRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const repoRoot = join(registryRoot, "..");

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    // meta.ts holds usage examples as text, not code that runs.
    else if (/\.(tsx?|css)$/.test(name) && !/\.test\.tsx?$/.test(name) && name !== "meta.ts") out.push(path);
  }
  return out;
}

const registry = JSON.parse(readFileSync(join(registryRoot, "registry.json"), "utf8")) as {
  items: { name: string; files: { path: string }[] }[];
};
const itemsOf = (file: string): string[] => {
  const rel = relative(registryRoot, file);
  return registry.items.filter((i) => i.files.some((f) => f.path === rel)).map((i) => i.name);
};

const shipped = [...walk(join(registryRoot, "src/echo")), ...walk(join(repoRoot, "packages/core/src"))];
/** Comments say things like "no eval here"; the code is what runs. */
const code = (text: string): string => text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");

const needs = (directive: string, source: string) =>
  CSP_NEEDS.find((n) => n.directive === directive && n.source === source)?.items ?? [];

test("there is shipped code to read", () => {
  assert.ok(shipped.length > 200, `read ${shipped.length} files`);
});

test("nothing Echo ships needs a script, a style element, eval or a worker", () => {
  const FORBIDDEN: [RegExp, string][] = [
    [/\beval\s*\(/, "eval"],
    [/\bnew Function\s*\(/, "new Function"],
    [/createElement\(\s*["'](style|script)["']/, "a style or script element"],
    [/<(style|script)[\s>]/i, "a style or script element"],
    [/dangerouslySetInnerHTML/, "inline HTML"],
    [/\.insertRule\s*\(/, "a rule inserted into a stylesheet"],
    [/new (Shared)?Worker\s*\(|audioWorklet|serviceWorker\.register/, "a worker"],
    [/url\(\s*["']?(https?:)?\/\//, "a resource from another origin"],
    [/@import\s/, "an @import"],
  ];
  const offences: string[] = [];
  for (const file of shipped) {
    const text = code(readFileSync(file, "utf8"));
    for (const [pattern, what] of FORBIDDEN) if (pattern.test(text)) offences.push(`${relative(repoRoot, file)}: ${what}`);
  }
  assert.deepEqual(offences, [], "a strict CSP would block these; if one is really needed, it goes in CSP_NEEDS first");
});

test("a data: or blob: URL comes only from an item CSP_NEEDS names", () => {
  const dataItems = new Set(needs("img-src", "data:"));
  const blobItems = new Set(needs("media-src", "blob:"));
  const offences: string[] = [];
  for (const file of shipped) {
    const text = code(readFileSync(file, "utf8"));
    const items = itemsOf(file);
    const who = items.length ? items : ["echo-ui-core"];
    if (/\bdata:(image|audio|video|font|application)\//.test(text) && !who.some((i) => dataItems.has(i))) {
      offences.push(`${relative(repoRoot, file)}: a data: URL (${who.join(", ")})`);
    }
    if (/createObjectURL\s*\(/.test(text) && !who.some((i) => blobItems.has(i))) {
      offences.push(`${relative(repoRoot, file)}: a blob: URL (${who.join(", ")})`);
    }
  }
  assert.deepEqual(offences, [], "write the need into CSP_NEEDS, with why");
});

test("every item CSP_NEEDS names exists, and still needs it", () => {
  const names = new Set(registry.items.map((i) => i.name));
  for (const need of CSP_NEEDS) {
    if (need.items === "all") continue;
    for (const item of need.items) {
      assert.ok(names.has(item), `${item} is not a registry item`);
      const text = registry.items
        .find((i) => i.name === item)!
        .files.map((f) => code(readFileSync(join(registryRoot, f.path), "utf8")))
        .join("\n");
      const uses = need.source === "data:" ? /\bdata:(image|audio|video|font)\//.test(text) : /createObjectURL\s*\(/.test(text);
      assert.ok(uses, `${item} no longer uses ${need.source}: take it out of CSP_NEEDS`);
    }
  }
});

test("the policy the guide prints allows exactly what the list says", () => {
  const full = cspPolicy({ textures: true, voiceNote: true }).join("; ");
  for (const need of CSP_NEEDS) assert.match(full, new RegExp(`${need.directive} [^;]*${need.source.replace(/[.*+?^${}()|[\]\\']/g, "\\$&")}`));
  const plain = cspPolicy().join("; ");
  assert.doesNotMatch(plain, /data:|blob:/, "without Textures or VoiceNote there's nothing to allow");
  assert.doesNotMatch(full, /unsafe-eval|script-src[^;]*unsafe-inline/);
});
