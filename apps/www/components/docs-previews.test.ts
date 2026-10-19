import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { DOC_SLUGS } from "./docs-manifest";

/**
 * Every docs page's preview is its own module, loaded only on its page. A page
 * used to carry the whole library, because one module held every preview.
 * This keeps the manifest, the map and the modules in step, and keeps any
 * preview from importing another page's.
 */
const here = dirname(fileURLToPath(import.meta.url));
const map = readFileSync(join(here, "docs-previews.tsx"), "utf8");

test("every docs page has its own preview module, and the map loads each one on its own", () => {
  const loaded = [...map.matchAll(/"([^"]+)": dynamic\(\(\) => import\("\.\/previews\/([^"]+)"\)\)/g)];
  assert.ok(loaded.every(([, slug, file]) => slug === file), "each slug loads its own file");
  const slugs = new Set(loaded.map(([, slug]) => slug!));
  const missing = DOC_SLUGS.filter((slug) => !slugs.has(slug) && existsSync(join(here, "previews", `${slug}.tsx`)));
  assert.deepEqual(missing, [], "a preview module the map doesn't load");
  for (const slug of slugs) assert.ok(existsSync(join(here, "previews", `${slug}.tsx`)), `previews/${slug}.tsx`);
  assert.ok(slugs.size >= 100, `only ${slugs.size} previews`);
});

test("no preview imports another page's preview", () => {
  const dir = join(here, "previews");
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".tsx"))) {
    const text = readFileSync(join(dir, file), "utf8");
    assert.doesNotMatch(text, /from "\.\/(?!shared\/)[^"]+"/, file);
    assert.doesNotMatch(text, /docs-previews/, file);
  }
});
