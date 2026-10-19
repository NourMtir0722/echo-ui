import { test } from "node:test";
import assert from "node:assert/strict";
import { access, mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { BLOCK_END, BLOCK_START, CURSOR_RULE_PATH, HOOK_COMMAND, SKILL_PATH, STOP_COMMAND, readWrittenBy } from "@registry/agent/guidance";
import { DESIGN_EYE_PATH, DESIGN_EYE_REFERENCE, designEyeSkill } from "@registry/agent/skills/design-eye";
import { echoFoundation } from "@registry/agent/skills/echo-foundation";
import { VERSION } from "./version";

import { addHook, blockTargets, refreshAgentFiles, removeAgentFiles, removeBlock, removeHook, upsertBlock } from "./agent-files";
import { run } from "./index";

/**
 * What `init` writes for agents, and `agent off` taking it back out. The
 * promise is exact: after `init` and `agent off`, CLAUDE.md, AGENTS.md and
 * .claude/ are byte for byte what they were.
 */
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const registryDir = resolve(repoRoot, "apps/www/public/e");
const built = await access(join(registryDir, "index.json")).then(() => true, () => false);
const registry = pathToFileURL(registryDir).href;

async function app(files: Record<string, string> = {}): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "echo-agent-"));
  await writeFile(join(root, "package.json"), JSON.stringify({ name: "fixture", dependencies: { next: "16.3.5", react: "19.0.0" } }));
  await writeFile(join(root, "tsconfig.json"), "{}\n");
  for (const [path, content] of Object.entries(files)) {
    await mkdir(dirname(join(root, path)), { recursive: true });
    await writeFile(join(root, path), content);
  }
  return root;
}

/** Everything that can hold Echo's agent files, as it is on disk. */
async function agentSide(root: string): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  const walk = async (dir: string) => {
    let entries;
    try {
      entries = await readdir(join(root, dir), { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const rel = `${dir}/${e.name}`;
      if (e.isDirectory()) {
        out[`${rel}/`] = "";
        await walk(rel);
      } else out[rel] = await readFile(join(root, rel), "utf8");
    }
  };
  for (const file of ["CLAUDE.md", "AGENTS.md", "DESIGN.md"]) {
    try {
      out[file] = await readFile(join(root, file), "utf8");
    } catch {
      /* not there */
    }
  }
  await walk(".claude");
  await walk(".cursor");
  return out;
}

async function cli(root: string, args: string[]) {
  const lines: string[] = [];
  const saved = { log: console.log, warn: console.warn };
  console.log = (...p: unknown[]) => void lines.push(p.join(" "));
  console.warn = (...p: unknown[]) => void lines.push(p.join(" "));
  try {
    return { code: await run([...args, "--cwd", root, "--registry", registry, "--skip-install"]), text: lines.join("\n") };
  } finally {
    Object.assign(console, saved);
  }
}

const count = (text: string, needle: string) => text.split(needle).length - 1;

test("the block goes where the project's agents will read it", () => {
  assert.deepEqual(blockTargets(undefined, undefined), ["AGENTS.md"]);
  assert.deepEqual(blockTargets("# mine\n", undefined), ["CLAUDE.md"]);
  assert.deepEqual(blockTargets(undefined, "# mine\n"), ["AGENTS.md"]);
  assert.deepEqual(blockTargets("# mine\n", "# theirs\n"), ["CLAUDE.md", "AGENTS.md"]);
  // Next.js writes a CLAUDE.md that imports AGENTS.md: the block once is enough.
  assert.deepEqual(blockTargets("@AGENTS.md\n", "<!-- BEGIN:nextjs-agent-rules -->\n"), ["AGENTS.md"]);
});

test("the block is updated in place, and comes out leaving the file as it was", () => {
  const block = `${BLOCK_START}\nrules\n${BLOCK_END}`;
  const mine = "# My project\n\nSome notes.\n";
  const once = upsertBlock(mine, block);
  assert.equal(upsertBlock(once, block), once, "running twice changes nothing");
  assert.equal(count(upsertBlock(once, `${BLOCK_START}\nnew rules\n${BLOCK_END}`), BLOCK_START), 1, "a new version replaces the old");
  assert.equal(removeBlock(once), mine);
  assert.equal(removeBlock(upsertBlock(undefined, block)), undefined, "a file with nothing else in it goes");
});

test("the hook joins the other hooks, and leaves them when it goes", () => {
  const theirs = `${JSON.stringify({ permissions: { allow: ["Bash(npm test)"] }, hooks: { PostToolUse: [{ matcher: "Write", hooks: [{ type: "command", command: "prettier --write" }] }] } }, null, 2)}\n`;
  const added = addHook(theirs);
  assert.ok(!("error" in added) && added.changed);
  const text = (added as { text: string }).text;
  const settings = JSON.parse(text);
  assert.equal(settings.hooks.PostToolUse.length, 2);
  assert.equal(settings.hooks.PostToolUse[1].hooks[0].command, HOOK_COMMAND);
  assert.deepEqual(settings.permissions, { allow: ["Bash(npm test)"] });
  assert.equal((addHook(text) as { changed: boolean }).changed, false, "running twice adds nothing");
  assert.equal(removeHook(text), theirs);
  assert.equal(removeHook((addHook(undefined) as { text: string }).text), undefined);
  assert.ok("error" in addHook("{ not json"));
});

test("the design tests' Stop gate joins the project's own Stop hooks, once, and leaves them when it goes", () => {
  const theirs = `${JSON.stringify({ hooks: { Stop: [{ hooks: [{ type: "command", command: "say done" }] }] } }, null, 2)}\n`;
  const added = addHook(theirs) as { text: string; changed: boolean };
  assert.ok(added.changed);
  const settings = JSON.parse(added.text);
  assert.deepEqual(settings.hooks.Stop.map((g: { hooks: { command: string }[] }) => g.hooks[0]!.command), ["say done", STOP_COMMAND]);
  assert.ok(settings.hooks.Stop[1].hooks[0].timeout >= 120, "time for the pages it tests");
  assert.equal(settings.hooks.PostToolUse[0].hooks[0].command, HOOK_COMMAND);
  assert.equal((addHook(added.text) as { changed: boolean }).changed, false, "running twice adds nothing");
  assert.equal(removeHook(added.text), theirs);
  // A project that already has the edit hook (set up before the gate existed) gets the gate too.
  const before = `${JSON.stringify({ hooks: { PostToolUse: [{ matcher: "Write|Edit|MultiEdit", hooks: [{ type: "command", command: HOOK_COMMAND }] }] } }, null, 2)}\n`;
  const upgraded = addHook(before) as { text: string; changed: boolean };
  assert.ok(upgraded.changed);
  assert.equal(JSON.parse(upgraded.text).hooks.Stop[0].hooks[0].command, STOP_COMMAND);
  assert.equal(JSON.parse(upgraded.text).hooks.PostToolUse.length, 1);
});

for (const [name, files] of Object.entries({
  "neither file": {},
  "a CLAUDE.md": { "CLAUDE.md": "# House rules\n\nBe kind.\n" },
  "an AGENTS.md": { "AGENTS.md": "# For agents\n" },
  "both files": { "CLAUDE.md": "# Claude\n", "AGENTS.md": "# Agents\n" },
  "Next's layout, CLAUDE.md importing AGENTS.md": {
    "CLAUDE.md": "@AGENTS.md\n",
    "AGENTS.md": "<!-- BEGIN:nextjs-agent-rules -->\n# Next\n<!-- END:nextjs-agent-rules -->\n",
  },
  "settings of its own": { ".claude/settings.json": `${JSON.stringify({ model: "sonnet", hooks: { Stop: [{ hooks: [{ type: "command", command: "say done" }] }] } }, null, 2)}\n` },
})) {
  test(`init then agent off leaves the project as it was: ${name}`, { skip: !built }, async () => {
    const root = await app(files as Record<string, string>);
    try {
      const before = await agentSide(root);
      assert.equal((await cli(root, ["init", "--yes"])).code, 0);
      const during = await agentSide(root);

      // An agent reading this project meets the block once, wherever it looks.
      const claudeSees = during["CLAUDE.md"] !== undefined && !/^@AGENTS\.md/m.test(during["CLAUDE.md"]) ? during["CLAUDE.md"] : during["AGENTS.md"];
      assert.equal(count(claudeSees ?? "", BLOCK_START), 1, "Claude Code sees the block once");
      assert.equal(count(during["AGENTS.md"] ?? during["CLAUDE.md"] ?? "", BLOCK_START), 1);
      assert.ok(during[`.claude/skills/echo-ui/SKILL.md`], "the skill is there");
      assert.equal(JSON.parse(during[".claude/settings.json"]!).hooks.PostToolUse.at(-1).hooks[0].command, HOOK_COMMAND);
      // Nothing of the project's own was lost on the way in.
      for (const [file, text] of Object.entries(before)) if (!file.endsWith("/") && file !== ".claude/settings.json") assert.ok(during[file]!.includes(text.trim()), file);

      // Running init again doesn't duplicate anything.
      await cli(root, ["init", "--yes"]);
      assert.deepEqual(await agentSide(root), during);

      assert.equal((await cli(root, ["agent", "off"])).code, 0);
      assert.deepEqual(await agentSide(root), before);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
}

test("a settings file that isn't JSON is left alone, with the entry to paste", { skip: !built }, async () => {
  const broken = "{ \"hooks\": { oops }\n";
  const root = await app({ ".claude/settings.json": broken });
  try {
    const { code, text } = await cli(root, ["init", "--yes"]);
    assert.equal(code, 0);
    assert.equal(await readFile(join(root, ".claude/settings.json"), "utf8"), broken);
    assert.match(text, /isn't valid JSON/);
    assert.match(text, /echo-ui check --hook/);
    // The block and the skill still went in.
    assert.match(await readFile(join(root, "AGENTS.md"), "utf8"), /echo-ui:start/);
    assert.ok(await readFile(join(root, SKILL_PATH), "utf8"));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("--skip-agent writes none of it; agent on writes it later", { skip: !built }, async () => {
  const root = await app();
  try {
    await cli(root, ["init", "--yes", "--skip-agent"]);
    assert.deepEqual(await agentSide(root), {});
    const on = await cli(root, ["agent", "on"]);
    assert.equal(on.code, 0);
    assert.match(on.text, /Added the Echo block in AGENTS\.md, the Echo block in DESIGN\.md, the check hook and the Stop gate in \.claude\/settings\.json, the echo-ui skill, the echo-design-eye skill, the echo-style-fit skill\./);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("init writes DESIGN.md from the seed, records the seed, and agent off takes it all back", { skip: !built }, async () => {
  const root = await app();
  try {
    const before = await agentSide(root);
    assert.equal((await cli(root, ["init", "--yes", "--seed", "#3D8EF0"])).code, 0);
    const config = JSON.parse(await readFile(join(root, "echo.json"), "utf8"));
    assert.deepEqual(config.seed, { accent: "#3D8EF0" });
    const design = await readFile(join(root, "DESIGN.md"), "utf8");
    assert.ok(design.startsWith(BLOCK_START) && design.trimEnd().endsWith(BLOCK_END));
    assert.match(design, /\| `--echo-accent` \| #3d8ef0 \|/);
    assert.deepEqual(readWrittenBy(design), { version: VERSION, seed: { accent: "#3D8EF0" } });
    assert.match(await readFile(join(root, "AGENTS.md"), "utf8"), /Read `DESIGN\.md`/);
    assert.equal((await cli(root, ["agent", "off"])).code, 0);
    assert.deepEqual(await agentSide(root), before);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("a DESIGN.md of the project's own keeps everything else in it", { skip: !built }, async () => {
  const mine = "# Our brand\n\nWarm, direct, short sentences.\n";
  const root = await app({ "DESIGN.md": mine });
  try {
    await cli(root, ["init", "--yes"]);
    const design = await readFile(join(root, "DESIGN.md"), "utf8");
    assert.ok(design.startsWith(mine), "the project's own words come first, untouched");
    assert.equal(count(design, BLOCK_START), 1);
    await cli(root, ["agent", "off"]);
    assert.equal(await readFile(join(root, "DESIGN.md"), "utf8"), mine);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("Cursor gets a rule only when it wouldn't read the block from AGENTS.md", { skip: !built }, async () => {
  // A Cursor project whose block goes to CLAUDE.md alone.
  const claudeOnly = await app({ "CLAUDE.md": "# Notes\n", ".cursor/mcp.json": "{}\n" });
  // A Cursor project with AGENTS.md: Cursor reads it itself.
  const withAgents = await app({ "AGENTS.md": "# Agents\n", ".cursor/mcp.json": "{}\n" });
  // No Cursor at all.
  const noCursor = await app({ "CLAUDE.md": "# Notes\n" });
  try {
    const before = await agentSide(claudeOnly);
    await cli(claudeOnly, ["init", "--yes"]);
    await cli(withAgents, ["init", "--yes"]);
    await cli(noCursor, ["init", "--yes"]);
    const rule = await readFile(join(claudeOnly, CURSOR_RULE_PATH), "utf8");
    assert.match(rule, /^---\ndescription: .*\nalwaysApply: true\n---\n/);
    assert.ok(rule.includes(BLOCK_START));
    await assert.rejects(readFile(join(withAgents, CURSOR_RULE_PATH), "utf8"));
    await assert.rejects(readFile(join(noCursor, CURSOR_RULE_PATH), "utf8"));
    await cli(claudeOnly, ["agent", "off"]);
    assert.deepEqual(await agentSide(claudeOnly), before, "the rule goes, .cursor/ stays as it was");
  } finally {
    for (const root of [claudeOnly, withAgents, noCursor]) await rm(root, { recursive: true, force: true });
  }
});

test("add and update bring Echo's marked files up to date, and create nothing", async () => {
  const root = await app({ "AGENTS.md": `${BLOCK_START}\nold\n${BLOCK_END}\n`, "DESIGN.md": `${BLOCK_START}\nold\n${BLOCK_END}\n` });
  try {
    const refreshed = await refreshAgentFiles(root, { dir: "src/components/echo", seed: undefined, style: undefined, installed: ["switch"] });
    assert.deepEqual(refreshed, ["agents-block", "design-md"]);
    assert.match(await readFile(join(root, "DESIGN.md"), "utf8"), /Installed here: switch\./);
    await assert.rejects(readFile(join(root, "CLAUDE.md"), "utf8"), "a file without Echo's markers isn't created");
    await assert.rejects(readFile(join(root, SKILL_PATH), "utf8"));
    await assert.rejects(readFile(join(root, DESIGN_EYE_PATH), "utf8"), "a project without Design Eye isn't given it by add");
    assert.deepEqual(await refreshAgentFiles(root, { dir: "src/components/echo", seed: undefined, style: undefined, installed: ["switch"] }), [], "nothing changed, nothing written");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("Design Eye is brought up to date with its reference, and agent off takes both out and leaves no folder behind", async () => {
  const root = await app({ [DESIGN_EYE_PATH]: "an older skill\n", ".claude/skills/mine/SKILL.md": "a skill of the project's own\n" });
  const context = { dir: "src/components/echo", seed: undefined, style: undefined, installed: [] };
  try {
    assert.deepEqual(await refreshAgentFiles(root, context), ["design-eye"]);
    assert.equal(await readFile(join(root, DESIGN_EYE_PATH), "utf8"), designEyeSkill());
    assert.equal(await readFile(join(root, DESIGN_EYE_REFERENCE), "utf8"), echoFoundation(), "the reference the skill points at is there too");
    assert.deepEqual(await refreshAgentFiles(root, context), [], "nothing changed, nothing written");

    const { removed } = await removeAgentFiles(root);
    assert.deepEqual(removed, ["design-eye"]);
    assert.deepEqual(await agentSide(root), {
      ".claude/skills/": "",
      ".claude/skills/mine/": "",
      ".claude/skills/mine/SKILL.md": "a skill of the project's own\n",
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("check says when Echo's agent files are another version's, or DESIGN.md another seed's", { skip: !built }, async () => {
  const root = await app();
  try {
    await cli(root, ["init", "--yes", "--seed", "#3D8EF0"]);
    const agents = await readFile(join(root, "AGENTS.md"), "utf8");
    await writeFile(join(root, "AGENTS.md"), agents.replace(`echo-ui-cli ${VERSION}`, "echo-ui-cli 0.0.1"));
    const config = JSON.parse(await readFile(join(root, "echo.json"), "utf8"));
    await writeFile(join(root, "echo.json"), JSON.stringify({ ...config, seed: { accent: "#F2674E" } }));
    const out = await cli(root, ["check", "--json"]);
    const body = JSON.parse(out.text.slice(out.text.indexOf("{"))) as { info: { kind: string; items: string[]; message: string }[] };
    const files = body.info.filter((i) => i.kind === "agent-files");
    assert.deepEqual(files.map((i) => i.items), [["AGENTS.md"], ["DESIGN.md"]]);
    assert.match(files[0]!.message, /AGENTS\.md was written by another version of echo-ui-cli: `npx echo-ui-cli agent on` writes Echo's part of it again/);
    assert.match(files[1]!.message, /DESIGN\.md describes a different seed/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
