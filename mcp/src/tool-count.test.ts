import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { TOOL_DEFINITIONS } from "./tools";

/**
 * The docs sidebar called the MCP server "the catalog as four
 * tools" long after a fifth was added, while the homepage said five. A count
 * written into prose goes stale the day the list changes, so every place that
 * states one is held to the server's actual list.
 */
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];

test("every stated count of the MCP server's tools is the real one", () => {
  const actual = Object.keys(TOOL_DEFINITIONS).length;
  const files = execFileSync("git", ["ls-files", "apps/www", "mcp", "README.md", "packages"], { cwd: repoRoot, encoding: "utf8" })
    .split("\n")
    .filter((f) => /\.(md|mdx|ts|tsx)$/.test(f) && !f.endsWith(".test.ts"));
  const wrong: string[] = [];
  for (const file of files) {
    readFileSync(resolve(repoRoot, file), "utf8")
      .split("\n")
      .forEach((line, i) => {
        for (const m of line.matchAll(/\b(zero|one|two|three|four|five|six|seven|eight|nine|ten|\d+) tools\b/gi)) {
          const said = WORDS.indexOf(m[1]!.toLowerCase());
          const n = said >= 0 ? said : Number(m[1]);
          if (n !== actual) wrong.push(`${file}:${i + 1}: "${m[0]}" (the server has ${actual})`);
        }
      });
  }
  assert.deepEqual(wrong, []);
});

/**
 * The production smoke check holds the hosted server to the tools this
 * README's table lists, so the table is held to the server's own list here:
 * a tool added without a row would leave the smoke check testing yesterday.
 */
test("the README's tool table lists exactly the tools the server registers, in order", async () => {
  const { toolsFromReadme } = await import("../../registry/scripts/smoke");
  assert.deepEqual(await toolsFromReadme(), Object.keys(TOOL_DEFINITIONS));
});
