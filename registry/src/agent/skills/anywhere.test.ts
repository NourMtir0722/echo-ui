import { test } from "node:test";
import assert from "node:assert/strict";

import { designEyeSkill } from "./design-eye";
import { echoUiAnywhereSkill } from "./echo-ui-anywhere";
import { styleFitSkill } from "./style-fit";

/**
 * The plugin's copies of Echo's skills, which run in a chat as well as a
 * project. A copy is the project's skill plus one section that says what each
 * step becomes in a chat, so the two can't teach different rules.
 */
const frontmatter = (skill: string) => {
  const m = /^---\nname: ([^\n]+)\ndescription: ([^\n]+)\n---\n/.exec(skill);
  assert.ok(m, "the skill opens with its name and description");
  return { name: m[1]!, description: m[2]! };
};

/** The skill without its frontmatter and its chat section. */
const body = (skill: string) =>
  skill
    .replace(/^---\n[\s\S]*?\n---\n/, "")
    .replace(/## Where you are\n[\s\S]*?\n(?=## )/, "");

for (const [name, project, anywhere] of [
  ["Design Eye", designEyeSkill(), designEyeSkill({ anywhere: true })],
  ["Style Fit", styleFitSkill(), styleFitSkill({ anywhere: true })],
] as const) {
  test(`${name}: the plugin's copy is the project's skill and a chat section, nothing else`, () => {
    assert.equal(frontmatter(anywhere).name, frontmatter(project).name);
    assert.doesNotMatch(project, /## Where you are/, "a project's copy has no chat section");
    assert.match(anywhere, /## Where you are\n/);
    assert.equal(body(anywhere), body(project));
  });

  test(`${name}: the plugin's copy says what each command becomes in a chat`, () => {
    const section = /## Where you are\n([\s\S]*?)\n## /.exec(anywhere)![1]!;
    // Every command the skill gives in a project has its row: a step a chat can't take is a dead end.
    const commands = new Set([...body(project).matchAll(/`npx echo-ui-cli style (\w+)/g)].map((m) => m[1]));
    for (const command of commands) assert.match(section, new RegExp(`\`npx echo-ui-cli style ${command}`), `style ${command} has no chat row`);
    assert.match(section, /In a chat/);
  });

  /*
   * Claude's directory policy: software "must not query or extract data from
   * Claude's memory, chat history, conversation summaries, or user-generated
   * or uploaded files". So in a chat, the builder's styles are the ones they
   * hand over, never files the skill goes looking for in the chat's project.
   */
  test(`${name}: in a chat, the builder's styles are the ones they share, not files the skill goes looking for`, () => {
    const section = /## Where you are\n([\s\S]*?)\n## /.exec(anywhere)![1]!;
    assert.doesNotMatch(section, /shared here or in this chat's project/);
    assert.match(section, /shares? or points? you to/);
  });
}

test("the plugin's Echo UI skill routes: a project with Echo follows its own skill, one without runs init, a chat stays", () => {
  const skill = echoUiAnywhereSkill();
  assert.equal(frontmatter(skill).name, "echo-ui");
  assert.match(skill, /A project with Echo\*\* \(an `echo\.json` at its root\): the project's own Echo skill leads/);
  assert.match(skill, /`npx echo-ui-cli init --style <name>`/);
  assert.match(skill, /`check_code`/);
  // The handoff ends a chat's work with the commands that bring it into a project.
  assert.match(skill, /\*\*The handoff\.\*\*.*`npx echo-ui-cli init --style <name>`.*`npx echo-ui-cli add <name>`/);
});

test("every plugin skill fits the Agent Skills limits: a short name, a description under 1,024 characters, a file under 256 KiB", () => {
  for (const skill of [designEyeSkill({ anywhere: true }), styleFitSkill({ anywhere: true }), echoUiAnywhereSkill()]) {
    const { name, description } = frontmatter(skill);
    assert.match(name, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.ok(name.length <= 64, name);
    assert.ok(description.length <= 1024, `${name}: ${description.length} characters`);
    // Claude's directory holds a file over 256 KiB for a reviewer.
    assert.ok(Buffer.byteLength(skill) < 256 * 1024, `${name}: ${Buffer.byteLength(skill)} bytes`);
  }
});
