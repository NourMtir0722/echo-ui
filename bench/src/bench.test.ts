import { test } from "node:test";
import assert from "node:assert/strict";

import { defaultsFrom, initProblems, type InitEvent } from "./agent/init-event";
import { agentArgs } from "./agent/run-agent";
import { runEnvironment, sandboxSettings } from "./config";
import type { RunRecord } from "./record";
import { failureRows, summaryTable } from "./report";
import { TASKS } from "./tasks";

const init = (over: Partial<InitEvent> = {}): InitEvent => ({
  type: "system",
  subtype: "init",
  model: "claude-sonnet-5",
  tools: ["Bash", "Edit", "Read", "Write"],
  mcp_servers: [],
  skills: ["debug", "simplify"],
  agents: ["Explore"],
  plugins: [{ name: "telemetry", path: "builtin", source: "telemetry@builtin" }],
  apiKeySource: "none",
  claude_code_version: "2.1.280",
  ...over,
});

test("a run whose agent had anything beyond the defaults is refused, and says what", () => {
  const defaults = defaultsFrom(init());
  assert.deepEqual(initProblems(init(), defaults, "claude-sonnet-5", []), []);
  // The app's own skill is expected; anything else is the machine leaking in.
  assert.deepEqual(initProblems(init({ skills: ["debug", "simplify", "echo-ui"] }), defaults, "claude-sonnet-5", ["echo-ui"]), []);
  assert.deepEqual(
    initProblems(
      init({
        model: "claude-opus-5-5",
        mcp_servers: [{ name: "figma" }],
        skills: ["debug", "founder-profile"],
        plugins: [{ name: "wonder", path: "/Users/x/.claude/plugins/wonder", source: "wonder@market" }],
        apiKeySource: "ANTHROPIC_API_KEY",
      }),
      defaults,
      "claude-sonnet-5",
      [],
    ),
    [
      "model is claude-opus-5-5, not the pinned claude-sonnet-5",
      "MCP servers: figma",
      "authenticated with ANTHROPIC_API_KEY, not the account login",
      "plugins beyond the defaults: wonder@market",
      "skills beyond the defaults and the app's own: founder-profile",
    ],
  );
});

test("a run never inherits the launching session's key, effort or sockets", () => {
  const env = runEnvironment({
    PATH: "/bin",
    HOME: "/home/x",
    ANTHROPIC_API_KEY: "sk-secret",
    CLAUDECODE: "1",
    CLAUDE_EFFORT: "high",
    CLAUDE_CODE_SESSION_ID: "abc",
    MCP_CONNECTION_NONBLOCKING: "1",
  });
  assert.deepEqual(env, { PATH: "/bin", HOME: "/home/x", NEXT_TELEMETRY_DISABLED: "1" });
  // A run's own server defaults to its own port, never whatever runs on 3000.
  assert.equal(runEnvironment({}, 5401).PORT, "5401");
});

/**
 * The first run without a sandbox searched the disk, listed the notes folder
 * and killed a dev server it hadn't started. Every run is sandboxed now, and
 * one that can't be doesn't start.
 */
test("every run is sandboxed: no home folder, no escape, no signals", () => {
  const args = agentArgs("do it", "claude-sonnet-5", ["/repo/apps/www/public/e"]);
  const settings = JSON.parse(args[args.indexOf("--settings") + 1]!) as ReturnType<typeof sandboxSettings>;
  assert.equal(settings.sandbox.enabled, true);
  assert.equal(settings.sandbox.failIfUnavailable, true);
  assert.equal(settings.sandbox.allowUnsandboxedCommands, false);
  assert.deepEqual(settings.sandbox.filesystem.denyRead, ["~/"]);
  assert.ok(settings.sandbox.filesystem.allowRead.includes("/repo/apps/www/public/e"));
  assert.ok(!settings.sandbox.filesystem.allowRead.some((p) => /Documents/.test(p)));
  for (const rule of ["Read(~/**)", "Bash(kill:*)", "Bash(pkill:*)", "Bash(killall:*)"]) {
    assert.ok(settings.permissions.deny.includes(rule), rule);
  }
  // Bash is never allowed wholesale: shell commands run because they're sandboxed.
  assert.ok(!args.includes("--allowedTools"));
});

test("every run leaves the machine's settings and MCP servers out, and keeps the app's", () => {
  const args = agentArgs("do it", "claude-sonnet-5");
  const flag = (name: string) => args[args.indexOf(name) + 1];
  assert.equal(flag("--setting-sources"), "project,local");
  assert.ok(args.includes("--strict-mcp-config"));
  assert.equal(flag("--model"), "claude-sonnet-5");
  assert.equal(flag("--output-format"), "stream-json");
  assert.ok(!args.includes("--mcp-config"));
});

test("the prompts never name a library, so every setup gets the same words", () => {
  for (const task of TASKS) {
    assert.doesNotMatch(task.prompt, /echo|tailwind|radix|base ui|component library/i, task.id);
    assert.match(task.prompt, new RegExp(task.route.replace("/", "\\/")), `${task.id} names its route`);
  }
});

const record = (over: Partial<RunRecord>): RunRecord => ({
  label: "t",
  setup: "echo",
  task: "settings",
  run: 1,
  model: "claude-sonnet-5",
  startedAt: "",
  app: { setup: "echo", preparedAt: "", echo: { source: "npm", dir: "components/echo", registry: "", catalog: "" } },
  agent: { wallMs: 120000, costUsd: 1, turns: 10, tokens: { input: 1000, output: 1000, cacheCreation: 0, cacheRead: 0 } },
  mistakes: { colour: 1, lookalike: 2, "echo-class": 0, prop: 0, name: 0 },
  findings: [
    { rule: "lookalike", file: "a.tsx", line: 3, message: "<button> where Echo has hardware-button" },
    { rule: "colour", file: "a.css", line: 1, message: "#fff" },
  ],
  typeErrors: 0,
  built: true,
  pages: [{ route: "/settings", status: 200, consoleErrors: [], axe: { "button-name": { impact: "critical", nodes: 2, help: "Buttons must have discernible text" } } }],
  ...over,
});

test("the failure list ranks by runs first, then by how often", () => {
  const rows = failureRows([record({ run: 1 }), record({ run: 2, findings: [], pages: [] })]);
  assert.deepEqual(
    rows.map((r) => [r.what, r.runs, r.occurrences]),
    [
      ["axe button-name: Buttons must have discernible text", 1, 2],
      ["colour: a colour written as a literal", 1, 1],
      ["lookalike: <button> where Echo has hardware-button", 1, 1],
    ],
  );
});

test("the summary shows Echo's own rules only for an Echo app", () => {
  const table = summaryTable([record({}), record({ setup: "default", app: { setup: "default", preparedAt: "" } })]);
  const [, , echoRow, defaultRow] = table.split("\n");
  assert.match(echoRow!, /\| echo \| settings \| 1 \| 2k \| \$1 \| 10 \| 2 \| 1 \| 2 \| 0 \| 0 \| 0 \| 0 \| 1\/1 \| 2 \|/);
  assert.match(defaultRow!, /\| default \| settings \| 1 \| .* \| 1 \| — \| — \| — \| — \| 0 \| 1\/1 \| 2 \|/);
});

/**
 * The work folder was `echo-bench` in the temp folder: a fixed name
 * that anyone on a shared machine could create first, or point somewhere with a
 * link, and be handed the apps and the agent's work. It's made with mkdtemp now,
 * open to this user alone, and remembered.
 */
test("the benchmark works in a folder of its own, private to this user, in the temp folder", async () => {
  const { WORK_DIR, isPrivateDir } = await import("./config");
  if (process.env.ECHO_BENCH_WORK) return;
  const { tmpdir } = await import("node:os");
  const { realpathSync } = await import("node:fs");
  assert.match(WORK_DIR, /echo-bench-[A-Za-z0-9]{6}$/);
  assert.ok(realpathSync(WORK_DIR).startsWith(realpathSync(tmpdir())), WORK_DIR);
  assert.ok(isPrivateDir(WORK_DIR), `${WORK_DIR} is open to others, or isn't a folder of its own`);
});
