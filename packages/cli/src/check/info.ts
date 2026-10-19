/**
 * What `check` says about the project's Echo, without counting it: items
 * edited since they were installed, and items the registry has moved past.
 * Neither is a mistake. An edit may be on purpose, and an item that's behind
 * works. Both are what `update` needs the agent to know, so they're said once
 * and never change the exit code.
 *
 * Offline, like the rest of the check: the lock holds each file's hash at
 * install, and the kept catalog holds each item's version today.
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { hashContent } from "@echo-ui/client";
import { BLOCK_START, DESIGN_PATH, ECHO_CLI, readWrittenBy, runCommand } from "@registry/agent/guidance";

import { readConfig } from "../project";
import { VERSION } from "../version";

import type { CheckProject } from "./project";

export interface Info {
  kind: "edited" | "behind" | "agent-files";
  items: string[];
  message: string;
}

export async function projectInfo(project: CheckProject): Promise<Info[]> {
  const info: Info[] = [];
  const behind: { item: string; installed: string; latest: string }[] = [];
  for (const [item, locked] of Object.entries(project.lock?.items ?? {}).sort(([a], [b]) => a.localeCompare(b))) {
    const edited: string[] = [];
    for (const [path, hash] of Object.entries(locked.files)) {
      const content = await readFile(join(project.root, project.echoDir, path), "utf8").catch(() => undefined);
      if (content !== undefined && hashContent(content) !== hash) edited.push(path);
    }
    if (edited.length) {
      info.push({
        kind: "edited",
        items: [item],
        message: `${item} was edited since it was installed (${edited.join(", ")}). The edit stays yours: \`update\` leaves it alone, which also means Echo's fixes to ${edited.length === 1 ? "that file" : "those files"} stop reaching it.`,
      });
    }
    const latest = project.items.get(item)?.version;
    if (latest && locked.version !== latest) behind.push({ item, installed: locked.version, latest });
  }
  if (behind.length) {
    const names = behind.map((b) => b.item);
    info.push({
      kind: "behind",
      items: names,
      message: `${behind.map((b) => `${b.item} is ${b.installed} here and ${b.latest} in the registry`).join("; ")}. \`${runCommand(`update ${names.join(" ")}`)}\` brings ${names.length === 1 ? "it" : "them"} up to date, leaving edited files alone; \`${runCommand("diff")}\` shows what changed.`,
    });
  }
  info.push(...(await agentFilesInfo(project.root)));
  return info;
}

/** A seed as one string, whatever order its keys were written in. */
const seedKey = (seed: Record<string, unknown> | undefined) => JSON.stringify(Object.fromEntries(Object.entries(seed ?? {}).sort(([a], [b]) => a.localeCompare(b))));

/**
 * Echo's agent files, if a different CLI wrote them or DESIGN.md describes a
 * seed echo.json no longer has: `agent on` writes them again. Files without
 * Echo's markers aren't Echo's, and aren't mentioned.
 */
async function agentFilesInfo(root: string): Promise<Info[]> {
  const config = await readConfig(root);
  const stale: string[] = [];
  let seedMoved = false;
  for (const file of ["CLAUDE.md", "AGENTS.md", DESIGN_PATH]) {
    const text = await readFile(join(root, file), "utf8").catch(() => undefined);
    if (!text?.includes(BLOCK_START)) continue;
    const stamp = readWrittenBy(text);
    if (stamp?.version !== VERSION) stale.push(file);
    else if (file === DESIGN_PATH && seedKey(stamp.seed) !== seedKey(config?.seed)) seedMoved = true;
  }
  const info: Info[] = [];
  if (stale.length) {
    info.push({
      kind: "agent-files",
      items: stale,
      message: `${stale.join(", ")} ${stale.length === 1 ? "was" : "were"} written by another version of ${ECHO_CLI}: \`${runCommand("agent on")}\` writes Echo's part of ${stale.length === 1 ? "it" : "them"} again for ${VERSION}, leaving everything else in ${stale.length === 1 ? "it" : "them"} alone.`,
    });
  }
  if (seedMoved) {
    info.push({
      kind: "agent-files",
      items: [DESIGN_PATH],
      message: `${DESIGN_PATH} describes a different seed from the one in echo.json: \`${runCommand("agent on")}\` writes it again from echo.json's.`,
    });
  }
  return info;
}

/** What the agent is told when it edits one of Echo's own files, from the hook. */
export function editedEchoFileNote(file: string, item: string | undefined): string {
  return `${file} is Echo's own file${item ? ` (${item})` : ""}. Editing it is allowed, and \`update\` will leave your edit alone, but Echo's fixes to it stop arriving. If the change is to how it looks, its props, a Scope or the seed usually say it without an edit.`;
}

/**
 * What the agent is told when it edits the theme. It isn't in the lock (init
 * writes it, not an item), so without this it read as a new file.
 */
export function themeFileNote(file: string): string {
  return `${file} is written from the seed in echo.json: a change by hand is lost the next time the theme is written. Change a setting with \`${runCommand("style set <setting> <value>")}\` (\`${runCommand("style set")}\` alone lists them), or wear a whole style with \`${runCommand("style use <name>")}\`.`;
}

/** What the agent is told when it writes a new file into Echo's folder, which the check never reads. */
export function newFileInEchoNote(file: string, echoDir: string): string {
  return `${file} is inside ${echoDir}/, Echo's folder, which the check doesn't read (its files are Echo's components). Put your own components outside it, so the check can help with them.`;
}
