/**
 * The README npm shows for echo-ui-cli had no `test`, no Stop gate,
 * no `--ci` or `--style`, no `style set`, and said `check --url` drives the
 * project's Playwright when it uses the Chrome on the machine first. Nothing
 * held it to the CLI it describes. Now every command and every flag the CLI
 * parses has to appear in it.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { CLI_COMMANDS, CLI_OPTIONS } from "@registry/agent/cli-options";

const readme = readFileSync(new URL("../README.md", import.meta.url), "utf8");

test("the CLI's README names every command and every flag it has", () => {
  const missing = [
    ...CLI_COMMANDS.filter((c) => !readme.includes(`npx echo-ui-cli ${c}`) && !readme.includes(`\`${c}\``)),
    ...Object.keys(CLI_OPTIONS).map((f) => `--${f}`).filter((f) => !readme.includes(f)),
  ];
  assert.deepEqual(missing, []);
});
