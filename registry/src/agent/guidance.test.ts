import { test } from "node:test";
import assert from "node:assert/strict";

import { ALL_METAS } from "./metas";
import {
  ACCESSIBILITY_SHORT,
  AGENT_INSTRUCTIONS,
  ACCESSIBILITY_INSTRUCTIONS,
  BLOCK_END,
  BLOCK_START,
  REFERENCE_SCREENS,
  SKILL_PATH,
  projectBlock,
  skillFile,
  ECHO_BIN,
  HOOK_COMMAND,
  OWNERSHIP,
  PROJECT_SETUP,
  THEME_SETUP,
  UPGRADES,
  installCommand,
  runCommand,
} from "./guidance";

/**
 * The agent brief carries the accessibility rules.
 *
 * Echo's audience includes designers who build through an agent and never read
 * the docs, so what the MCP server and llms.txt say IS the documentation for
 * them. The brief used to say nothing about names, forms or announcements.
 */
test("the agent brief tells a model how to use Echo accessibly", () => {
  const missing = [
    ["a name on every control", /aria-label/],
    ["the visible label on text fields", /visible `label`/],
    ["icon-only buttons", /iconOnly/],
    ["form errors", /`error`/],
    ["announcements through the toaster", /Toaster/],
    ["autocomplete on sign-in fields", /autoComplete/],
    ["state never carried by colour alone", /colour alone/],
  ].filter(([, pattern]) => !(pattern as RegExp).test(ACCESSIBILITY_INSTRUCTIONS));
  assert.deepEqual(missing.map(([what]) => what), []);
});

test("the accessibility rules are part of the brief a model is given", () => {
  assert.ok(
    AGENT_INSTRUCTIONS.includes(ACCESSIBILITY_INSTRUCTIONS),
    "AGENT_INSTRUCTIONS no longer carries the accessibility rules",
  );
});

/**
 * One way to run the CLI. What anyone types is `npx echo-ui-cli <command>`;
 * the hook runs the installed file by path. A bare `echo-ui` is on no shell's
 * PATH, and `npx echo-ui` names a different package.
 */
test("the run command and the hook command come from one place", () => {
  assert.equal(runCommand('which "a settings toggle"'), 'npx echo-ui-cli which "a settings toggle"');
  assert.equal(runCommand("add tabs", "pnpm dlx echo-ui-cli"), "pnpm dlx echo-ui-cli add tabs");
  assert.equal(installCommand("echo-tabs"), runCommand("add tabs"));
  assert.equal(HOOK_COMMAND, '"$CLAUDE_PROJECT_DIR"/node_modules/.bin/echo-ui check --hook');
  assert.equal(ECHO_BIN, "echo-ui");
});

/** A bare command, as someone would type it: `echo-ui add`, not `npx echo-ui-cli add` or `.bin/echo-ui check`. */
const BARE_COMMAND = /(?<![\w./"-])echo-ui (init|add|list|diff|update|which|docs|check|remove)\b/;

test("nothing an agent reads tells it to type a bare echo-ui", () => {
  for (const [name, text] of Object.entries({ AGENT_INSTRUCTIONS, PROJECT_SETUP, UPGRADES, OWNERSHIP, THEME_SETUP })) {
    assert.doesNotMatch(text, BARE_COMMAND, name);
  }
  assert.match("npx echo-ui-cli add tabs", /echo-ui-cli add/);
  assert.doesNotMatch("npx echo-ui-cli add tabs", BARE_COMMAND);
  assert.doesNotMatch(HOOK_COMMAND, BARE_COMMAND);
  assert.match("run echo-ui update", BARE_COMMAND);
});

/**
 * The Echo block loads into every conversation in an Echo project, so it has
 * to be short, and say the things an agent can't find out on its own: the
 * exact package names, how to ask, how to style, the accessibility floor, the
 * check. The skill carries the procedures.
 */
test("the Echo block is short, and says what an agent can't find out alone", () => {
  const block = projectBlock("components/echo");
  assert.ok(block.startsWith(BLOCK_START) && block.endsWith(BLOCK_END), "marked at both ends");
  assert.ok(block.length < 2000, `the block is ${block.length} characters; it loads into every conversation`);
  for (const must of ["echo-ui-cli", "echo-ui-core", "var(--echo-*)", "npx echo-ui-cli which", "npx echo-ui-cli docs", "npx echo-ui-cli check", "components/echo", SKILL_PATH]) {
    assert.ok(block.includes(must), `the block names ${must}`);
  }
  assert.match(block, /no `echo-ui` or `echoui` package/);
  assert.doesNotMatch(block, BARE_COMMAND);
  assert.doesNotMatch(skillFile("components/echo"), BARE_COMMAND);
});

test("the block's accessibility rules are the long ones, shortened", () => {
  const pairs: [RegExp, RegExp][] = [
    [/aria-label/, /aria-label/],
    [/`error`/, /`error`/],
    [/useToast/, /useToast/],
    [/focus ring/, /focus ring/],
    [/24×24px/, /24×24px/],
    [/aria-hidden/, /aria-hidden/],
  ];
  for (const [short, long] of pairs) {
    assert.ok(ACCESSIBILITY_SHORT.some((rule) => short.test(rule)), `short rules say ${short}`);
    assert.match(ACCESSIBILITY_INSTRUCTIONS, long);
  }
});

test("the skill sends a screen-builder to reference screens that exist", () => {
  const names = new Set<string>(ALL_METAS.map((m) => m.name));
  for (const screen of REFERENCE_SCREENS) {
    assert.ok(names.has(`echo-${screen.item}`), `${screen.item} is a registry item`);
    assert.ok(skillFile("components/echo").includes(`npx echo-ui-cli docs ${screen.item}`));
  }
  assert.match(skillFile("x"), /^---\nname: echo-ui\ndescription: .+\n---\n/);
});
