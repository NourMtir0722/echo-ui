import { test } from "node:test";
import assert from "node:assert/strict";

import { paginationRange, GAP } from "./range";

test("shows every page when there is nothing worth eliding", () => {
  assert.deepEqual(paginationRange({ page: 1, count: 1 }), [1]);
  assert.deepEqual(paginationRange({ page: 3, count: 7 }), [1, 2, 3, 4, 5, 6, 7]);
});

test("elides toward the end when the current page is near the start", () => {
  assert.deepEqual(paginationRange({ page: 1, count: 20 }), [1, 2, 3, 4, 5, GAP, 20]);
  assert.deepEqual(paginationRange({ page: 3, count: 20 }), [1, 2, 3, 4, 5, GAP, 20]);
});

test("elides toward the start when the current page is near the end", () => {
  assert.deepEqual(paginationRange({ page: 20, count: 20 }), [1, GAP, 16, 17, 18, 19, 20]);
  assert.deepEqual(paginationRange({ page: 18, count: 20 }), [1, GAP, 16, 17, 18, 19, 20]);
});

test("elides on both sides in the middle", () => {
  assert.deepEqual(paginationRange({ page: 10, count: 20 }), [1, GAP, 9, 10, 11, GAP, 20]);
});

test("the control never changes width as you page through", () => {
  // A control that reflows under the cursor is how you misclick.
  const widths = new Set<number>();
  for (let page = 1; page <= 20; page++) {
    widths.add(paginationRange({ page, count: 20 }).length);
  }
  assert.equal(widths.size, 1, `widths varied: ${[...widths].join(", ")}`);
});

test("never elides exactly one page — a gap hiding one page costs a click", () => {
  for (let count = 1; count <= 40; count++) {
    for (let page = 1; page <= count; page++) {
      const slots = paginationRange({ page, count });
      for (let i = 0; i < slots.length; i++) {
        if (slots[i] !== GAP) continue;
        const before = slots[i - 1];
        const after = slots[i + 1];
        assert.equal(typeof before, "number");
        assert.equal(typeof after, "number");
        assert.ok(
          (after as number) - (before as number) > 2,
          `gap at ${page}/${count} hides only page ${(before as number) + 1}`,
        );
      }
    }
  }
});

test("always keeps the first and last page reachable, and the current page present", () => {
  for (let count = 1; count <= 40; count++) {
    for (let page = 1; page <= count; page++) {
      const slots = paginationRange({ page, count });
      assert.equal(slots[0], 1);
      assert.equal(slots[slots.length - 1], count);
      assert.ok(slots.includes(page), `page ${page} missing at count ${count}`);
    }
  }
});

test("pages are strictly ascending with no repeats", () => {
  for (let count = 1; count <= 40; count++) {
    for (let page = 1; page <= count; page++) {
      const nums = paginationRange({ page, count }).filter((s): s is number => s !== GAP);
      for (let i = 1; i < nums.length; i++) {
        assert.ok(nums[i]! > nums[i - 1]!, `not ascending at ${page}/${count}`);
      }
    }
  }
});

test("a wider sibling run widens the window", () => {
  assert.deepEqual(paginationRange({ page: 10, count: 20, siblings: 2 }), [
    1, GAP, 8, 9, 10, 11, 12, GAP, 20,
  ]);
});

test("clamps a page outside the range instead of producing nonsense", () => {
  assert.deepEqual(paginationRange({ page: 0, count: 5 }), [1, 2, 3, 4, 5]);
  assert.deepEqual(paginationRange({ page: 99, count: 20 }), [1, GAP, 16, 17, 18, 19, 20]);
});

test("degenerate counts produce nothing rather than throwing", () => {
  assert.deepEqual(paginationRange({ page: 1, count: 0 }), []);
  assert.deepEqual(paginationRange({ page: 1, count: -3 }), []);
});
