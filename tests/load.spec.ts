import { test, expect } from "@playwright/test";

/*
 * One test at a time. Every test here times something, and the
 * config runs tests fully parallel: side by side, the LCP measurement timed
 * twelve docs pages loading instead of the homepage.
 */
test.describe.configure({ mode: "default" });

/**
 * Pages must survive being loaded many at once: the test suite does it on
 * every run, and a page that only loads alone is a page that times out there.
 *
 * The server gzipped every response on its one thread, so twelve
 * pages loading together took 16-32s each. Uncompressed, they take well
 * under a second; 20s leaves room for a busy machine.
 */
test("twelve docs pages loading at once each load within 20s", async ({ browser }) => {
  test.setTimeout(90_000);
  const times = await Promise.all(
    Array.from({ length: 12 }, async () => {
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      const start = Date.now();
      await page.goto("/docs/kbd", { waitUntil: "load", timeout: 60_000 });
      const took = Date.now() - start;
      await ctx.close();
      return took;
    }),
  );
  expect(Math.max(...times), `load times: ${times.join(", ")}ms`).toBeLessThan(20_000);
});

/**
 * The homepage's LCP with the hero interactive. Throttled to 4x CPU and
 * roughly Fast 3G, because the budget is meaningless on an unthrottled dev
 * machine, and measured here, after every other project, because it is
 * meaningless on a machine busy with the rest of the suite too.
 */
test("LCP stays under budget on a throttled connection, hero interactive", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "needs a CDP session, which only Chromium exposes");
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: 150,
    downloadThroughput: (1.6 * 1024 * 1024) / 8,
    uploadThroughput: (750 * 1024) / 8,
  });
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });

  await page.goto("/", { waitUntil: "load" });

  const lcp = await page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        let value = 0;
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) value = entry.startTime;
        }).observe({ type: "largest-contentful-paint", buffered: true });
        setTimeout(() => resolve(value), 2500);
      }),
  );

  expect(lcp).toBeGreaterThan(0);
  expect(lcp).toBeLessThan(2500);

  // "Interactive" is the half that matters: a fast paint of a dead device
  // would pass a bare LCP assertion and fail the actual requirement.
  await page.locator(".hero4").getByRole("button", { name: "Pause", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".hero4").getByRole("button", { name: "Start", exact: true })).toBeVisible();
});
