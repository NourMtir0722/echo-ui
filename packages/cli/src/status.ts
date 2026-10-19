/**
 * What is installed, what it has become, and what Echo has done since
 *.
 *
 * `echo-lock.json` records a SHA per file at install time, which is what makes
 * this possible: with the hash Echo wrote, the bytes on disk and the bytes the
 * registry serves today, every file falls into exactly one of six states and
 * nothing has to be guessed. `diff` prints these; `update` acts on them.
 *
 * Reading only — nothing here writes. The commands decide what to do with it.
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { hashContent, RegistryClient, RegistryError, satisfies, type EItem } from "@echo-ui/client";

import { resolveInside, type EchoConfig, type LockFile } from "./project";
import { runCommand } from "@registry/agent/guidance";

export type FileState =
  /** On disk exactly as the registry serves it now. Nothing to do. */
  | "current"
  /** Untouched since Echo wrote it, and Echo has moved on. Safe to replace. */
  | "behind"
  /** The user changed it, and Echo has not. Theirs to keep. */
  | "edited"
  /** The user changed it AND Echo has moved on. The case that needs a human. */
  | "edited-behind"
  /** In the lock, not on disk. Echo's file, gone. `update` puts it back. */
  | "missing"
  /** The item gained this file since it was installed. New, so safe to write. */
  | "added";

export interface FileReport {
  path: string;
  state: FileState;
  /** The bytes on disk, when there are any. */
  current?: string;
  /** The bytes the registry serves today. Absent when the item dropped the file. */
  latest?: string;
  added?: number;
  removed?: number;
}

export type ItemState =
  | "current"
  | "behind"
  | "edited"
  | "edited-behind"
  /** In the lock; the registry no longer has it. Left strictly alone. */
  | "gone";

export interface ItemReport {
  name: string;
  installed: string;
  /** The registry's version today. Absent for a `gone` item. */
  latest?: string;
  state: ItemState;
  /** The item needs a newer `echo-ui-core` than this project has. */
  coreTooOld?: { needs: string; installed: string };
  files: FileReport[];
  /**
   * Files the lock records that this item no longer ships. Never deleted —
   * a file in somebody's source tree is theirs, and an installer that removes
   * source files is one bad registry away from a very bad afternoon.
   */
  orphans: string[];
}

/**
 * An item's state from its files' — and the two questions are independent,
 * which is the whole subtlety.
 *
 * "Has the user touched this?" and "has Echo moved on?" are separate facts,
 * and an item can easily answer yes to both through two different files: the
 * user edits `badge.tsx` while Echo's fix lands in `badge.css`. Ranking the
 * file states on one scale and taking the worst gets that case wrong — it
 * reports `edited`, which `update` reads as "nothing waiting for them", and
 * the fix in the CSS becomes exactly the unreachable improvement this whole
 * command exists to prevent. So they are counted as two booleans.
 */
function itemState(files: readonly FileReport[]): ItemState {
  const edited = files.some((f) => f.state === "edited" || f.state === "edited-behind");
  const behind = files.some(
    (f) => f.state === "behind" || f.state === "added" || f.state === "missing" || f.state === "edited-behind",
  );
  if (edited && behind) return "edited-behind";
  if (edited) return "edited";
  if (behind) return "behind";
  return "current";
}

/** One installed item, compared against what the registry serves now. */
export async function reportItem(
  dir: string,
  name: string,
  locked: LockFile["items"][string],
  latest: EItem | undefined,
  core: string | undefined,
): Promise<ItemReport> {
  if (!latest) {
    return { name, installed: locked.version, state: "gone", files: [], orphans: Object.keys(locked.files) };
  }

  const files: FileReport[] = [];

  for (const file of latest.files) {
    const lockedHash = locked.files[file.path];
    let current: string | undefined;
    try {
      current = await readFile(resolveInside(dir, file.path), "utf8");
    } catch {
      /* not on disk */
    }

    let fileState: FileState;
    if (lockedHash === undefined) {
      // A path the lock does not account for. Usually genuinely new in this
      // version — but if something is already sitting there, it is the user's
      // and Echo is not allowed to walk over it just because the lock is
      // silent. Classifying it as theirs is what stops a dropped-then-restored
      // file path from quietly eating somebody's work.
      if (current === undefined) fileState = "added";
      else fileState = hashContent(current) === file.sha256 ? "current" : "edited-behind";
    } else if (current === undefined) fileState = "missing";
    else {
      const onDisk = hashContent(current);
      const mine = onDisk !== lockedHash;
      const moved = file.sha256 !== lockedHash;
      if (onDisk === file.sha256) fileState = "current";
      else if (mine && moved) fileState = "edited-behind";
      else if (mine) fileState = "edited";
      else fileState = "behind";
    }

    const report: FileReport = { path: file.path, state: fileState, latest: file.content };
    if (current !== undefined) report.current = current;
    files.push(report);
  }

  const shipped = new Set(latest.files.map((f) => f.path));
  const orphans = Object.keys(locked.files).filter((path) => !shipped.has(path));

  const state = itemState(files);
  const report: ItemReport = { name, installed: locked.version, latest: latest.version, state, files, orphans };
  if (core && !satisfies(core, latest.core)) {
    report.coreTooOld = { needs: latest.core, installed: core };
  }
  return report;
}

export interface Survey {
  reports: ItemReport[];
  /** The registry's own version, for the header line. */
  registry: string;
  core: string;
}

/**
 * Every item in the lock, surveyed against the registry.
 *
 * Items are fetched one at a time on purpose. The alternative — `resolveItems`
 * — pulls in dependencies the user never asked about, and `diff` reporting on
 * something that is not in the lock would be reporting on a file it cannot
 * account for.
 */
export async function survey(
  root: string,
  config: EchoConfig,
  lock: LockFile,
  client: RegistryClient,
  names?: readonly string[],
  installedCoreVersion?: string,
): Promise<Survey> {
  const index = await client.index();
  const dir = join(root, config.dir);
  const wanted = names?.length ? names : Object.keys(lock.items);

  const reports: ItemReport[] = [];
  for (const name of [...wanted].sort()) {
    const locked = lock.items[name];
    if (!locked) throw new RegistryError(`\`${name}\` is not installed here. \`${runCommand("list")}\` shows what is.`);
    let latest: EItem | undefined;
    try {
      latest = await client.item(name);
    } catch (error) {
      // A 404 is "the registry dropped it"; anything else is a real failure
      // and should not be reported as an item quietly disappearing.
      if (!(error instanceof RegistryError) || !/\b404\b|ENOENT|no such file/i.test(error.message)) throw error;
    }
    reports.push(await reportItem(dir, name, locked, latest, installedCoreVersion));
  }

  return { reports, registry: index.version, core: index.core };
}

/** The one-line English for an item's state, used by both commands. */
export function describe(state: ItemState): string {
  switch (state) {
    case "current":
      return "up to date";
    case "behind":
      return "behind";
    case "edited":
      return "edited, up to date";
    case "edited-behind":
      return "edited, and behind";
    case "gone":
      return "no longer in the registry";
  }
}
