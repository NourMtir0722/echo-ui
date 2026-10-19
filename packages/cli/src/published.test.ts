/**
 * The docs and the hosted MCP server teach `which`, `docs`, `check`,
 * `test`, `style` and `agent`, and `init --style`, while the CLI npm serves is
 * 0.1.0, from 2026-09-20, with `init`, `add`, `list`, `diff` and `update`
 * only. `npx echo-ui-cli which "a toggle"` answers "There's no `which`
 * command", and the hosted server's `wear_style` hands a builder an
 * `init --style` that fails as an unknown option.
 *
 * Two halves, as for echo-ui-core (published-core.md): `published-cli.json`
 * writes down what npm holds, offline, and the production smoke check reads
 * the published manifest's `echoUi.commands` against the docs'. Fixed by the
 * 0.3.0 publish, 2026-10-12.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { CLI_COMMANDS } from "@registry/agent/cli-options";

const read = (path: string) => JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"));
const pkg = read("../package.json") as { echoUi?: { commands?: string[] } };
const published = read("../published-cli.json") as { version: string; commands: string[] };

test("the CLI's package.json declares every command it has, so npm's manifest can say", () => {
  assert.deepEqual(pkg.echoUi?.commands, [...CLI_COMMANDS]);
});

test("the CLI npm serves has every command the docs teach", () => {
  assert.deepEqual(
    CLI_COMMANDS.filter((c) => !published.commands.includes(c)),
    [],
    `npm's echo-ui-cli ${published.version} has only ${published.commands.join(", ")}`,
  );
});
