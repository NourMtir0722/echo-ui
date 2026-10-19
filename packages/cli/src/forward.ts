/**
 * Bringing an installed item forward to Echo's latest, file by file, without
 * losing the builder's edits.
 *
 * Each file of the latest version is one of:
 * - **kept**: yours as it stands (already current, or edited where Echo
 *   changed nothing);
 * - **written**: Echo's latest (a file Echo moved and you didn't touch, a new
 *   file, one you deleted; any file at all with `--overwrite`);
 * - **merged**: your edits and Echo's change together, merged against the
 *   file as it was installed, which the registry keeps at that version;
 * - **a conflict**: your edits and Echo's change in the same lines;
 * - **blocked**: edited by you and changed by Echo, with no installed copy to
 *   merge against (a version the registry doesn't serve, or a file the lock
 *   never recorded).
 *
 * An item moves whole or not at all: one conflict or one blocked file, and
 * nothing of it is written.
 */
import { merge3, type EItem, type MergeConflict } from "@echo-ui/client";

import type { LockFile } from "./project";
import type { FileState, ItemReport } from "./status";

export type Step =
  | { path: string; do: "keep"; state: FileState }
  | { path: string; do: "write"; state: FileState; content: string }
  | { path: string; do: "merge"; content: string };

export interface ForwardPlan {
  steps: Step[];
  conflicts: { path: string; hunks: MergeConflict[] }[];
  blocked: string[];
}

export function planForward(
  report: ItemReport,
  locked: LockFile["items"][string],
  base: EItem | undefined,
  overwrite: boolean,
): ForwardPlan {
  const plan: ForwardPlan = { steps: [], conflicts: [], blocked: [] };
  for (const file of report.files) {
    if (file.latest === undefined) continue;
    const write = () => plan.steps.push({ path: file.path, do: "write", state: file.state, content: file.latest! });
    const keep = () => plan.steps.push({ path: file.path, do: "keep", state: file.state });
    switch (file.state) {
      case "current":
        keep();
        break;
      case "behind":
      case "added":
      case "missing":
        write();
        break;
      case "edited":
        if (overwrite) write();
        else keep();
        break;
      case "edited-behind": {
        if (overwrite) {
          write();
          break;
        }
        // The file as installed: only when its hash is the one the lock recorded.
        const installed = base?.files.find((f) => f.path === file.path);
        if (!installed || file.current === undefined || installed.sha256 !== locked.files[file.path]) {
          plan.blocked.push(file.path);
          break;
        }
        const merged = merge3(installed.content, file.current, file.latest);
        if (merged.ok) plan.steps.push({ path: file.path, do: "merge", content: merged.text });
        else plan.conflicts.push({ path: file.path, hunks: merged.conflicts });
        break;
      }
    }
  }
  return plan;
}

/** How many lines of one side a conflict shows before it says how many more there are. */
const SHOWN = 30;

/** A conflict as git writes one, which is how an agent expects to read it. */
export function conflictText(hunk: MergeConflict, installed: string, latest: string): string {
  const side = (lines: readonly string[]) => {
    const text = lines.slice(0, SHOWN).map((l) => l.replace(/\r?\n$/, ""));
    if (lines.length > SHOWN) text.push(`… ${lines.length - SHOWN} more lines`);
    return text;
  };
  const where = hunk.mine.to < hunk.mine.from ? `removed before line ${hunk.mine.from}` : hunk.mine.from === hunk.mine.to ? `line ${hunk.mine.from}` : `lines ${hunk.mine.from}–${hunk.mine.to}`;
  return [
    `<<<<<<< yours, ${where}`,
    ...side(hunk.mine.lines),
    `||||||| as installed, ${installed}`,
    ...side(hunk.base.lines),
    "=======",
    ...side(hunk.theirs.lines),
    `>>>>>>> Echo ${latest}`,
  ].join("\n");
}
