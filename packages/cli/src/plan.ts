/**
 * What `add` would do, decided before anything is written.
 *
 * Every file is one of four things, and the difference is what the lock file
 * is for: a file that is in the lock and still matches its hash is Echo's to
 * replace; one that doesn't match is the user's, and stops the install unless
 * they say otherwise. Deciding this up front is what makes `--dry-run` honest
 * and a half-written install impossible.
 */
import { hashContent, type EItem } from "@echo-ui/client";
import type { LockFile } from "./project";

export type FileState = "new" | "unchanged" | "upgrade" | "modified";

export interface PlannedFile {
  path: string;
  state: FileState;
  content: string;
  sha256: string;
}

export interface PlannedItem {
  name: string;
  version: string;
  /** The version already installed, when this is an upgrade. */
  installed?: string;
  files: PlannedFile[];
  dependencies: Record<string, string>;
  setup: string[];
}

export interface Plan {
  items: PlannedItem[];
  /** npm packages to install, merged across every item, one call at the end. */
  dependencies: Record<string, string>;
  /** Files the user has edited; nothing is written while any of these stand. */
  conflicts: { item: string; path: string }[];
  setup: string[];
}

export function planInstall(
  items: readonly EItem[],
  lock: LockFile | undefined,
  onDisk: ReadonlyMap<string, string>,
): Plan {
  const plan: Plan = { items: [], dependencies: {}, conflicts: [], setup: [] };

  for (const item of items) {
    const locked = lock?.items[item.name];
    const files: PlannedFile[] = item.files.map((file) => {
      const current = onDisk.get(file.path);
      const lockedHash = locked?.files[file.path];
      let state: FileState;
      if (current === undefined) state = "new";
      else if (hashContent(current) === file.sha256) state = "unchanged";
      else if (lockedHash && hashContent(current) === lockedHash) state = "upgrade";
      else state = "modified";
      if (state === "modified") plan.conflicts.push({ item: item.name, path: file.path });
      return { path: file.path, state, content: file.content, sha256: file.sha256 };
    });

    plan.items.push({
      name: item.name,
      version: item.version,
      ...(locked ? { installed: locked.version } : {}),
      files,
      dependencies: item.dependencies,
      setup: item.setup,
    });
    Object.assign(plan.dependencies, item.dependencies);
    for (const id of item.setup) if (!plan.setup.includes(id)) plan.setup.push(id);
  }

  return plan;
}

/** The lock file after a plan is applied: what is installed, at what version, with what hashes. */
export function nextLock(previous: LockFile | undefined, core: string, plan: Plan): LockFile {
  const lock: LockFile = { lockVersion: 1, core, items: { ...previous?.items } };
  for (const item of plan.items) {
    lock.items[item.name] = {
      version: item.version,
      files: Object.fromEntries(item.files.map((f) => [f.path, f.sha256])),
    };
  }
  // Items in a stable order, so the file doesn't churn between runs.
  lock.items = Object.fromEntries(Object.entries(lock.items).sort(([a], [b]) => a.localeCompare(b)));
  return lock;
}

/** Files that actually get written: new ones, and Echo's own that moved on. */
export function filesToWrite(plan: Plan): { item: string; path: string; content: string }[] {
  return plan.items.flatMap((item) =>
    item.files
      .filter((f) => f.state === "new" || f.state === "upgrade")
      .map((f) => ({ item: item.name, path: f.path, content: f.content })),
  );
}
