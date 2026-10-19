import { test } from "node:test";
import assert from "node:assert/strict";
import { PAGE_SCREEN_RULES } from "echo-ui-core/check";

import { SCREEN_RULES } from "./screen-rules";

/**
 * The running-page check in echo-ui-core quotes screen rules by number and
 * name, as `check` does. Core can't import the registry, so it keeps the
 * names it quotes, and this holds them to the rules: every rule only a
 * rendered page shows has a page check, and every name the page check says is
 * the rule's own.
 */
test("every screen rule only a rendered page shows has a page check, under the rule's own name", () => {
  const checked = Object.keys(PAGE_SCREEN_RULES).map(Number);
  for (const rule of SCREEN_RULES.filter((r) => r.seenBy === "render")) {
    assert.ok(checked.includes(rule.n), `screen rule ${rule.n} needs a render, and the page check doesn't look for it`);
  }
  for (const [n, name] of Object.entries(PAGE_SCREEN_RULES)) {
    assert.equal(SCREEN_RULES.find((r) => r.n === Number(n))?.name, name, `the page check calls rule ${n} "${name}"`);
  }
});
