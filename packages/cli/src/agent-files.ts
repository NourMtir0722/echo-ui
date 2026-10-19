/**
 * What `init` writes for agents, and taking it back out.
 *
 * - The Echo block, between markers, in `CLAUDE.md` and/or `AGENTS.md`, and
 *   DESIGN.md's.
 * - The check hook and the Stop gate for Echo's tests, one entry each in
 *   `.claude/settings.json`.
 * - The skills, Echo's own files: `.claude/skills/echo-ui/SKILL.md`, and
 *   Design Eye's, with its one reference.
 *
 * These are the only files of the project's that Echo ever writes into, and
 * only inside what is marked as Echo's: nothing outside the markers, no other
 * hook, no other setting. `agent off` removes them all, and a file is deleted
 * only when nothing else is left in it, so `init` then `agent off` gives the
 * project back as it was.
 */
import { mkdir, readFile, readdir, rm, rmdir, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { designMd } from "@registry/agent/design-md";
import { BLOCK_END, BLOCK_START, CURSOR_RULE_PATH, DESIGN_PATH, HOOK_COMMAND, SKILL_PATH, STOP_COMMAND, projectBlock, skillFile, writtenBy } from "@registry/agent/guidance";
import { DESIGN_EYE_PATH, DESIGN_EYE_REFERENCE, designEyeSkill } from "@registry/agent/skills/design-eye";
import { echoFoundation } from "@registry/agent/skills/echo-foundation";
import { STYLE_FIT_PATH, styleFitSkill } from "@registry/agent/skills/style-fit";
import type { AppliedStyle } from "@registry/agent/style-schema";

import { VERSION } from "./version";

export const SETTINGS = ".claude/settings.json";

/* -------------------------------------------------------------------- block */

/** The file with the block in it: replaced where it is, or added at the end after a blank line. */
export function upsertBlock(existing: string | undefined, block: string): string {
  if (!existing) return `${block}\n`;
  const start = existing.indexOf(BLOCK_START);
  const end = existing.indexOf(BLOCK_END, start);
  if (start >= 0 && end >= 0) return existing.slice(0, start) + block + existing.slice(end + BLOCK_END.length);
  return `${existing}${existing.endsWith("\n") ? "\n" : "\n\n"}${block}\n`;
}

/** The file without the block, or undefined when nothing else is left in it. */
export function removeBlock(text: string): string | undefined {
  const start = text.indexOf(BLOCK_START);
  const end = text.indexOf(BLOCK_END, start);
  if (start < 0 || end < 0) return text;
  let before = text.slice(0, start);
  let after = text.slice(end + BLOCK_END.length);
  if (after.startsWith("\n")) after = after.slice(1);
  // The blank line `upsertBlock` put before it.
  if (before.endsWith("\n\n")) before = before.slice(0, -1);
  const rest = before + after;
  return rest.trim() === "" ? undefined : rest;
}

/** Whether a CLAUDE.md pulls AGENTS.md in with an `@AGENTS.md` import. */
const importsAgents = (claude: string) => /^@\.?\/?AGENTS\.md\s*$/m.test(claude);

/**
 * Which files get the block. Claude Code reads CLAUDE.md, or AGENTS.md when
 * there's no CLAUDE.md; Codex and Cursor read AGENTS.md. So: the file the
 * project has; both when it has both, unless CLAUDE.md imports AGENTS.md
 * (Next.js sets a project up that way), when once is enough; and a new
 * AGENTS.md when it has neither.
 */
export function blockTargets(claude: string | undefined, agents: string | undefined): ("CLAUDE.md" | "AGENTS.md")[] {
  if (claude !== undefined && agents !== undefined) return importsAgents(claude) ? ["AGENTS.md"] : ["CLAUDE.md", "AGENTS.md"];
  if (claude !== undefined) return ["CLAUDE.md"];
  return ["AGENTS.md"];
}

/* --------------------------------------------------------------------- hook */

interface HookEntry {
  type: string;
  command: string;
  [key: string]: unknown;
}
interface HookGroup {
  matcher?: string;
  hooks: HookEntry[];
  [key: string]: unknown;
}
type Settings = { hooks?: Record<string, HookGroup[]>; [key: string]: unknown };

const MATCHER = "Write|Edit|MultiEdit";
/** The Stop gate runs Echo's tests on up to ten pages: a few minutes at most. */
const STOP_TIMEOUT = 300;

/** The entries `init` merges into `.claude/settings.json`, for anyone who has to paste them. */
export const HOOK_ENTRY = {
  hooks: {
    PostToolUse: [{ matcher: MATCHER, hooks: [{ type: "command", command: HOOK_COMMAND }] }],
    Stop: [{ hooks: [{ type: "command", command: STOP_COMMAND, timeout: STOP_TIMEOUT }] }],
  },
};

const indentOf = (text: string) => /^([ \t]+)"/m.exec(text)?.[1] ?? "  ";
const serialize = (value: unknown, original?: string) =>
  `${JSON.stringify(value, null, original ? indentOf(original) : 2)}${original === undefined || original.endsWith("\n") ? "\n" : ""}`;

const ECHO_COMMANDS = new Set([HOOK_COMMAND, STOP_COMMAND]);
const isEcho = (h: HookEntry) => ECHO_COMMANDS.has(h.command);
const has = (groups: HookGroup[], command: string) => groups.some((g) => (g.hooks ?? []).some((h) => h.command === command));

/**
 * The settings with Echo's hooks merged in, beside every other hook and
 * setting, or an error when the file isn't JSON: then it's left as it is.
 */
export function addHook(existing: string | undefined): { text: string; changed: boolean } | { error: string } {
  let settings: Settings;
  try {
    settings = existing === undefined || existing.trim() === "" ? {} : (JSON.parse(existing) as Settings);
    if (typeof settings !== "object" || settings === null || Array.isArray(settings)) throw new Error("not an object");
  } catch (error) {
    return { error: (error as Error).message };
  }
  const hooks = (settings.hooks ??= {});
  let changed = false;
  const edits = hooks.PostToolUse ?? [];
  if (!has(edits, HOOK_COMMAND)) {
    const same = edits.find((g) => g.matcher === MATCHER);
    if (same) same.hooks = [...(same.hooks ?? []), { type: "command", command: HOOK_COMMAND }];
    else edits.push({ matcher: MATCHER, hooks: [{ type: "command", command: HOOK_COMMAND }] });
    hooks.PostToolUse = edits;
    changed = true;
  }
  const stops = hooks.Stop ?? [];
  if (!has(stops, STOP_COMMAND)) {
    stops.push({ hooks: [{ type: "command", command: STOP_COMMAND, timeout: STOP_TIMEOUT }] });
    hooks.Stop = stops;
    changed = true;
  }
  if (!changed) return { text: existing ?? serialize(settings), changed: false };
  return { text: serialize(settings, existing), changed: true };
}

/** The settings without Echo's hooks, or undefined when nothing else is left in them. */
export function removeHook(text: string): string | undefined {
  let settings: Settings;
  try {
    settings = JSON.parse(text) as Settings;
  } catch {
    return text;
  }
  const hooks = settings.hooks;
  if (!hooks || !["PostToolUse", "Stop"].some((event) => (hooks[event] ?? []).some((g) => (g.hooks ?? []).some(isEcho)))) return text;
  for (const event of ["PostToolUse", "Stop"]) {
    const groups = hooks[event];
    if (!groups) continue;
    const kept = groups.map((g) => ({ ...g, hooks: (g.hooks ?? []).filter((h) => !isEcho(h)) })).filter((g) => g.hooks.length > 0);
    if (kept.length) hooks[event] = kept;
    else delete hooks[event];
  }
  if (Object.keys(hooks).length === 0) delete settings.hooks;
  return Object.keys(settings).length === 0 ? undefined : serialize(settings, text);
}

/* ------------------------------------------------------------------ on / off */

async function read(path: string): Promise<string | undefined> {
  try {
    return await readFile(path, "utf8");
  } catch {
    return undefined;
  }
}

/** Removes a folder only if it's empty, and then its parents up to `stop`. */
async function pruneEmpty(dir: string, stop: string): Promise<void> {
  for (let current = dir; current.startsWith(stop) && current !== stop; current = dirname(current)) {
    try {
      if ((await readdir(current)).length > 0) return;
      await rmdir(current);
    } catch {
      return;
    }
  }
}

export interface AgentFilesResult {
  /** Footprint ids of what was written: `claude-block`, `agents-block`, `design-md`, `cursor-rule`, `hook`, `skill`, `design-eye`, `style-fit`. */
  added: string[];
  /** Said to the person, not failures: a settings file left alone, with what to paste. */
  warnings: string[];
}

/**
 * What the agent files are written from: the project's Echo folder, its seed,
 * its style, what it has installed. Every key is required, even where its
 * value can be undefined: two writers that could leave the style out did, and
 * DESIGN.md lost it.
 */
export interface AgentContext {
  dir: string;
  seed: Record<string, unknown> | undefined;
  /** The style the project wears: DESIGN.md carries its rules. */
  style: AppliedStyle | undefined;
  installed: readonly string[];
}

const isDir = (path: string) => stat(path).then((s) => s.isDirectory(), () => false);

/** Design Eye's skill and its reference, by where they go. */
const designEyeFiles = (): [string, string][] => [
  [DESIGN_EYE_PATH, designEyeSkill()],
  [DESIGN_EYE_REFERENCE, echoFoundation()],
];

/** Style Fit's skill, by where it goes. */
const styleFitFiles = (): [string, string][] => [[STYLE_FIT_PATH, styleFitSkill()]];

export async function writeAgentFiles(root: string, context: AgentContext): Promise<AgentFilesResult> {
  const { dir, seed, installed, style } = context;
  const result: AgentFilesResult = { added: [], warnings: [] };
  const claude = await read(join(root, "CLAUDE.md"));
  const agents = await read(join(root, "AGENTS.md"));
  const block = projectBlock(dir, writtenBy(VERSION));
  const targets = blockTargets(claude, agents);
  for (const file of targets) {
    const existing = file === "CLAUDE.md" ? claude : agents;
    await writeFile(join(root, file), upsertBlock(existing, block));
    result.added.push(file === "CLAUDE.md" ? "claude-block" : "agents-block");
  }

  // The design file: a block too, so a DESIGN.md of the project's own keeps everything else in it.
  const designPath = join(root, DESIGN_PATH);
  await writeFile(designPath, upsertBlock(await read(designPath), designMd({ dir, seed, installed, style, stamp: writtenBy(VERSION, seed) })));
  result.added.push("design-md");

  // Cursor reads AGENTS.md, so its rule is only for a Cursor project whose block went to CLAUDE.md alone.
  if (!targets.includes("AGENTS.md") && (await isDir(join(root, ".cursor")))) {
    const rulePath = join(root, CURSOR_RULE_PATH);
    await mkdir(dirname(rulePath), { recursive: true });
    await writeFile(rulePath, ["---", "description: Echo UI, this project's design system, and how to build its UI.", "alwaysApply: true", "---", "", block, ""].join("\n"));
    result.added.push("cursor-rule");
  }

  const settingsPath = join(root, SETTINGS);
  const settings = await read(settingsPath);
  const hook = addHook(settings);
  if ("error" in hook) {
    result.warnings.push(
      `${SETTINGS} isn't valid JSON (${hook.error}), so it's left as it is. To have the check run after every edit, add this to it:\n${JSON.stringify(HOOK_ENTRY, null, 2)}`,
    );
  } else {
    if (hook.changed) {
      await mkdir(dirname(settingsPath), { recursive: true });
      await writeFile(settingsPath, hook.text);
    }
    result.added.push("hook");
  }

  const skillPath = join(root, SKILL_PATH);
  await mkdir(dirname(skillPath), { recursive: true });
  await writeFile(skillPath, skillFile(dir));
  result.added.push("skill");

  for (const [id, files] of [["design-eye", designEyeFiles()], ["style-fit", styleFitFiles()]] as const) {
    for (const [path, text] of files) {
      await mkdir(dirname(join(root, path)), { recursive: true });
      await writeFile(join(root, path), text);
    }
    result.added.push(id);
  }
  return result;
}


/**
 * The agent files that already carry Echo's markers, rewritten for this
 * version and this project: after `add` and `update`, what's installed (and
 * the words) may have changed. Nothing new is created here; `init` and
 * `agent on` do that.
 */
export async function refreshAgentFiles(root: string, context: AgentContext): Promise<string[]> {
  // The style too: DESIGN.md is its only voice to the agent.
  const { dir, seed, installed, style } = context;
  const refreshed: string[] = [];
  const block = projectBlock(dir, writtenBy(VERSION));
  for (const [file, id] of [
    ["CLAUDE.md", "claude-block"],
    ["AGENTS.md", "agents-block"],
  ] as const) {
    const text = await read(join(root, file));
    if (!text?.includes(BLOCK_START)) continue;
    const next = upsertBlock(text, block);
    if (next !== text) {
      await writeFile(join(root, file), next);
      refreshed.push(id);
    }
  }
  const design = await read(join(root, DESIGN_PATH));
  if (design?.includes(BLOCK_START)) {
    const next = upsertBlock(design, designMd({ dir, seed, installed, style, stamp: writtenBy(VERSION, seed) }));
    if (next !== design) {
      await writeFile(join(root, DESIGN_PATH), next);
      refreshed.push("design-md");
    }
  }
  const skill = await read(join(root, SKILL_PATH));
  if (skill !== undefined && skill !== skillFile(dir)) {
    await writeFile(join(root, SKILL_PATH), skillFile(dir));
    refreshed.push("skill");
  }
  // Design Eye and Style Fit, when the project has them: every file of each, so a skill never points at a reference that's gone.
  for (const [id, files] of [["design-eye", designEyeFiles()], ["style-fit", styleFitFiles()]] as const) {
    if ((await read(join(root, files[0]![0]))) === undefined) continue;
    let changed = false;
    for (const [path, text] of files) {
      if ((await read(join(root, path))) === text) continue;
      await mkdir(dirname(join(root, path)), { recursive: true });
      await writeFile(join(root, path), text);
      changed = true;
    }
    if (changed) refreshed.push(id);
  }
  return refreshed;
}

export async function removeAgentFiles(root: string): Promise<{ removed: string[] }> {
  const removed: string[] = [];
  for (const [file, id] of [
    ["CLAUDE.md", "claude-block"],
    ["AGENTS.md", "agents-block"],
    [DESIGN_PATH, "design-md"],
  ] as const) {
    const path = join(root, file);
    const text = await read(path);
    if (text === undefined || !text.includes(BLOCK_START)) continue;
    const rest = removeBlock(text);
    if (rest === undefined) await rm(path);
    else await writeFile(path, rest);
    removed.push(id);
  }

  const rulePath = join(root, CURSOR_RULE_PATH);
  if ((await read(rulePath))?.includes(BLOCK_START)) {
    await rm(rulePath);
    removed.push("cursor-rule");
    await pruneEmpty(dirname(rulePath), join(root, ".cursor"));
  }

  const settingsPath = join(root, SETTINGS);
  const settings = await read(settingsPath);
  if (settings !== undefined) {
    const rest = removeHook(settings);
    if (rest !== settings) {
      if (rest === undefined) await rm(settingsPath);
      else await writeFile(settingsPath, rest);
      removed.push("hook");
    }
  }

  for (const [id, files] of [["design-eye", designEyeFiles()], ["style-fit", styleFitFiles()]] as const) {
    let found = false;
    for (const [path] of files) {
      if ((await read(join(root, path))) === undefined) continue;
      await rm(join(root, path));
      found = true;
    }
    if (found) removed.push(id);
    for (const [path] of files) await pruneEmpty(dirname(join(root, path)), root);
  }

  const skillPath = join(root, SKILL_PATH);
  if ((await read(skillPath)) !== undefined) {
    await rm(skillPath);
    removed.push("skill");
  }
  await pruneEmpty(dirname(skillPath), root);
  await pruneEmpty(dirname(settingsPath), root);
  return { removed };
}

/**
 * DESIGN.md again, for a new seed or style (`style use`), and nothing else:
 * the agent's block and hook are as `init` left them. A project that has no
 * DESIGN.md (`init --skip-agent`) gets none. Returns whether it was written.
 */
export async function rewriteDesignMd(root: string, context: AgentContext): Promise<boolean> {
  const designPath = join(root, DESIGN_PATH);
  const existing = await read(designPath);
  if (existing === undefined) return false;
  const { dir, seed, installed, style } = context;
  await writeFile(designPath, upsertBlock(existing, designMd({ dir, seed, installed, style, stamp: writtenBy(VERSION, seed) })));
  return true;
}

