import { test } from "node:test";
import assert from "node:assert/strict";

import { designEyeSkill } from "@registry/agent/skills/design-eye";
import { echoUiAnywhereSkill } from "@registry/agent/skills/echo-ui-anywhere";
import { styleFitSkill } from "@registry/agent/skills/style-fit";

import { TOOL_DEFINITIONS } from "./tools";

/**
 * The plugin's skills send a model in a chat to this server's tools by name.
 * A name that isn't a tool is a step the model can't take, and nothing else
 * would notice: the skills live in the registry, the tools here.
 */
const skills = {
  "echo-ui": echoUiAnywhereSkill(),
  "echo-design-eye": designEyeSkill({ anywhere: true }),
  "echo-style-fit": styleFitSkill({ anywhere: true }),
};

/** Backticked snake_case words: how the skills write a tool's name. */
const named = (skill: string) => new Set([...skill.matchAll(/`([a-z]+(?:_[a-z]+)+)`/g)].map((m) => m[1]!));

test("every tool a plugin skill names is one this server has", () => {
  const tools = new Set(Object.keys(TOOL_DEFINITIONS));
  for (const [name, skill] of Object.entries(skills)) {
    const unknown = [...named(skill)].filter((tool) => !tools.has(tool));
    assert.deepEqual(unknown, [], `${name} names tools the server doesn't have`);
  }
});

test("every style tool is named by a skill that tells a model when to use it", () => {
  const all = new Set(Object.values(skills).flatMap((skill) => [...named(skill)]));
  for (const tool of ["list_styles", "fit_styles", "check_style", "wear_style", "search_components", "get_component", "check_code"]) {
    assert.ok(all.has(tool), `no plugin skill names ${tool}`);
  }
});
