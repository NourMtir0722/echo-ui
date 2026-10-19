/**
 * Which lines the agent wrote.
 *
 * Every count the benchmark reports is about the agent's own code, never the
 * setup's. A setup's theme file is full of colour values on purpose, and an
 * app's starting page is whatever the setup put there. So the app is
 * committed before the agent starts, and a finding counts only when its line
 * is one the agent added or changed.
 */

/** Added line numbers per file, in the new version of each file. */
export type AddedLines = Map<string, Set<number>>;

/**
 * Reads a unified diff, with or without context lines: each hunk is walked
 * line by line, so a context line moves the count on without being counted.
 */
export function parseAddedLines(diff: string): AddedLines {
  const added: AddedLines = new Map();
  let file: string | undefined;
  let next = 0;
  for (const line of diff.split("\n")) {
    if (line.startsWith("diff --git ")) {
      file = undefined;
      continue;
    }
    if (line.startsWith("+++ ")) {
      const path = line.slice(4).trim();
      file = path === "/dev/null" ? undefined : path.replace(/^b\//, "");
      if (file && !added.has(file)) added.set(file, new Set());
      continue;
    }
    if (line.startsWith("--- ")) continue;
    const hunk = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(line);
    if (hunk) {
      next = Number(hunk[1]);
      continue;
    }
    if (!file) continue;
    if (line.startsWith("+")) added.get(file)!.add(next++);
    else if (line.startsWith(" ")) next++;
    // "-" lines and "\ No newline at end of file" don't exist in the new file.
  }
  return added;
}

/** Whether a finding at `line` in `file` is the agent's. */
export function isAdded(added: AddedLines, file: string, line: number): boolean {
  return added.get(file)?.has(line) ?? false;
}
