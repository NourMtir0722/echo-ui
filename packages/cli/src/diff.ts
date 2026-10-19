/**
 * A unified diff, in about a hundred lines.
 *
 * `diff` and `update` have to show a user what changed between their copy of a
 * component and Echo's latest, and the CLI's only dependency is Node itself —
 * so the diff is here rather than pulled in. It is line-based and it produces
 * the format everyone already reads: `@@` hunks with three lines of context.
 *
 * The expensive part is the longest common subsequence, which is O(n·m). Real
 * cases are a small edit inside a file Echo wrote, so the common prefix and
 * suffix are trimmed before the table is built and the table is usually tiny.
 * Past `MAX_LCS` lines on either side of the trimmed middle it stops being
 * worth it, and the hunk degrades to "this block was replaced" — still a
 * correct diff, just a coarser one.
 */

/** Past this many lines in the changed middle, replace the block wholesale. */
const MAX_LCS = 4000;

export type DiffOp = { kind: "same" | "add" | "remove"; line: string };

/** Lines, with the trailing newline's empty last element dropped. */
function lines(text: string): string[] {
  const split = text.replace(/\r\n/g, "\n").split("\n");
  if (split.length > 0 && split[split.length - 1] === "") split.pop();
  return split;
}

/** The edit script from `a` to `b`, one operation per line. */
export function diffLines(a: string, b: string): DiffOp[] {
  const from = lines(a);
  const to = lines(b);

  let head = 0;
  while (head < from.length && head < to.length && from[head] === to[head]) head++;
  let tail = 0;
  while (
    tail < from.length - head &&
    tail < to.length - head &&
    from[from.length - 1 - tail] === to[to.length - 1 - tail]
  ) {
    tail++;
  }

  const midFrom = from.slice(head, from.length - tail);
  const midTo = to.slice(head, to.length - tail);

  const ops: DiffOp[] = [];
  for (const line of from.slice(0, head)) ops.push({ kind: "same", line });
  ops.push(...middle(midFrom, midTo));
  for (const line of from.slice(from.length - tail)) ops.push({ kind: "same", line });
  return ops;
}

function middle(from: string[], to: string[]): DiffOp[] {
  if (from.length === 0 && to.length === 0) return [];
  if (from.length === 0) return to.map((line) => ({ kind: "add" as const, line }));
  if (to.length === 0) return from.map((line) => ({ kind: "remove" as const, line }));
  if (from.length > MAX_LCS || to.length > MAX_LCS) {
    return [
      ...from.map((line) => ({ kind: "remove" as const, line })),
      ...to.map((line) => ({ kind: "add" as const, line })),
    ];
  }

  // Classic LCS table. Rows are `from`, columns are `to`; the cell holds the
  // length of the longest common subsequence of the two suffixes.
  const width = to.length + 1;
  const table = new Uint32Array((from.length + 1) * width);
  for (let i = from.length - 1; i >= 0; i--) {
    for (let j = to.length - 1; j >= 0; j--) {
      table[i * width + j] =
        from[i] === to[j]
          ? table[(i + 1) * width + j + 1]! + 1
          : Math.max(table[(i + 1) * width + j]!, table[i * width + j + 1]!);
    }
  }

  const ops: DiffOp[] = [];
  let i = 0;
  let j = 0;
  while (i < from.length && j < to.length) {
    if (from[i] === to[j]) {
      ops.push({ kind: "same", line: from[i]! });
      i++;
      j++;
    } else if (table[(i + 1) * width + j]! >= table[i * width + j + 1]!) {
      ops.push({ kind: "remove", line: from[i]! });
      i++;
    } else {
      ops.push({ kind: "add", line: to[j]! });
      j++;
    }
  }
  for (; i < from.length; i++) ops.push({ kind: "remove", line: from[i]! });
  for (; j < to.length; j++) ops.push({ kind: "add", line: to[j]! });
  return ops;
}

export interface UnifiedOptions {
  /** Lines of unchanged context kept around each change. */
  context?: number;
  /** The `---` and `+++` labels. */
  fromLabel?: string;
  toLabel?: string;
}

/**
 * The edit script as a unified diff, or `undefined` when the two are identical.
 *
 * Returning `undefined` rather than an empty string is deliberate: "no diff"
 * is a state the callers branch on, and an empty string is too easy to print.
 */
export function unifiedDiff(a: string, b: string, options: UnifiedOptions = {}): string | undefined {
  const context = options.context ?? 3;
  const ops = diffLines(a, b);
  if (!ops.some((op) => op.kind !== "same")) return undefined;

  // Which operations are close enough to a change to be worth printing.
  const keep = new Array<boolean>(ops.length).fill(false);
  ops.forEach((op, index) => {
    if (op.kind === "same") return;
    for (let k = Math.max(0, index - context); k <= Math.min(ops.length - 1, index + context); k++) keep[k] = true;
  });

  const out: string[] = [`--- ${options.fromLabel ?? "a"}`, `+++ ${options.toLabel ?? "b"}`];
  let fromLine = 1;
  let toLine = 1;
  let index = 0;
  while (index < ops.length) {
    if (!keep[index]) {
      if (ops[index]!.kind !== "add") fromLine++;
      if (ops[index]!.kind !== "remove") toLine++;
      index++;
      continue;
    }
    const hunk: string[] = [];
    const startFrom = fromLine;
    const startTo = toLine;
    let countFrom = 0;
    let countTo = 0;
    while (index < ops.length && keep[index]) {
      const op = ops[index]!;
      if (op.kind === "same") {
        hunk.push(` ${op.line}`);
        countFrom++;
        countTo++;
        fromLine++;
        toLine++;
      } else if (op.kind === "remove") {
        hunk.push(`-${op.line}`);
        countFrom++;
        fromLine++;
      } else {
        hunk.push(`+${op.line}`);
        countTo++;
        toLine++;
      }
      index++;
    }
    out.push(`@@ -${startFrom},${countFrom} +${startTo},${countTo} @@`, ...hunk);
  }
  return out.join("\n");
}

/** How many lines the diff adds and removes — the one-line summary. */
export function diffStat(a: string, b: string): { added: number; removed: number } {
  let added = 0;
  let removed = 0;
  for (const op of diffLines(a, b)) {
    if (op.kind === "add") added++;
    else if (op.kind === "remove") removed++;
  }
  return { added, removed };
}
