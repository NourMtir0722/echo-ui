/**
 * The Release workflow couldn't release a new echo-ui-core. Its
 * checks run `pnpm test` with the workspace already at the version being
 * released and, by its own rule, `published-core.json` still at the old one
 * (it refuses to run if the pin says the new version first). Since
 * `CLI_RELEASED` flipped on 2026-09-21, the core gate in
 * core-version.test.ts fails exactly then: "every /e/ item declares
 * echo-ui-core ^0.3.0 and npm's published version is 0.2.0". Each rule was
 * right alone; together the button could never be pressed.
 *
 * The workflow publishes after its checks and deploys only after the publish,
 * so in its own run the core it names is the one about to exist. It says so
 * (`ECHO_RELEASING`), and the gate lets exactly that version through.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { coreGateProblem } from "./core-gate";

test("the release run passes the gate for the core it's about to publish", () => {
  assert.equal(coreGateProblem({ workspace: "0.3.0", published: "0.2.0", released: true, releasing: "0.3.0" }), undefined);
});

test("and only that core: a bump nobody is releasing still fails the gate", () => {
  assert.ok(coreGateProblem({ workspace: "0.3.0", published: "0.2.0", released: true }));
  assert.ok(coreGateProblem({ workspace: "0.3.0", published: "0.2.0", released: true, releasing: "0.4.0" }));
});

test("the gate passes when npm has what the workspace declares, and waits while Echo isn't released", () => {
  assert.equal(coreGateProblem({ workspace: "0.2.0", published: "0.2.0", released: true }), undefined);
  assert.equal(coreGateProblem({ workspace: "0.3.0", published: "0.2.0", released: false }), undefined);
});
