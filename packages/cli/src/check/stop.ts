/**
 * `check --stop`: Echo's tests (the design tests, contrast, names and axe) as
 * Claude Code's Stop hook, so an agent can't call a screen done until it
 * passes them.
 *
 * When the agent tries to end its turn, the hook finds the running app and
 * the pages the change touched, runs the tests on them headless, and,
 * when something's found, blocks the stop (exit 2) with the findings on
 * stderr, which Claude Code hands back to the agent. It lets the agent stop
 * when nothing a person sees changed, when the app isn't running (and says
 * so), when echo.json's `test.stop` is false, and after three blocked rounds
 * in a row (and says what's left), so an agent never loops on it forever.
 *
 * Exit 2 only ever means "the tests found this": anything going wrong in the
 * gate itself lets the agent stop, and a page that couldn't be loaded is said
 * by name, never counted as passing.
 *
 * The gate can't be muted quietly: when echo.json lets through more than it
 * did at the last commit (a rule turned `off` or to `info`, or the gate
 * itself turned off), the person is told which. It doesn't block on it: the
 * person decides.
 */
import { execFile } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";

import { readTeamRules } from "@registry/agent/check/team";

import { appRoutes, changedFiles, pageFiles, readTestSettings, runningApp, touchedRoutes } from "./app";
import { BrowserError } from "./browser";
import { echoFolder, REPORT_DIR, runPageTests, type PageResult } from "./page-tests";
import { detectFramework, readConfig } from "../project";

/** Blocked rounds in a row before the agent is let go. */
export const MAX_ROUNDS = 3;
/** Most pages one stop tests: the gate has to finish inside the hook's time. */
export const MAX_STOP_PAGES = 10;
const STATE = ".echo/stop.json";
/** Most findings said to the agent at once; the rest are in the report. */
const MAX_SAID = 25;

export interface StopInput {
  session_id?: string;
  /** True when the agent is already going again because a Stop hook blocked it. */
  stop_hook_active?: boolean;
}

export interface StopOutcome {
  code: 0 | 2;
  /** Said to the person (Claude Code's `systemMessage`). */
  message?: string;
  /** Said to the agent, when it's blocked. */
  block?: string;
}

interface Round {
  session?: string;
  rounds: number;
}

async function readRound(root: string): Promise<Round> {
  try {
    return JSON.parse(await readFile(join(root, STATE), "utf8")) as Round;
  } catch {
    return { rounds: 0 };
  }
}
async function writeRound(root: string, round: Round): Promise<void> {
  await echoFolder(root);
  await writeFile(join(root, STATE), `${JSON.stringify(round)}\n`);
}

/** A page as the gate names it: with its width when it's tested at more than one. */
const pageName = (results: readonly PageResult[], r: PageResult) => (results.filter((x) => x.route === r.route).length > 1 ? `${r.route} @${r.width}` : r.route);

/** The pages that couldn't be checked, and why: never counted as passing. */
const unchecked = (results: readonly PageResult[]) => results.filter((r) => r.error).map((r) => `${pageName(results, r)} (${r.error})`);

/**
 * What echo.json lets through now that it didn't at the last commit: each
 * rule turned `off` or to `info` since, and the gate itself turned off. Empty
 * outside git, or when the last commit has no echo.json to compare against.
 */
export async function loosened(root: string, now: { check?: unknown; test?: unknown }): Promise<string[]> {
  type Shape = { check?: { rules?: Record<string, unknown> }; test?: { stop?: unknown } };
  let before: Shape;
  try {
    // `./` reads it from the project's folder, wherever the repository's root is.
    const { stdout } = await promisify(execFile)("git", ["show", "HEAD:./echo.json"], { cwd: root });
    before = JSON.parse(stdout) as Shape;
  } catch {
    return [];
  }
  const rank = (level: unknown) => (level === "off" ? 2 : level === "info" ? 1 : 0);
  const was = before.check?.rules ?? {};
  const is = (now as Shape).check?.rules ?? {};
  const said = Object.entries(is)
    .filter(([rule, level]) => rank(level) > rank(was[rule]))
    .map(([rule, level]) => `\`${rule}\` is now \`${String(level)}\``);
  if ((now as Shape).test?.stop === false && before.test?.stop !== false) said.push("the Stop gate itself is off (`test.stop`)");
  return said;
}

/** Said to the person, and to the agent when it's blocked, when echo.json was loosened. */
const loosenedText = (said: readonly string[]) =>
  said.length
    ? `Since the last commit, echo.json lets more through: ${said.join(", ")}. If you didn't change that, the agent did: ask it why.`
    : "";

/** The agent may stop: with a message to the person, and what was loosened after it, when there's either. */
function letStop(message: string, said: readonly string[]): StopOutcome {
  const told = [message, loosenedText(said)].filter(Boolean).join(" ");
  return told ? { code: 0, message: told } : { code: 0 };
}

/** What the agent is told when it's blocked: each finding, then what to do. */
export function blockText(results: readonly PageResult[], round: number, loose: readonly string[] = []): string {
  const all = results.flatMap((r) => r.findings.map((f) => ({ route: pageName(results, r), f })));
  const routes = [...new Set(all.map((a) => a.route))];
  const lines = all.slice(0, MAX_SAID).map(({ route, f }) => `${route}  ${f.rule}  ${f.where ? `${f.where}: ` : ""}${f.message}`);
  if (all.length > MAX_SAID) lines.push(`…and ${all.length - MAX_SAID} more in ${REPORT_DIR}/report.json.`);
  const missed = unchecked(results);
  return [
    `Echo's tests found ${all.length} thing${all.length === 1 ? "" : "s"} to fix on ${routes.join(", ")} before this is done:`,
    "",
    ...lines,
    ...(missed.length ? ["", `They couldn't check ${missed.join("; ")}.`] : []),
    ...(loose.length ? ["", loosenedText(loose)] : []),
    "",
    `Fix each one as it says, changing only what it names. When one is in markup you can't change (a library's widget, an embed), say so to the person: never turn its rule off in echo.json, and never work around it. Then finish again: the tests run again when you stop (round ${round} of ${MAX_ROUNDS}). A picture of each is in ${REPORT_DIR}/index.html.`,
  ].join("\n");
}

export async function runStop(root: string, input: StopInput): Promise<StopOutcome> {
  const config = await readConfig(root);
  if (!config) return { code: 0 };
  const settings = readTestSettings((config as { test?: unknown }).test);
  const loose = await loosened(root, config as { check?: unknown; test?: unknown });
  if (settings.stop === false) return letStop("", loose);

  const framework = config.framework ?? (await detectFramework(root));
  const all = await appRoutes(root, framework, settings);
  const changed = await changedFiles(root);
  // Pages echo.json names are the ones to test, whichever file changed.
  const files = settings.routes?.length ? [] : await pageFiles(root, framework);
  const routes = (changed === undefined ? all : touchedRoutes(changed, files, all)).slice(0, MAX_STOP_PAGES);
  if (!routes.length) return letStop("", loose);

  const base = await runningApp(root, framework, settings);
  if (!base) return letStop("Echo's tests didn't run before the agent stopped: the app isn't running. Start it (`npm run dev`) and they will.", loose);

  let results: PageResult[];
  try {
    results = await runPageTests({ root, base, routes, widths: settings.widths ?? [1280], team: readTeamRules(config.check) });
  } catch (error) {
    if (error instanceof BrowserError) return letStop(`Echo's tests didn't run before the agent stopped: ${error.message}`, loose);
    throw error;
  }

  const found = results.reduce((n, r) => n + r.findings.length, 0);
  const previous = await readRound(root);
  // A fresh stop, or another session's count: start again.
  const rounds = input.stop_hook_active && previous.session === input.session_id ? previous.rounds : 0;
  if (!found) {
    await writeRound(root, { session: input.session_id, rounds: 0 });
    // A page that couldn't be loaded lets the agent stop, like the gate failing, but it never passed.
    const checked = routes.filter((route) => !results.some((r) => r.route === route && r.error));
    const missed = unchecked(results);
    const passed = checked.length ? `passed on ${checked.length} page${checked.length === 1 ? "" : "s"} (${checked.join(", ")})` : "";
    const said = [passed, missed.length ? `couldn't check ${missed.join("; ")}` : ""].filter(Boolean).join(", and ");
    // What the team's rules turned to `info` passed, and is still said.
    const noted = results.reduce((n, r) => n + r.notes.length, 0);
    const notes = noted ? ` ${noted} thing${noted === 1 ? "" : "s"} echo.json's rules say without counting ${noted === 1 ? "is" : "are"} in ${REPORT_DIR}/index.html.` : "";
    return letStop(`Echo's tests ${said}.${notes}`, loose);
  }
  if (rounds >= MAX_ROUNDS) {
    await writeRound(root, { session: input.session_id, rounds: 0 });
    return letStop(`Echo's tests still find ${found} thing${found === 1 ? "" : "s"} to fix after ${MAX_ROUNDS} rounds, so the agent was let stop. They're in ${REPORT_DIR}/index.html.`, loose);
  }
  await writeRound(root, { session: input.session_id, rounds: rounds + 1 });
  return { code: 2, block: blockText(results, rounds + 1, loose) };
}
