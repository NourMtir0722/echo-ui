/**
 * A three-way merge, line by line: the file as it was installed (base), the
 * file as the builder has it now (mine), and the file as Echo ships it now
 * (theirs). Where only one side changed a stretch, that side wins; where both
 * changed it the same way, once; where both changed it differently, it's a
 * conflict, and nothing is guessed.
 *
 * The classic diff3: each side is matched to the base by their longest
 * common subsequence of lines, and a base line matched on both sides is a
 * point where all three agree. Between two such points is a stretch to
 * decide. One addition: a stretch where your side already carries Echo's
 * change is yours, so a conflict resolved by hand merges the next time.
 */

export interface MergeConflict {
  /** Your side: its lines, and where they are in your file (1-based, inclusive; `to` < `from` when you removed them). */
  mine: { from: number; to: number; lines: string[] };
  /** The stretch as it was installed. */
  base: { lines: string[] };
  /** The stretch as Echo ships it now. */
  theirs: { lines: string[] };
}

export type Merged = { ok: true; text: string } | { ok: false; conflicts: MergeConflict[] };

/** The lines of a text, each with its newline (the last may have none). CRLF reads as LF. */
function lines(text: string): string[] {
  return text.replace(/\r\n/g, "\n").match(/[^\n]*\n|[^\n]+$/g) ?? [];
}

/** More than this many lines, compared both ways, and the merge declines rather than stall. */
const MOST = 25_000_000;

/**
 * For each line of `a`, the line of `b` it's matched to in their longest
 * common subsequence, or -1. Increasing wherever it's set. The common prefix
 * and suffix are matched first, so an ordinary edit leaves a small middle.
 */
function matching(a: readonly string[], b: readonly string[]): Int32Array | undefined {
  const match = new Int32Array(a.length).fill(-1);
  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) {
    match[start] = start;
    start++;
  }
  let endA = a.length;
  let endB = b.length;
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) {
    endA--;
    endB--;
    match[endA] = endB;
  }
  const rows = endA - start;
  const cols = endB - start;
  if (rows === 0 || cols === 0) return match;
  if (rows * cols > MOST) return undefined;
  const w = cols + 1;
  const lcs = new Uint32Array((rows + 1) * w);
  for (let i = rows - 1; i >= 0; i--) {
    for (let j = cols - 1; j >= 0; j--) {
      lcs[i * w + j] = a[start + i] === b[start + j] ? lcs[(i + 1) * w + j + 1]! + 1 : Math.max(lcs[(i + 1) * w + j]!, lcs[i * w + j + 1]!);
    }
  }
  for (let i = 0, j = 0; i < rows && j < cols; ) {
    if (a[start + i] === b[start + j]) {
      match[start + i] = start + j;
      i++;
      j++;
    } else if (lcs[(i + 1) * w + j]! >= lcs[i * w + j + 1]!) i++;
    else j++;
  }
  return match;
}

const same = (x: readonly string[], y: readonly string[]) => x.length === y.length && x.every((line, n) => line === y[n]);

/**
 * Whether your side of a stretch already carries Echo's change to it: every
 * line Echo added is there, in order, and every base line Echo removed is
 * gone. That's a conflict resolved by hand (or a fix copied in), and taking
 * yours loses nothing of Echo's.
 */
function carries(b: readonly string[], m: readonly string[], t: readonly string[]): boolean {
  const bt = matching(b, t);
  const bm = matching(b, m);
  if (!bt || !bm) return false;
  if (b.some((_, n) => bt[n]! < 0 && bm[n]! >= 0)) return false;
  const kept = new Set(bt);
  const added = t.filter((_, n) => !kept.has(n));
  const fromBase = new Set(bm);
  const yours = m.filter((_, n) => !fromBase.has(n));
  let at = 0;
  for (const line of yours) if (line === added[at]) at++;
  return at === added.length;
}

/**
 * Merge Echo's change (base → theirs) into the builder's copy (mine). The
 * result keeps mine's line endings: CRLF in, CRLF out.
 */
export function merge3(baseText: string, mineText: string, theirsText: string): Merged {
  const [base, mine, theirs] = [lines(baseText), lines(mineText), lines(theirsText)];
  const toMine = matching(base, mine);
  const toTheirs = matching(base, theirs);
  if (!toMine || !toTheirs) {
    return { ok: false, conflicts: [{ mine: { from: 1, to: mine.length, lines: mine }, base: { lines: base }, theirs: { lines: theirs } }] };
  }

  const out: string[] = [];
  const conflicts: MergeConflict[] = [];
  let [i, j, k] = [0, 0, 0];
  for (;;) {
    // The next base line all three still share.
    let next = i;
    while (next < base.length && (toMine[next]! < 0 || toTheirs[next]! < 0)) next++;
    const [m1, t1] = next < base.length ? [toMine[next]!, toTheirs[next]!] : [mine.length, theirs.length];
    const [b, m, t] = [base.slice(i, next), mine.slice(j, m1), theirs.slice(k, t1)];
    if (b.length || m.length || t.length) {
      if (same(m, b)) out.push(...t);
      else if (same(t, b) || same(m, t) || carries(b, m, t)) out.push(...m);
      else {
        conflicts.push({ mine: { from: j + 1, to: m1, lines: m }, base: { lines: b }, theirs: { lines: t } });
        out.push(...m);
      }
    }
    if (next >= base.length) break;
    out.push(base[next]!);
    [i, j, k] = [next + 1, m1 + 1, t1 + 1];
  }
  if (conflicts.length) return { ok: false, conflicts };
  const text = out.join("");
  return { ok: true, text: /\r\n/.test(mineText) ? text.replace(/\n/g, "\r\n") : text };
}
