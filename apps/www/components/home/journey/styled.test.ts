import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";

/**
 * A class the road's cards put on an element is styled somewhere the homepage
 * reads, unless it's only a name for something else to find (HOOKS, each with
 * what needs no rule). Deleting a card's dead rules once took a live one with
 * them.
 */
const HOOKS: Record<string, string> = {
  "demo__words": "the name's wrapper, laid out by .demo__head",
  "jy-flight": "the paper's canvas, placed by Flight.tsx's own style",
  "jy-merge__pigment": "found by PaperRoad.tsx, placed by .jy-merge > *",
  "term--chat": "says which kind of window; it looks like the others",
  "term__line": "every line of a terminal, laid out by .term__body",
};

function files(dir: URL, ext: string): URL[] {
  return readdirSync(dir).flatMap((name) => {
    const url = new URL(name, dir);
    if (statSync(url).isDirectory()) return name === "node_modules" ? [] : files(new URL(`${name}/`, dir), ext);
    return name.endsWith(ext) ? [url] : [];
  });
}

const read = (url: URL) => readFileSync(url, "utf8");

test("every class the road's cards put on an element has a rule, or is a hook", () => {
  const journey = new URL("./", import.meta.url);
  const used = new Map<string, string>();
  for (const url of files(journey, ".tsx")) {
    const rel = url.pathname.slice(journey.pathname.length);
    for (const m of read(url).matchAll(/className="([^"]+)"/g)) {
      for (const c of m[1]!.split(/\s+/)) if (c && !used.has(c)) used.set(c, rel);
    }
  }
  // What the homepage reads: its own styles, the site's, the app's and the registry's components'.
  const css = [
    new URL("../", journey),
    new URL("../../site/", journey),
    new URL("../../../app/", journey),
    new URL("../../../../../registry/src/", journey),
  ]
    .flatMap((dir) => files(dir, ".css"))
    .map(read)
    .join("\n");
  const unstyled = [...used]
    .filter(([c]) => !(c in HOOKS) && !new RegExp(`\\.${c.replace(/[.*+?^${}()|[\]\\-]/g, "\\$&")}(?![\\w-])`).test(css))
    .map(([c, file]) => `${c} (${file})`);
  assert.deepEqual(unstyled, []);
});
