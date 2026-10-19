import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createEchoTheme } from "echo-ui-core/theme";
import { ECHO_CLI } from "@registry/agent/guidance";
import { anchorsMarkdown } from "@registry/agent/skills/axes";
import { designEyeSkill } from "@registry/agent/skills/design-eye";
import { echoFoundation } from "@registry/agent/skills/echo-foundation";
import { AXES, parseStyle, styleSchema, type Axis } from "@registry/agent/style-schema";

import { OPTIONS, run } from "./index";

/**
 * Design Eye tells an agent what to type and what to write. Everything it
 * names has to exist: a command or a flag the CLI doesn't have is an agent
 * stuck in the middle of reading a moodboard, and a seed key the schema
 * doesn't know is a style `style check` refuses.
 */
const skill = designEyeSkill();
const reference = echoFoundation();
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

const COMMANDS = ["init", "add", "which", "docs", "check", "style", "agent", "list", "diff", "update"];
const STYLE_ACTIONS = ["list", "use", "check", "sample"];

/** The ```json block after a line containing `after`. */
function jsonBlock(text: string, after: string): unknown {
  const from = text.indexOf(after);
  assert.ok(from >= 0, `no "${after}"`);
  const m = /```json\n([\s\S]*?)\n```/.exec(text.slice(from));
  assert.ok(m, `no json block after "${after}"`);
  return JSON.parse(m[1]!);
}

test("every command the skill and its reference give is one the CLI has", () => {
  const lines = [...`${skill}\n${reference}`.matchAll(new RegExp(`npx ${ECHO_CLI} ([a-z-]+)(?: ([a-z-]+))?`, "g"))];
  for (const [line, command, action] of lines) {
    assert.ok(COMMANDS.includes(command!), `${line}: no command "${command}"`);
    if (command === "style") assert.ok(STYLE_ACTIONS.includes(action!), `${line}: style has no "${action}"`);
  }
  // Sample the board, check the style, find the library, wear it.
  assert.deepEqual([...new Set(lines.filter((m) => m[1] === "style").map((m) => m[2]))].sort(), ["check", "list", "sample", "use"]);
});

test("every flag the skill uses is one the CLI parses", () => {
  const flags = [...new Set([...skill.matchAll(/(?<![\w-])--([a-z][a-z-]*)/g)].map((m) => m[1]!))];
  // `--echo-*` are the theme's custom properties, not flags.
  const used = flags.filter((f) => !f.startsWith("echo-"));
  assert.ok(used.includes("region") && used.includes("crop"), used.join(", "));
  for (const flag of used) assert.ok(flag in OPTIONS, `--${flag} isn't an option the CLI takes`);
});

test("every theme token the reference names is one the theme writes", () => {
  const { css } = createEchoTheme(undefined, { quiet: true });
  const tokens = [...new Set([...reference.matchAll(/--echo-[a-z0-9-]+/g)].map((m) => m[0]))];
  assert.ok(tokens.length > 10);
  for (const token of tokens) assert.ok(css.includes(`${token}:`), `${token} isn't in the theme`);
});

test("the example style.json is one Echo can apply, and every seed key the skill names is in the schema", () => {
  const example = parseStyle(jsonBlock(skill, "Write `style.json` beside the document"));
  assert.deepEqual(example.problems, []);
  const seed = ((styleSchema().properties as Record<string, { properties?: Record<string, unknown> }>).seed!.properties ?? {}) as Record<string, unknown>;
  const table = skill.slice(skill.indexOf("| `seed` | Read it from |"), skill.indexOf("**Fonts.**"));
  const named = [...table.matchAll(/`([a-zA-Z]+)`/g)].map((m) => m[1]!).filter((k) => k !== "seed" && !["compact", "default", "comfortable", "molded", "drawn"].includes(k));
  assert.ok(named.length >= 10, named.join(", "));
  for (const key of named) assert.ok(key in seed, `the skill reads a seed key "${key}" the schema doesn't have`);
});

test("the fit profile's axes are the schema's, word for word, with the anchors", () => {
  for (const axis of Object.keys(AXES) as Axis[]) {
    const [low, high] = AXES[axis];
    const name = `${axis[0]!.toUpperCase()}${axis.slice(1)}`;
    assert.match(skill, new RegExp(`\\| ${name} +\\| ${low} ←→ ${high} +\\| n \\|`), `${name} in the template`);
  }
  assert.ok(skill.includes(anchorsMarkdown()));
});

/**
 * The skill told the agent to note what `style check` says the theme
 * corrects, for every style, while the check said only that a light body
 * waits; most boards are light, so the first agent to run the skill measured
 * light styles on the dark device instead. The skill asks only for what the
 * check reports, and with the light device the check reports on every body.
 */
test("the skill asks for what style check reports, and the check reports on a light body too", async () => {
  const check = skill.slice(skill.indexOf("Then check it"), skill.indexOf("**CLOSING.**"));
  assert.match(check, /which device the style makes/);
  assert.doesNotMatch(check, /waits for|light device ships/);
  const dir = await mkdtemp(join(tmpdir(), "echo-bug-161-"));
  try {
    const light = { version: 1, name: "chalk", title: "Chalk", essence: "Pale paper.", fingerprint: { warmth: 2, volume: 2, density: 2, formality: 4, era: 3, craft: 5, ornament: 2 }, seed: { accent: "#0594F9", chassis: "#EBEBEB", paper: "#1D1D1D" } };
    await writeFile(join(dir, "style.json"), JSON.stringify(light));
    const lines: string[] = [];
    const log = console.log;
    console.log = (...parts: unknown[]) => void lines.push(parts.join(" "));
    try {
      assert.equal(await run(["style", "check", dir, "--json"]), 0);
    } finally {
      console.log = log;
    }
    const json = JSON.parse(lines.join("\n").slice(lines.join("\n").indexOf("{")));
    assert.equal(json.device, "light");
    assert.ok(Array.isArray(json.report.corrected), "a light body gets the theme's report");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("the reference is Echo's own style as `style use echo` applies it", () => {
  const echo = JSON.parse(readFileSync(resolve(repoRoot, "registry/styles/echo.json"), "utf8"));
  assert.deepEqual(jsonBlock(reference, "Its `style.json`"), echo);
  assert.ok(skill.includes("references/echo.md"), "the skill points at the reference");
});

/*
 * From a moodboard read for Paperlab (2026-10-05): the accent came from one
 * acid tile of ten, the other nine black ink on paper, and the builder was
 * never asked. And an outlined board came out molded, because the skill
 * filed outlines under refusals. These are the rules that stop both.
 */
test("Design Eye asks before it writes: the colour by count of tiles, the tiles that don't fit, the open reading", () => {
  const ask = skill.indexOf("## Read the board, then ask, before you write the style");
  const write = skill.indexOf("## The foundation document");
  assert.ok(ask > 0 && ask < write, "the stop comes before the document is written");
  const section = skill.slice(ask, write);
  assert.match(section, /one message, at most three questions/);
  assert.match(section, /counted in tiles, not in how loud a tile is/);
  assert.match(section, /none \(black and white\)/);
  assert.match(section, /Never take the accent from a single tile/);
  assert.match(section, /The tiles that don't fit/);
  assert.match(section, /BUILDER'S ANSWERS/);
  // The accent is the builder's answer, not the loudest swatch.
  assert.match(skill, /\| `accent` \| the builder's answer to the colour question/);
});

test("Design Eye reads outlined, hollow parts as render drawn, never as a refusal", () => {
  assert.match(skill, /How a part is rendered is not the grammar/);
  assert.match(skill, /\| `render` \|/);
  assert.match(skill, /Before you refuse/);
  assert.doesNotMatch(skill, /parts are molded and lit, and caps travel when pressed/);
  assert.match(reference, /outlined, hollow parts in one ink[^|]*\| a setting \|/);
});
