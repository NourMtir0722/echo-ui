import { test } from "node:test";
import assert from "node:assert/strict";
import { ECHO_CLI, projectBlock } from "@registry/agent/guidance";
import { anchorsMarkdown } from "@registry/agent/skills/axes";
import { DESIGN_EYE_PATH } from "@registry/agent/skills/design-eye";
import { STYLE_FIT_PATH, styleFitSkill } from "@registry/agent/skills/style-fit";

import { OPTIONS } from "./index";

/**
 * Style Fit tells an agent what to type, like Design Eye does: every command
 * and flag it names has to be one the CLI has, or the agent is stuck halfway
 * through choosing a look.
 */
const skill = styleFitSkill();

test("every command Style Fit gives is one the CLI has", () => {
  const lines = [...skill.matchAll(new RegExp(`npx ${ECHO_CLI} ([a-z-]+)(?: ([a-z-]+))?`, "g"))];
  for (const [line, command, action] of lines) {
    assert.equal(command, "style", line);
    assert.ok(["list", "show", "fit", "use"].includes(action!), `${line}: style has no "${action}"`);
  }
  // List both libraries, show one, measure them all, wear the pick.
  assert.deepEqual([...new Set(lines.map((m) => m[2]))].sort(), ["fit", "list", "show", "use"]);
});

test("every flag Style Fit uses is one the CLI parses", () => {
  const flags = [...new Set([...skill.matchAll(/(?<![\w-])--([a-z][a-z-]*)/g)].map((m) => m[1]!))];
  assert.ok(flags.includes("profile") && flags.includes("tolerance"), flags.join(", "));
  for (const flag of flags) assert.ok(flag in OPTIONS, `--${flag} isn't an option the CLI takes`);
});

test("Style Fit places a product with the same anchors Design Eye places a style with", () => {
  assert.ok(skill.includes(anchorsMarkdown()));
});

test("the block every agent reads points at both style skills, where init writes them", () => {
  const block = projectBlock("components/echo");
  assert.ok(block.includes(DESIGN_EYE_PATH), "Design Eye's path");
  assert.ok(block.includes(STYLE_FIT_PATH), "Style Fit's path");
});

/*
 * From the Paperlab run (2026-10-05): an August decision for the same product
 * held "the chrome must be darker than the artwork", a dark style's answer.
 * Style Fit carried it into a light style's reading as a hard constraint,
 * nobody asked, and it made a grey frame around a white sheet look required.
 */
test("Style Fit reads an earlier decision for the product as questions, never as hard constraints", () => {
  const skill = styleFitSkill();
  assert.match(skill, /An earlier decision for the same product/);
  assert.match(skill, /carry each of its constraints as a question, never straight into HARD CONSTRAINTS/);
  assert.match(skill, /write it as the need/);
  assert.match(skill, /<product>-direction-<yyyy-mm-dd>\.md/);
  assert.match(skill, /Each one is a need, said so any style can meet it/);
});
