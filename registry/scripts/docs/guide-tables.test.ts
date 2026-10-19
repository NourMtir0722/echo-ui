/**
 * Two tables written for the docs refresh, the check matrix on
 * /docs/checks and the plugin-or-server table on /docs/plugin, opened with an
 * empty first header (`| | Reads | …`), which axe reports as
 * `empty-table-header`: a screen reader announces the column as nothing. The
 * browser suite caught it; this catches it in `pnpm check`, before a page is
 * built. Every column of every table in a guide has a header.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { GUIDES_DIR, guideFolders } from "./lock";

test("every column of every table in a guide has a header", () => {
  const empty: string[] = [];
  for (const folder of guideFolders()) {
    const path = folder === "introduction" ? resolve(GUIDES_DIR, "content.mdx") : resolve(GUIDES_DIR, folder, "content.mdx");
    const lines = readFileSync(path, "utf8").split("\n");
    lines.forEach((line, i) => {
      // A header row is the one right above `| --- |`.
      if (!/^\|\s*-{3,}/.test(lines[i + 1] ?? "") || !line.startsWith("|")) return;
      const cells = line.slice(1, line.endsWith("|") ? -1 : undefined).split("|");
      if (cells.some((c) => c.trim() === "")) empty.push(`${folder}/content.mdx:${i + 1}: ${line.slice(0, 60)}`);
    });
  }
  assert.deepEqual(empty, []);
});
