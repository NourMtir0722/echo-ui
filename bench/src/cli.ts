/**
 * The agent benchmark: a real coding agent on fixed tasks in a fresh app,
 * measured. A development tool, never published.
 *
 *   pnpm bench defaults
 *   pnpm bench run --setup echo --task all --runs 3 --label 2026-09-27-baseline
 *   pnpm bench run --setup echo-local+echo,echo-local+ink-instrument --task pricing --runs 3 --label 2026-09-28-styles
 *   pnpm bench report --label 2026-09-27-baseline
 *   pnpm bench rescore --label 2026-09-27-baseline [--cli path/to/echo-ui]
 *
 * Results and transcripts go to the results folder (ECHO_BENCH_RESULTS,
 * outside the repository); apps are built in a temp folder (ECHO_BENCH_WORK).
 */
import { mkdir, mkdtemp, readFile, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createServer } from "node:net";
import { parseArgs } from "node:util";

import { defaultsFrom, type Defaults } from "./agent/init-event";
import { agentArgs, runAgent } from "./agent/run-agent";
import { MODEL, RESULTS_DIR, WORK_DIR } from "./config";
import type { RunRecord } from "./record";
import { readRecords, renderReport } from "./report";
import { benchRun, echoCheck } from "./run";
import { parseAddedLines } from "./score/added-lines";
import { capture } from "./score/build";
import { BENCH_RULES } from "./score/count";
import { setupIds, template } from "./setups";
import { TASKS, taskById } from "./tasks";

const DEFAULTS_FILE = join(RESULTS_DIR, "defaults.json");

interface StoredDefaults extends Defaults {
  model: string;
  /** The flags a run gets, minus its prompt: a change there can change what the agent has. */
  flags: string;
  recordedAt: string;
}

const flagsFor = (model: string) => agentArgs("", model).slice(2).join(" ");

async function claudeVersion(): Promise<string> {
  const { output } = await capture("claude", ["--version"], process.cwd());
  return output.trim().split(/\s/)[0] ?? "unknown";
}

/** What a clean agent has, recorded from one tiny run in an empty folder. */
async function recordDefaults(model: string): Promise<StoredDefaults> {
  await mkdir(WORK_DIR, { recursive: true });
  const empty = await mkdtemp(join(WORK_DIR, "defaults-"));
  const run = await runAgent({
    cwd: empty,
    prompt: "Reply with the single word: ready",
    model,
    transcriptPath: join(empty, "transcript.jsonl"),
    vet: () => [],
    timeoutMs: 120_000,
  });
  if (!run.init) throw new Error(`Claude Code didn't start: ${run.stopped ?? "no init event"}`);
  if (run.init.mcp_servers.length) throw new Error("Even an empty folder had MCP servers; the flags no longer keep them out.");
  const defaults: StoredDefaults = { ...defaultsFrom(run.init), model, flags: flagsFor(model), recordedAt: new Date().toISOString() };
  await mkdir(RESULTS_DIR, { recursive: true });
  await writeFile(DEFAULTS_FILE, `${JSON.stringify(defaults, null, 2)}\n`);
  return defaults;
}

/** The recorded defaults, re-recorded when Claude Code, the model or the run's flags changed since. */
async function defaults(model: string): Promise<StoredDefaults> {
  try {
    const stored = JSON.parse(await readFile(DEFAULTS_FILE, "utf8")) as StoredDefaults;
    if (stored.model === model && stored.flags === flagsFor(model) && stored.claudeCodeVersion === (await claudeVersion())) {
      return stored;
    }
  } catch {
    /* not recorded yet */
  }
  console.log("Recording what a clean agent has…");
  return recordDefaults(model);
}

/** Whether something already listens on a port. */
function busy(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = createServer();
    server.once("error", () => resolve(true));
    server.once("listening", () => server.close(() => resolve(false)));
    server.listen(port);
  });
}

/**
 * The ports Next.js tries by default. An agent that finds its dev server's
 * port taken may decide what holds it is a stray and stop it; the sandbox and
 * the deny rules make that hard, and this makes it moot.
 */
async function busyDevPorts(): Promise<number[]> {
  const ports = Array.from({ length: 11 }, (_, i) => 3000 + i);
  return (await Promise.all(ports.map(async (p) => ((await busy(p)) ? p : 0)))).filter(Boolean);
}

/** Runs `jobs` with at most `limit` in flight. */
async function pool<T>(jobs: (() => Promise<T>)[], limit: number): Promise<T[]> {
  const results: T[] = [];
  let next = 0;
  const worker = async () => {
    while (next < jobs.length) {
      const index = next++;
      results[index] = await jobs[index]!();
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, limit) }, worker));
  return results;
}

async function main(argv: string[]): Promise<number> {
  const { positionals, values } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      setup: { type: "string" },
      task: { type: "string", default: "all" },
      runs: { type: "string", default: "3" },
      label: { type: "string" },
      parallel: { type: "string", default: "1" },
      model: { type: "string", default: MODEL },
      fresh: { type: "boolean", default: false },
      "allow-busy-ports": { type: "boolean", default: false },
      cli: { type: "string" },
    },
  });
  const [command] = positionals;
  const model = values.model!;

  switch (command) {
    case "defaults": {
      const d = await recordDefaults(model);
      console.log(`Recorded for Claude Code ${d.claudeCodeVersion}: ${d.tools.length} tools, ${d.skills.length} skills, ${d.plugins.length} plugins.`);
      return 0;
    }

    case "prepare": {
      for (const setup of (values.setup ?? "").split(",").filter(Boolean)) {
        const { root, facts } = await template(setup, { fresh: values.fresh });
        console.log(`${setup}: ${root}${facts.echo ? ` (Echo ${facts.echo.source}, cli ${facts.echo.cli ?? "?"}, core ${facts.echo.core ?? "?"})` : ""}`);
      }
      return 0;
    }

    case "run": {
      if (!values.setup || !values.label) {
        console.error("run needs --setup and --label. Setups: " + (await setupIds()).join(", ") + ", each of Echo's with +<style> to wear one.");
        return 2;
      }
      const taken = await busyDevPorts();
      if (taken.length && !values["allow-busy-ports"]) {
        console.error(
          `Something is listening on ${taken.join(", ")}: stop it first (a dev server?), or pass --allow-busy-ports. ` +
            "An agent that finds its port taken can decide the server is a stray.",
        );
        return 1;
      }
      const tasks = values.task === "all" ? [...TASKS] : values.task!.split(",").map(taskById);
      const runs = Number(values.runs);
      const clean = await defaults(model);
      const jobs: (() => Promise<RunRecord>)[] = [];
      let port = 4400;
      for (const setup of values.setup.split(",")) {
        const { root, facts } = await template(setup, { fresh: values.fresh });
        for (const task of tasks) {
          for (let run = 1; run <= runs; run++) {
            const spec = { label: values.label, setup, task, run, model, template: root, facts, defaults: clean, port: port++ };
            jobs.push(async () => {
              console.log(`▶ ${setup} · ${task.id} · run ${run}`);
              const record = await benchRun(spec);
              console.log(
                `■ ${setup} · ${task.id} · run ${run}: ${record.agent.stopped ?? "finished"}, ` +
                  `${Math.round(record.agent.wallMs / 60000)} min, ${record.findings.length} findings, ` +
                  `${record.typeErrors} type errors, ${record.built ? "built" : "did not build"}`,
              );
              return record;
            });
          }
        }
      }
      await pool(jobs, Number(values.parallel));
      const records = await readRecords(join(RESULTS_DIR, values.label));
      await writeFile(join(RESULTS_DIR, values.label, "report.md"), renderReport(values.label, records));
      console.log(`Report: ${join(RESULTS_DIR, values.label, "report.md")}`);
      return 0;
    }

    case "report": {
      if (!values.label) return 2;
      const records = await readRecords(join(RESULTS_DIR, values.label));
      const report = renderReport(values.label, records);
      await writeFile(join(RESULTS_DIR, values.label, "report.md"), report);
      console.log(report);
      return 0;
    }

    /*
     * Echo's check over a set's saved apps, beside the benchmark's own count
     * of the same lines. Where the two disagree, one of them is wrong.
     */
    case "rescore": {
      // By default, the check this working tree builds: the echo-local app's own CLI.
      const cli = values.cli ?? join(WORK_DIR, "templates", "echo-local", "node_modules", ".bin", "echo-ui");
      if (!values.label) {
        console.error("rescore needs --label.");
        return 2;
      }
      if (!(await stat(cli).catch(() => undefined))) {
        console.error(`No check at ${cli}. Run \`pnpm bench prepare --setup echo-local\` first, or pass --cli.`);
        return 1;
      }
      // The two counters are compared on the mistakes both count. What only the
      // check counts (spacing, shadows, timing…) is listed beside, not mixed in.
      const rows: string[] = ["| Run | Bench count | Check, same rules | Disagreement | Check only |", "| --- | --- | --- | --- | --- |"];
      for (const record of await readRecords(join(RESULTS_DIR, values.label))) {
        if (!record.app.echo) continue;
        const dir = join(RESULTS_DIR, values.label, record.setup, record.task, `run-${record.run}`);
        const added = parseAddedLines(await readFile(join(dir, "diff.patch"), "utf8"));
        const check = await echoCheck(join(dir, "app"), added, dir, cli);
        const bench = record.findings.length;
        const shared = Object.entries(check?.byRule ?? {}).filter(([rule]) => (BENCH_RULES as readonly string[]).includes(rule));
        const found = shared.reduce((n, [, count]) => n + count, 0);
        const only = Object.entries(check?.byRule ?? {})
          .filter(([rule]) => !(BENCH_RULES as readonly string[]).includes(rule))
          .map(([rule, count]) => `${rule} ${count}`)
          .join(", ");
        rows.push(`| ${record.setup}/${record.task}/run-${record.run} | ${bench} | ${check ? found : "no check"} | ${bench === found ? "" : found - bench} | ${only} |`);
      }
      const table = rows.join("\n");
      await writeFile(join(RESULTS_DIR, values.label, "rescore.md"), `${table}\n`);
      console.log(table);
      return 0;
    }

    default:
      console.error("Commands: defaults, prepare, run, report, rescore.");
      return 2;
  }
}

process.exitCode = await main(process.argv.slice(2));
