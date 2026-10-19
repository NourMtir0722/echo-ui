import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import { GROUP_OF } from "./groups";

/**
 * The site's template links were written by hand when there were
 * three templates, and nothing noticed when Chat made four: the sidebar still
 * offered "all three, side by side", and Chat's docs page was the only
 * template page without a link to its running screen. Both lists live in
 * `apps/www/components/site/site-nav.ts`, which imports through the app's
 * path aliases, so this reads it as text rather than importing it.
 */
const __dirname = dirname(fileURLToPath(import.meta.url));
const SITE_NAV = resolve(__dirname, "../../../apps/www/components/site/site-nav.ts");

const TEMPLATES = Object.entries(GROUP_OF)
  .filter(([, group]) => group === "Templates")
  .map(([name]) => name.replace(/^echo-/, ""));

const COUNT_WORDS = ["one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];

test("every template's docs page links to its running screen", async () => {
  const source = await readFile(SITE_NAV, "utf8");
  const missing = TEMPLATES.filter(
    (slug) => !new RegExp(`["']?${slug}["']?:\\s*\\{\\s*href:\\s*"/templates/${slug}"`).test(source),
  );
  assert.deepEqual(missing, []);
});

test("the Templates overview label doesn't state a count that disagrees", async () => {
  const source = await readFile(SITE_NAV, "utf8");
  const label = source.match(/Templates:\s*\{\s*href:\s*"\/templates",\s*label:\s*"([^"]*)"/)?.[1];
  assert.ok(label !== undefined, "the Templates overview entry was not found in site-nav.ts");
  const stated = label
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .map((w) => (/^\d+$/.test(w) ? Number(w) : COUNT_WORDS.indexOf(w) + 1))
    .filter((n) => n > 0);
  for (const n of stated) assert.equal(n, TEMPLATES.length, `"${label}" says ${n}; there are ${TEMPLATES.length}`);
});
