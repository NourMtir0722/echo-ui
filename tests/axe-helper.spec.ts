import { test, expect } from "@playwright/test";
import { axe } from "./axe";

/**
 * The docs sweep scanned each page the moment it loaded, while
 * CountBadge's number was still rolling up from transparent, so axe measured
 * the contrast of a number halfway in and failed /docs/count-badge now and
 * then. A scan waits for what's entering to land; what loops forever (a
 * spinner) it doesn't wait for.
 */
test("an axe scan waits for an entrance to land, and not for a loop", async ({ page }) => {
  await page.setContent(`
    <style>
      @keyframes enter { from { opacity: 0.15 } }
      @keyframes spin { to { transform: rotate(1turn) } }
      body { background: #fff; }
      p { color: #111; font: 16px sans-serif; animation: enter 1.5s linear; }
      i { display: inline-block; width: 8px; height: 8px; background: #111; animation: spin 1s linear infinite; }
    </style>
    <main><p>Two unread messages</p><i aria-hidden="true"></i></main>
  `);
  const started = Date.now();
  const results = await axe(page).withRules(["color-contrast"]).analyze();
  expect(results.violations.map((v) => v.id)).toEqual([]);
  expect(Date.now() - started).toBeLessThan(5_000);
});
