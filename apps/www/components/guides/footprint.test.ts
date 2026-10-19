import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { FOOTPRINT } from "@registry/agent/footprint";

import { footprintRows } from "./footprint-rows";

/**
 * "What Echo puts in your project" is built from the list `init` prints its
 * summary from. This fails if the page leaves an entry out, or says where
 * something lands or how it comes out differently from the list.
 */
test("the page has a row for every entry init writes, with where it lands and how it comes out", () => {
  const rows = footprintRows();
  assert.deepEqual(rows.map((r) => r.id), FOOTPRINT.map((f) => f.id));
  for (const [i, item] of FOOTPRINT.entries()) {
    const row = rows[i]!;
    assert.equal(row.why, item.what);
    assert.equal(row.removal, item.removal);
    if (item.kind !== "dependency") assert.deepEqual(row.where, item.paths({ dir: "<your Echo folder>" }));
  }
});

test("the page shows the table built from those rows", () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const page = readFileSync(resolve(here, "../../app/docs/(guides)/in-your-project/content.mdx"), "utf8");
  assert.match(page, /<Footprint \/>/);
  assert.match(readFileSync(resolve(here, "footprint.tsx"), "utf8"), /footprintRows\(\)\.map/);
});
