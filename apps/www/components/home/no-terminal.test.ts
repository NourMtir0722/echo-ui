import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { HOSTED_MCP_URL } from "@registry/agent/guidance";
import { NO_TERMINAL } from "./no-terminal";

/**
 * The homepage's advice for a tool without a terminal. A command can't be
 * that advice: there's nowhere to run it. /docs/ai ("Which way in") and
 * /docs/mcp ("Hosted, for tools without a terminal") send that reader to the
 * plugin in ChatGPT or Claude, or to the hosted server.
 */
test("the homepage never answers 'No terminal?' with a command", () => {
  const here = new URL("./", import.meta.url);
  for (const file of readdirSync(here).filter((f) => /\.tsx?$/.test(f) && !f.endsWith(".test.ts"))) {
    for (const line of readFileSync(new URL(file, here), "utf8").split("\n")) {
      if (/No terminal\?/.test(line)) assert.doesNotMatch(line, /npx|echo-ui-mcp/, `${file}: ${line.trim()}`);
    }
  }
  // The shared sentence: the plugin, and the server's address as the docs print it.
  assert.doesNotMatch(NO_TERMINAL.text, /npx|echo-ui-cli/);
  assert.match(NO_TERMINAL.text, /plugin/);
  assert.equal(NO_TERMINAL.url, HOSTED_MCP_URL);
});
