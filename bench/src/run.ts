/**
 * One run, end to end: a copy of the setup's app, the agent on the task, then
 * everything measured and saved to the results folder.
 */
import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { initProblems, type Defaults } from "./agent/init-event";
import { runAgent } from "./agent/run-agent";
import { RESULTS_DIR, WORK_DIR } from "./config";
import { repoRoot } from "../../scripts/matrix/fresh-app.mjs";
import type { RunRecord } from "./record";
import { isAdded, parseAddedLines, type AddedLines } from "./score/added-lines";
import { capture, typecheckAndBuild } from "./score/build";
import { countMistakes, tally, type CatalogLike } from "./score/count";
import { wornLook } from "./score/look";
import { scorePages } from "./score/pages";
import { cloneApp, projectSkills, type AppFacts } from "./setups";
import type { Task } from "./tasks";

export interface RunSpec {
  label: string;
  setup: string;
  task: Task;
  run: number;
  model: string;
  template: string;
  facts: AppFacts;
  defaults: Defaults;
  /** A free port for serving this run's app. */
  port: number;
}

export const runDir = (spec: Pick<RunSpec, "label" | "setup" | "run"> & { task: string }) =>
  join(RESULTS_DIR, spec.label, spec.setup, spec.task, `run-${spec.run}`);

async function loadCatalog(source: string): Promise<CatalogLike> {
  const text = /^https?:/.test(source) ? await (await fetch(source)).text() : await readFile(source, "utf8");
  return JSON.parse(text) as CatalogLike;
}

/** A local registry build the app reads over file:, which the sandbox must let it read. */
function localRegistry(facts: AppFacts): string[] {
  if (facts.echo?.source !== "local") return [];
  return [join(repoRoot, "apps/www/public/e"), join(repoRoot, "apps/www/public/r")];
}

/** Copies the app's source for later re-scoring: no dependencies, no build, no history. */
async function saveSource(app: string, to: string): Promise<void> {
  await cp(app, to, {
    recursive: true,
    filter: (src) => !/[/\\](node_modules|\.next|\.git)([/\\]|$)/.test(src.slice(app.length)),
  });
}

/**
 * What the app's own `echo-ui check` says about the agent's lines, or null
 * when its CLI has no check (every Echo before the check shipped).
 */
export async function echoCheck(app: string, added: AddedLines, out: string, cli = join(app, "node_modules", ".bin", "echo-ui")) {
  const result = await capture(cli, ["check", "--json", "--cwd", app], app);
  let parsed: { findings?: { rule: string; file: string; line: number }[] };
  try {
    parsed = JSON.parse(result.output.slice(result.output.indexOf("{")));
  } catch {
    return null;
  }
  if (!parsed.findings) return null;
  const mine = parsed.findings.filter((f) => isAdded(added, f.file, f.line));
  await writeFile(join(out, "check.json"), `${JSON.stringify(mine, null, 2)}\n`);
  const byRule: Record<string, number> = {};
  for (const f of mine) byRule[f.rule] = (byRule[f.rule] ?? 0) + 1;
  return { findings: mine.length, byRule };
}

/**
 * Measures an app the agent has finished with. The diff, the benchmark's own
 * count and Echo's check read source only, so they also run on a saved copy;
 * the build and the pages need the app with its dependencies.
 */
export async function scoreApp(app: string, out: string, facts: AppFacts, port: number) {
  await capture("git", ["add", "-A"], app);
  const diff = await capture("git", ["diff", "--cached", "HEAD", "--", ".", ":(exclude)package-lock.json"], app);
  await writeFile(join(out, "diff.patch"), diff.output);
  const added = parseAddedLines(diff.output);

  const echo = facts.echo ? { dir: facts.echo.dir, catalog: await loadCatalog(facts.echo.catalog) } : undefined;
  const findings = await countMistakes(app, added, echo);

  // Echo's own check, when the installed CLI has one: the same saved apps
  // scored twice, by two independent counters.
  let check: RunRecord["check"] = null;
  if (facts.echo) check = await echoCheck(app, added, out);

  const build = await typecheckAndBuild(app);
  await writeFile(join(out, "tsc.txt"), build.typeOutput);
  await writeFile(join(out, "build.txt"), build.buildOutput);
  const shots = join(out, "shots");
  await mkdir(shots, { recursive: true });
  const pages = build.built ? await scorePages(app, port, shots, facts.echo ? await wornLook(app) : null) : [];
  await writeFile(join(out, "pages.json"), `${JSON.stringify(pages, null, 2)}\n`);

  return {
    findings,
    mistakes: tally(findings),
    check,
    typeErrors: build.typeErrors,
    built: build.built,
    pages: pages.map(({ screenshot: _screenshot, ...rest }) => rest),
  };
}

export async function benchRun(spec: RunSpec): Promise<RunRecord> {
  const out = runDir({ ...spec, task: spec.task.id });
  await mkdir(out, { recursive: true });
  const app = join(WORK_DIR, "runs", spec.label, spec.setup, spec.task.id, `run-${spec.run}`);
  await cloneApp(spec.template, app);
  const skills = await projectSkills(app);
  const startedAt = new Date().toISOString();

  const agent = await runAgent({
    cwd: app,
    prompt: spec.task.prompt,
    model: spec.model,
    transcriptPath: join(out, "transcript.jsonl"),
    vet: (init) => initProblems(init, spec.defaults, spec.model, skills),
    // The agent's own server gets the port after the one scoring uses.
    port: spec.port + 1000,
    readable: localRegistry(spec.facts),
  });
  if (agent.init) await writeFile(join(out, "init.json"), `${JSON.stringify(agent.init, null, 2)}\n`);

  const usage = agent.result?.usage ?? {};
  const record: RunRecord = {
    label: spec.label,
    setup: spec.setup,
    task: spec.task.id,
    run: spec.run,
    model: spec.model,
    claudeCodeVersion: agent.init?.claude_code_version,
    startedAt,
    app: spec.facts,
    agent: {
      ...(agent.stopped ? { stopped: agent.stopped } : {}),
      turns: agent.result?.num_turns,
      durationMs: agent.result?.duration_ms,
      wallMs: agent.wallMs,
      costUsd: agent.result?.total_cost_usd,
      tokens: {
        input: usage.input_tokens ?? 0,
        output: usage.output_tokens ?? 0,
        cacheCreation: usage.cache_creation_input_tokens ?? 0,
        cacheRead: usage.cache_read_input_tokens ?? 0,
      },
    },
    mistakes: { colour: 0, lookalike: 0, "echo-class": 0, prop: 0, name: 0 },
    findings: [],
    typeErrors: 0,
    built: false,
    pages: [],
  };

  // A run whose agent wasn't clean measured the machine, not the setup.
  if (!agent.stopped?.startsWith("not a clean agent")) {
    Object.assign(record, await scoreApp(app, out, spec.facts, spec.port));
    await saveSource(app, join(out, "app"));
  }
  await writeFile(join(out, "score.json"), `${JSON.stringify(record, null, 2)}\n`);
  return record;
}
