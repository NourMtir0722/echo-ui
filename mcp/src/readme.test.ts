/**
 * A README that lists the MCP server's tools by name lists every one. Another
 * test holds every "N tools" to the real count, but a list of names says no
 * number, so each tool's name is held to each README that lists the tools.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { TOOL_DEFINITIONS } from "./tools";

const READMES = ["../README.md", "../../README.md"];

test("every README that lists the MCP server's tools names all of them", () => {
  const missing: string[] = [];
  for (const path of READMES) {
    const text = readFileSync(new URL(path, import.meta.url), "utf8");
    for (const name of Object.keys(TOOL_DEFINITIONS)) if (!text.includes(`\`${name}\``)) missing.push(`${path}: ${name}`);
  }
  assert.deepEqual(missing, []);
});
