/**
 * The page window. Pure arithmetic, kept out of the
 * component so the interesting part — where the gaps fall — is unit-testable
 * without a DOM.
 *
 * The rules: the first and last page are always reachable, the current page
 * always sits inside a run of `siblings` on each side, and the width of the
 * output never changes as you page through. That last one is why the boundary
 * cases expand the run instead of just dropping a gap — a control that
 * reflows under the cursor is how you misclick.
 */

/** A gap stands in for pages that are not currently reachable in one click. */
export const GAP = "gap" as const;

export type PageSlot = number | typeof GAP;

export interface PaginationRangeOptions {
  /** 1-based current page. */
  page: number;
  /** Total number of pages. */
  count: number;
  /** Pages shown either side of the current one. Default 1. */
  siblings?: number;
}

export function paginationRange({
  page,
  count,
  siblings = 1,
}: PaginationRangeOptions): PageSlot[] {
  if (!Number.isFinite(count) || count <= 0) return [];

  const clampedPage = Math.min(Math.max(Math.trunc(page), 1), count);
  const sib = Math.max(0, Math.trunc(siblings));

  // first + last + current + 2 gaps + the two sibling runs. Below this there
  // is nothing to elide, so show every page.
  const slotsWhenElided = sib * 2 + 5;
  if (count <= slotsWhenElided) {
    return Array.from({ length: count }, (_, i) => i + 1);
  }

  const left = Math.max(clampedPage - sib, 1);
  const right = Math.min(clampedPage + sib, count);

  // A gap that hides exactly one page is a lie that costs a click, so elide
  // only where at least two pages are actually hidden. left > 3 leaves pages
  // 2..3 behind the gap at minimum; the mirror holds on the right.
  const showLeftGap = left > 3;
  const showRightGap = right < count - 2;

  if (!showLeftGap && showRightGap) {
    // Pinned near the start: grow the head run to keep the width constant.
    const headLength = slotsWhenElided - 2;
    return [...upTo(headLength), GAP, count];
  }

  if (showLeftGap && !showRightGap) {
    const tailLength = slotsWhenElided - 2;
    return [1, GAP, ...from(count - tailLength + 1, count)];
  }

  if (showLeftGap && showRightGap) {
    return [1, GAP, ...from(left, right), GAP, count];
  }

  return Array.from({ length: count }, (_, i) => i + 1);
}

const upTo = (n: number): number[] => Array.from({ length: n }, (_, i) => i + 1);

const from = (start: number, end: number): number[] =>
  Array.from({ length: end - start + 1 }, (_, i) => start + i);
