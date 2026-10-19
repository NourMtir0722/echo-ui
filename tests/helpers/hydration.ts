import { expect, type Browser, type Locator } from "@playwright/test";

/**
 * Wait until React has hydrated `locator`'s element. A key pressed on a
 * server-rendered control before then reaches no handler: focus is real,
 * the keys go nowhere. The load event can come first, in WebKit most of all.
 * A test that slows the CPU on purpose gives it longer (`timeout`).
 */
export async function hydrated(locator: Locator, timeout = 15_000): Promise<void> {
  await expect
    .poll(() => locator.evaluate((el) => Object.keys(el).some((k) => k.startsWith("__reactProps$"))), { timeout })
    .toBe(true);
}

/**
 * How many of `batches × perBatch` parallel loads of `url` hydrated with a
 * React-generated id that differs from the server's.
 *
 * React doesn't report this in production, so it's measured directly: each
 * element's id in the DOM is the server's; the id React's client props hold
 * is the client's. They must agree. Loads run in parallel because the bug
 * shows when a client chunk arrives late, which load makes more likely.
 */
export async function countIdDivergence(browser: Browser, url: string, batches = 3, perBatch = 12): Promise<number> {
  let diverged = 0;
  for (let batch = 0; batch < batches; batch++) {
    const results = await Promise.all(
      Array.from({ length: perBatch }, async () => {
        const context = await browser.newContext();
        const page = await context.newPage();
        await page.goto(url, { waitUntil: "load", timeout: 60_000 });
        await page.waitForTimeout(1500);
        const mismatch = await page.evaluate(() =>
          [...document.querySelectorAll<HTMLElement>("[id]")].some((el) => {
            if (!/_R_/.test(el.id)) return false;
            const key = Object.keys(el).find((k) => k.startsWith("__reactProps$"));
            const props = key ? (el as unknown as Record<string, { id?: string }>)[key] : undefined;
            return props?.id !== undefined && props.id !== el.id;
          }),
        );
        await context.close();
        return mismatch;
      }),
    );
    diverged += results.filter(Boolean).length;
  }
  return diverged;
}
