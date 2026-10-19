import { test } from "@playwright/test";

/**
 * Time for a test that visits a list of pages: its own 30s, and a slice for
 * each page. A fixed budget ran out whenever WebKit, under a full
 * run's load, was merely slow: the pages kept loading until the clock
 * stopped the test partway through. Call it once the list is known.
 */
export function budgetPages(count: number, perPage = 2_000): void {
  test.setTimeout(30_000 + count * perPage);
}
