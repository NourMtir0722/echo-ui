/**
 * `echo-ui check [file…]`: the mistakes an agent makes with Echo, in the
 * project's own code — colours written by hand, raw elements where Echo has
 * the component, props a component doesn't take, controls without a name,
 * and the markup that locks out a keyboard or a screen reader.
 *
 * Exit codes: 0 clean, 1 when it found something (so CI can use it). It never
 * blocks anyone's work on its own.
 *
 * `--hook` is the same check after every edit in Claude Code: it reads the
 * edited file's path from the hook's JSON on stdin, and exits 2 with the
 * findings on stderr, which Claude Code hands back to the agent. A crash is
 * never 2: it exits 1, which Claude Code shows the person and doesn't block
 * on, so the agent is never handed the check's own bug to "fix".
 *
 * `--stop` is Echo's tests (the design tests and axe) as Claude Code's Stop
 * hook (check/stop.ts): exit 2, with the findings on stderr, keeps the agent
 * working until the pages it changed pass. The same rule holds: only a
 * finding is ever 2.
 */
import { access, stat } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { runCommand } from "@registry/agent/guidance";

import { loadProject, toPosix, type CheckProject } from "../check/project";
import { checkFile, inScope, projectFiles } from "../check/run";
import type { Finding, Note, RuleId } from "@registry/agent/check/rules";
import { editedEchoFileNote, newFileInEchoNote, projectInfo, themeFileNote } from "../check/info";
import { checkUrl, PageCheckError, type PageFinding } from "../check/page";
import { runStop } from "../check/stop";
import { TestSettingsError } from "../check/app";
import { readTeamRules, TeamRulesError } from "@registry/agent/check/team";
import { ProjectFileError, readConfig } from "../project";
import { THEME_FILE } from "../theme-file";
import { bold, dim, type Reporter } from "../output";

export interface CheckOptions {
  root: string;
  files: string[];
  registry?: string;
  refresh?: boolean;
  hook?: boolean;
  /** The hook's JSON; read from stdin when not given. */
  stdin?: string;
  /** A running page to check instead of the source. */
  url?: string;
  /** Claude Code's Stop hook: Echo's tests on the pages the change touched (check/stop.ts). */
  stop?: boolean;
}

const RULE_WORDS: Record<RuleId, [string, string]> = {
  colour: ["colour written by hand", "colours written by hand"],
  space: ["spacing off the scale", "spacings off the scale"],
  radius: ["radius off the scale", "radii off the scale"],
  shadow: ["shadow drawn by hand", "shadows drawn by hand"],
  timing: ["invented timing", "invented timings"],
  "motion-library": ["second animation library", "second animation libraries"],
  restyle: ["restyle from outside", "restyles from outside"],
  label: ["field without a label", "fields without a label"],
  "error-colour": ["error without words", "errors without words"],
  motion: ["motion without Echo's timing", "motions without Echo's timing"],
  screen: ["broken screen rule", "broken screen rules"],
  weight: ["heavy part loaded with the page", "heavy parts loaded with the page"],
  team: ["team rule broken", "team rules broken"],
  lookalike: ["lookalike", "lookalikes"],
  "echo-class": ["borrowed Echo class", "borrowed Echo classes"],
  prop: ["prop problem", "prop problems"],
  name: ["unnamed control", "unnamed controls"],
  keyboard: ["click without a keyboard", "clicks without a keyboard"],
  "img-alt": ["image without alt", "images without alt"],
  "focus-ring": ["focus ring removed", "focus rings removed"],
  tabindex: ["positive tabIndex", "positive tabIndexes"],
  "hidden-focusable": ["hidden focusable", "hidden focusables"],
  setup: ["setup step missing", "setup steps missing"],
  contrast: ["text under AA", "texts under AA"],
  alignment: ["thing out of line", "things out of line"],
  depth: ["shadow that's wrong", "shadows that are wrong"],
  corners: ["corner that's off", "corners that are off"],
  icons: ["icon that doesn't match", "icons that don't match"],
  slop: ["slop tell", "slop tells"],
  axe: ["accessibility problem axe found", "accessibility problems axe found"],
};

const line = (f: Finding) => `${f.file}:${f.line}:${f.column}  ${f.message}`;

export function summary(findings: readonly Finding[], files: number): string {
  if (findings.length === 0) return `No problems in ${files} file${files === 1 ? "" : "s"}.`;
  const counts = new Map<RuleId, number>();
  for (const f of findings) counts.set(f.rule, (counts.get(f.rule) ?? 0) + 1);
  const parts = [...counts].map(([rule, n]) => `${n} ${RULE_WORDS[rule][n === 1 ? 0 : 1]}`);
  const inFiles = new Set(findings.map((f) => f.file)).size;
  return `${findings.length} problem${findings.length === 1 ? "" : "s"} in ${inFiles} file${inFiles === 1 ? "" : "s"}: ${parts.join(", ")}. Each line says the Echo way to do it.`;
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString("utf8");
}

const exists = (path: string) => access(path).then(() => true, () => false);

/** The nearest folder at or above `dir` with an `echo.json`: the Echo project a file belongs to. */
async function projectRootOf(dir: string): Promise<string | undefined> {
  for (let current = resolve(dir); ; current = dirname(current)) {
    if (await exists(join(current, "echo.json"))) return current;
    if (dirname(current) === current) return undefined;
  }
}

async function runHook(options: CheckOptions): Promise<number> {
  let input: { tool_input?: { file_path?: string }; cwd?: string };
  try {
    input = JSON.parse(options.stdin ?? (await readStdin()));
  } catch (error) {
    console.error(`echo-ui check --hook: the hook's input isn't JSON (${(error as Error).message}).`);
    return 1;
  }
  const path = input.tool_input?.file_path;
  if (!path) return 0;
  const absolute = isAbsolute(path) ? path : resolve(input.cwd ?? options.root, path);
  const root = await projectRootOf(dirname(absolute));
  if (!root) return 0;

  let project: CheckProject | undefined;
  try {
    project = await loadProject(root, { registry: options.registry });
  } catch (error) {
    // The check can't run as the team set it up: exit 1, which the person sees, never 2.
    if (error instanceof TeamRulesError || error instanceof ProjectFileError) {
      console.error(`echo-ui check --hook: ${error.message}`);
      return 1;
    }
    throw error;
  }
  if (!project) return 0;
  const file = toPosix(relative(root, absolute));
  if (file.startsWith(`${project.echoDir}/`) && /\.(tsx|jsx|ts|css)$/.test(file)) {
    // Not a finding: said to the agent as context, and the edit goes through.
    const inEcho = file.slice(project.echoDir.length + 1);
    const owner = Object.entries(project.lock?.items ?? {}).find(([, locked]) => inEcho in locked.files)?.[0];
    const additionalContext =
      inEcho === THEME_FILE ? themeFileNote(file) : owner ? editedEchoFileNote(file, owner) : newFileInEchoNote(file, project.echoDir);
    console.log(JSON.stringify({ hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext } }));
    return 0;
  }
  if (!inScope(project, file)) return 0;
  const { findings } = await checkFile(project, file);
  if (findings.length === 0) return 0;
  console.error(
    [
      ...findings.map(line),
      "",
      `Echo's check: ${summary(findings, 1)}`,
      `Fix them the way each line says before moving on. \`${runCommand("docs <item>")}\` has any component's props and example.`,
    ].join("\n"),
  );
  return 2;
}

const PAGE_WORDS: Record<PageFinding["rule"], [string, string]> = {
  setup: ["setup step missing", "setup steps missing"],
  colour: ["colour the seed doesn't make", "colours the seed doesn't make"],
  name: ["unnamed control", "unnamed controls"],
  contrast: ["text under AA", "texts under AA"],
  alignment: ["thing out of line", "things out of line"],
  depth: ["shadow that's wrong", "shadows that are wrong"],
  corners: ["corner that's off", "corners that are off"],
  icons: ["icon that doesn't match", "icons that don't match"],
  screen: ["broken screen rule", "broken screen rules"],
  axe: ["accessibility problem axe found", "accessibility problems axe found"],
};

const pageLine = (f: PageFinding) => `${f.rule}  ${f.where ? `${f.where}: ` : ""}${f.message}`;

export function pageSummary(findings: readonly PageFinding[]): string {
  if (findings.length === 0) return "No problems on the page.";
  const counts = new Map<PageFinding["rule"], number>();
  for (const f of findings) counts.set(f.rule, (counts.get(f.rule) ?? 0) + 1);
  const parts = [...counts].map(([rule, n]) => `${n} ${PAGE_WORDS[rule][n === 1 ? 0 : 1]}`);
  return `${findings.length} problem${findings.length === 1 ? "" : "s"} on the page: ${parts.join(", ")}. Each line says what to change.`;
}

/** `check --url`: the page as it runs, with the team's rules from echo.json when there is one. */
async function runUrl(options: CheckOptions & { url: string }, out: Reporter): Promise<number> {
  let result: Awaited<ReturnType<typeof checkUrl>>;
  try {
    const team = readTeamRules((await readConfig(options.root))?.check);
    result = await checkUrl({ root: options.root, url: options.url, team });
  } catch (error) {
    if (error instanceof PageCheckError || error instanceof TeamRulesError) {
      out.error(error.message);
      return 1;
    }
    throw error;
  }
  const { findings, notes, review } = result;
  if (out.json && findings.length) {
    console.error(JSON.stringify({ ok: false, error: pageSummary(findings), command: "check", url: options.url, findings, notes, review }, null, 2));
    return 1;
  }
  out.line(dim(options.url));
  for (const f of findings) out.line(pageLine(f));
  for (const n of notes) out.line(dim(`note ${pageLine(n)}`));
  // Never counted: what only a person can decide.
  for (const r of review) out.line(dim(`for a person to check  ${r.where ? `${r.where}: ` : ""}${r.message}`));
  if (findings.length || notes.length || review.length) out.line();
  out.line(findings.length ? bold(pageSummary(findings)) : dim(pageSummary(findings)));
  out.result({ command: "check", url: options.url, findings, notes, review });
  return findings.length ? 1 : 0;
}

/** `check --stop`: block the agent's stop while the pages it changed fail Echo's tests. */
async function runStopHook(options: CheckOptions): Promise<number> {
  let input: { session_id?: string; stop_hook_active?: boolean; cwd?: string } = {};
  try {
    const text = options.stdin ?? (await readStdin());
    if (text.trim()) input = JSON.parse(text);
  } catch (error) {
    console.error(`echo-ui check --stop: the hook's input isn't JSON (${(error as Error).message}).`);
    return 1;
  }
  const root = (await projectRootOf(input.cwd ?? options.root)) ?? options.root;
  try {
    const outcome = await runStop(root, input);
    if (outcome.message) console.log(JSON.stringify({ systemMessage: outcome.message }));
    if (outcome.block) console.error(outcome.block);
    return outcome.code;
  } catch (error) {
    // The gate itself went wrong: exit 1, which the person sees and the agent isn't held by.
    const said = error instanceof TestSettingsError || error instanceof TeamRulesError ? error.message : (error as Error).message;
    console.error(`echo-ui check --stop: ${said}`);
    return 1;
  }
}

export async function check(options: CheckOptions, out: Reporter): Promise<number> {
  if (options.stop) return runStopHook(options);
  if (options.hook) return runHook(options);
  if (options.url) return runUrl({ ...options, url: options.url }, out);

  let project: CheckProject | undefined;
  try {
    project = await loadProject(options.root, { registry: options.registry, refresh: options.refresh });
  } catch (error) {
    if (error instanceof TeamRulesError) {
      out.error(error.message);
      return 1;
    }
    throw error;
  }
  if (!project) {
    out.error(`No ${bold("echo.json")} here, so there's nothing to check against. Run \`${runCommand("init")}\` first.`);
    return 1;
  }

  let files: string[];
  if (options.files.length) {
    files = [];
    for (const f of options.files) {
      const rel = toPosix(relative(options.root, resolve(options.root, f)));
      if ((await stat(join(options.root, rel)).catch(() => undefined))?.isFile() && inScope(project, rel)) files.push(rel);
    }
  } else {
    files = await projectFiles(project);
  }

  const findings: Finding[] = [];
  const notes: Note[] = [];
  for (const file of files) {
    const result = await checkFile(project, file);
    findings.push(...result.findings);
    notes.push(...result.notes);
  }
  // Said about the project as a whole, so only when the whole project was checked.
  const info = options.files.length ? [] : await projectInfo(project);

  // --json keeps the CLI's contract: exit 0 is `{ ok: true }` on stdout, and
  // anything else is `{ ok: false }` on stderr with nothing on stdout. Here
  // the findings travel with it.
  if (out.json && findings.length) {
    console.error(JSON.stringify({ ok: false, error: summary(findings, files.length), command: "check", files: files.length, findings, notes, info }, null, 2));
    return 1;
  }
  for (const f of findings) out.line(line(f));
  for (const n of notes) out.line(dim(`note ${n.file}${n.line ? `:${n.line}` : ""}  ${n.message}`));
  if (findings.length || notes.length) out.line();
  out.line(findings.length ? bold(summary(findings, files.length)) : dim(summary(findings, files.length)));
  for (const i of info) out.line(dim(i.message));

  out.result({ command: "check", files: files.length, findings, notes, info });
  return findings.length ? 1 : 0;
}
