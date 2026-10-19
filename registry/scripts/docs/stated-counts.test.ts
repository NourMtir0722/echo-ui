/**
 * The README said "111 items: 109 components", and the Installation
 * guide's size table "all 111 items", weeks after the registry had 115 and 113.
 * A count written into prose goes stale the day the list changes, as the MCP
 * server's tool count can. This is the same guard for the
 * registry: every count of items or components in the READMEs and the guides
 * is the registry's own.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { registryRoot } from "./program";

const repoRoot = resolve(registryRoot, "..");
const items = (JSON.parse(readFileSync(resolve(registryRoot, "registry.json"), "utf8")) as { items: { type: string }[] }).items;
const COUNTS: Record<string, number> = {
  items: items.length,
  components: items.filter((i) => i.type === "registry:component").length,
};

test("every count of the registry's items in the READMEs and guides is the real one", () => {
  const files = execFileSync("git", ["ls-files", "README.md", "CONTRIBUTING.md", "packages/*/README.md", "mcp/README.md", "apps/www/app/docs"], {
    cwd: repoRoot,
    encoding: "utf8",
  })
    .split("\n")
    .filter((f) => /\.(md|mdx)$/.test(f));
  const wrong: string[] = [];
  for (const file of files) {
    readFileSync(resolve(repoRoot, file), "utf8")
      .split("\n")
      .forEach((line, i) => {
        // Two or three digits: "the 7 items it pulls in" is a template's, not the registry's.
        for (const m of line.matchAll(/\b(\d{2,3}) (items|components)\b/g)) {
          const said = Number(m[1]);
          const real = COUNTS[m[2]!]!;
          if (said !== real) wrong.push(`${file}:${i + 1} says ${said} ${m[2]}; the registry has ${real}`);
        }
      });
  }
  assert.deepEqual(wrong, []);
});
