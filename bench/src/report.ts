/**
 * A set of runs, read back: the summary table, and the failure list that
 * ranks what went wrong by how many runs it happened in.
 *
 * The failure list is where the transcripts are read FROM, not a substitute
 * for reading them: it says which runs to open.
 */
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

import { axeNodes, totalTokens, type RunRecord } from "./record";
import { BENCH_RULES, type Rule } from "./score/count";

const RULES: readonly Rule[] = BENCH_RULES;

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const fmt = (n: number, digits = 1) => (Number.isInteger(n) ? String(n) : n.toFixed(digits));
const k = (n: number) => `${fmt(n / 1000)}k`;

function groupBy<T>(xs: readonly T[], key: (x: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const x of xs) {
    const k_ = key(x);
    groups.set(k_, [...(groups.get(k_) ?? []), x]);
  }
  return groups;
}

/** Whether the counts that are Echo's own rules mean anything for this setup. */
const isEcho = (r: RunRecord) => Boolean(r.app.echo);

/** One table: a row per setup × task, each cell the mean over its runs. */
export function summaryTable(records: readonly RunRecord[]): string {
  const header = [
    "Setup",
    "Task",
    "Runs",
    "Tokens",
    "Cost",
    "Turns",
    "Minutes",
    ...RULES.map((r) => (r === "echo-class" ? "Echo class" : r[0]!.toUpperCase() + r.slice(1))),
    "Type errors",
    "Built",
    "Axe (elements)",
  ];
  const rows = [...groupBy(records, (r) => `${r.setup}\u0000${r.task}`).values()].map((runs) => {
    const first = runs[0]!;
    const echo = isEcho(first);
    return [
      first.setup,
      first.task,
      String(runs.length),
      k(mean(runs.map((r) => totalTokens(r.agent.tokens)))),
      `$${fmt(mean(runs.map((r) => r.agent.costUsd ?? 0)), 2)}`,
      fmt(mean(runs.map((r) => r.agent.turns ?? 0))),
      fmt(mean(runs.map((r) => r.agent.wallMs / 60000))),
      ...RULES.map((rule) => (rule === "colour" || echo ? fmt(mean(runs.map((r) => r.mistakes[rule]))) : "—")),
      fmt(mean(runs.map((r) => r.typeErrors))),
      `${runs.filter((r) => r.built).length}/${runs.length}`,
      fmt(mean(runs.map((r) => axeNodes(r)))),
    ];
  });
  return [`| ${header.join(" | ")} |`, `| ${header.map(() => "---").join(" | ")} |`, ...rows.map((r) => `| ${r.join(" | ")} |`)].join("\n");
}

/**
 * Whether each app's pages kept the look it wears: a row per setup × task,
 * over every page of every run. Empty when no run was scored for its look.
 */
export function lookTable(records: readonly RunRecord[]): string {
  const scored = records.filter((r) => r.pages.some((p) => p.look));
  const rows = [...groupBy(scored, (r) => `${r.setup}\u0000${r.task}`).values()].map((runs) => {
    const first = runs[0]!;
    const looks = runs.flatMap((r) => r.pages.flatMap((p) => (p.look ? [p.look] : [])));
    const held = looks.filter((l) => l.device.held).length;
    const shares = looks.flatMap((l) => (l.typeShare === null ? [] : [l.typeShare]));
    const missing = new Map<string, number>();
    for (const l of looks) for (const f of l.fontsMissing) missing.set(f, (missing.get(f) ?? 0) + 1);
    return [
      first.setup,
      first.task,
      first.app.style ? `${first.app.style.title} (${first.app.style.device})` : `its seed (${looks[0]!.device.wanted})`,
      `${held}/${looks.length}`,
      shares.length ? `${Math.round(mean(shares) * 100)}%` : "—",
      [...missing].map(([f, n]) => `${f} (${n})`).join(", ") || "none",
    ];
  });
  if (!rows.length) return "";
  const header = ["Setup", "Task", "Wears", "Pages on its device", "Text in its type", "Fonts not loaded (pages)"];
  return [`| ${header.join(" | ")} |`, `| ${header.map(() => "---").join(" | ")} |`, ...rows.map((r) => `| ${r.join(" | ")} |`)].join("\n");
}

/** A mistake's message without its specifics, so the same mistake groups across files. */
export function mistakeKey(rule: Rule, message: string): string {
  if (rule === "colour") return "a colour written as a literal";
  if (rule === "echo-class") return "an Echo class written by hand on a raw element";
  return message.replace(/className="[^"]*"/, 'className="…"');
}

export interface FailureRow {
  what: string;
  runs: number;
  occurrences: number;
  /** Where to start reading: the first run it happened in. */
  example: string;
}

/** Every mistake and every axe rule, ranked by how many runs it happened in. */
export function failureRows(records: readonly RunRecord[]): FailureRow[] {
  const seen = new Map<string, { runs: Set<string>; occurrences: number; example: string }>();
  const note = (what: string, run: string, count: number, example: string) => {
    const row = seen.get(what) ?? { runs: new Set(), occurrences: 0, example };
    row.runs.add(run);
    row.occurrences += count;
    seen.set(what, row);
  };
  for (const r of records) {
    const id = `${r.setup}/${r.task}/run-${r.run}`;
    for (const f of r.findings) note(`${f.rule}: ${mistakeKey(f.rule, f.message)}`, id, 1, `${id} ${f.file}:${f.line}`);
    for (const page of r.pages) {
      for (const [rule, v] of Object.entries(page.axe)) note(`axe ${rule}: ${v.help}`, id, v.nodes, `${id} ${page.route}`);
    }
    if (r.typeErrors) note("type errors", id, r.typeErrors, `${id} tsc.txt`);
    if (!r.built && !r.agent.stopped) note("the production build failed", id, 1, `${id} build.txt`);
    if (r.agent.stopped) note(`the run stopped: ${r.agent.stopped.split(":")[0]}`, id, 1, id);
  }
  return [...seen]
    .map(([what, v]) => ({ what, runs: v.runs.size, occurrences: v.occurrences, example: v.example }))
    .sort((a, b) => b.runs - a.runs || b.occurrences - a.occurrences || a.what.localeCompare(b.what));
}

export function failureList(records: readonly RunRecord[], setup?: string): string {
  const scoped = setup ? records.filter((r) => r.setup === setup) : records;
  const rows = failureRows(scoped);
  if (!rows.length) return "Nothing went wrong in these runs.";
  return [
    `| What | Runs (of ${scoped.length}) | Times | First seen |`,
    "| --- | --- | --- | --- |",
    ...rows.map((r) => `| ${r.what.replace(/\\/g, "\\\\").replace(/\|/g, "\\|")} | ${r.runs} | ${r.occurrences} | ${r.example} |`),
  ].join("\n");
}

/** Every score.json under a set's folder. */
export async function readRecords(setDir: string): Promise<RunRecord[]> {
  const records: RunRecord[] = [];
  const walk = async (dir: string) => {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      if (entry.isDirectory() && entry.name !== "app" && entry.name !== "shots") await walk(join(dir, entry.name));
      else if (entry.name === "score.json") records.push(JSON.parse(await readFile(join(dir, entry.name), "utf8")) as RunRecord);
    }
  };
  await walk(setDir);
  return records.sort((a, b) => a.setup.localeCompare(b.setup) || a.task.localeCompare(b.task) || a.run - b.run);
}

export function renderReport(label: string, records: readonly RunRecord[]): string {
  const setups = [...new Set(records.map((r) => r.setup))];
  const first = records[0];
  const look = lookTable(records);
  return [
    `# Bench: ${label}`,
    "",
    first ? `Model \`${first.model}\`, Claude Code ${first.claudeCodeVersion ?? "?"}. ${records.length} runs.` : "No runs.",
    "",
    "Counts are means per run, over the lines the agent wrote. Colour, type errors, the build and axe",
    "measure any setup; the other counts are Echo's own rules and only apply to an Echo app.",
    "",
    summaryTable(records),
    "",
    ...(look
      ? [
          "## The look",
          "",
          "Whether each app's pages kept the look its project wears: the device its first screen stands on",
          "(light or dark), and the share of its text set in the look's type. Each run's `shots/` has the pages.",
          "",
          look,
          "",
        ]
      : []),
    ...setups.flatMap((s) => [`## Failure list: ${s}`, "", failureList(records, s), ""]),
  ].join("\n");
}
