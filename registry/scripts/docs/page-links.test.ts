/**
 * The Motion & sound guide sent readers to /docs/gsap-presence, a
 * page that has never existed (the item is `use-gsap-presence`). The browser
 * suite follows a docs link only when it names a section, so a link
 * to a whole page was checked by nothing. This reads every link to a docs page
 * in the guides and in each item's meta.ts, and holds it to the pages the site
 * builds: one per item in the sidebar's groups, one per guide, and the index.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

import { GROUP_OF } from "../../src/agent/groups";
import { GUIDES_DIR, guideFolders } from "./lock";
import { registryRoot } from "./program";

const PAGES = new Set(["", ...Object.keys(GROUP_OF).map((name) => name.replace(/^echo-/, "")), ...guideFolders().filter((f) => f !== "introduction")]);

/** `/docs/<page>` links in markdown, in an href, and in a string, with where each is. */
function links(path: string): { at: string; page: string }[] {
  const found: { at: string; page: string }[] = [];
  readFileSync(path, "utf8")
    .split("\n")
    .forEach((line, i) => {
      for (const m of line.matchAll(/(?:\]\(|href=["{`]*|["'`])\/docs(?:\/([a-z0-9-]+))?(?=[)"'`#?\s}]|$)/g)) {
        found.push({ at: `${path.slice(registryRoot.length - "registry".length)}:${i + 1}`, page: m[1] ?? "" });
      }
    });
  return found;
}

const metaFiles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? metaFiles(join(dir, e.name)) : e.name === "meta.ts" ? [join(dir, e.name)] : [],
  );

test("every link to a docs page in a guide or a meta.ts lands on a page the site builds", () => {
  const files = [
    ...guideFolders().map((f) => (f === "introduction" ? resolve(GUIDES_DIR, "content.mdx") : resolve(GUIDES_DIR, f, "content.mdx"))),
    ...metaFiles(resolve(registryRoot, "src")),
  ];
  const all = files.flatMap(links);
  assert.ok(all.length > 50, `read ${all.length} links; the reader has stopped finding them`);
  const dead = all.filter((l) => !PAGES.has(l.page)).map((l) => `${l.at} → /docs/${l.page}`);
  assert.deepEqual(dead, []);
});
