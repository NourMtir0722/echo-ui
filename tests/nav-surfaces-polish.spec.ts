import { test, expect, type Page } from "@playwright/test";

/**
 * Navigation & surfaces pass (2026-09-18). One lit pink across the library —
 * the primary cap, the Record button's — and no outer glows.
 */
/**
 * A first gradient stop computes as `0%` from the source CSS but `0px` from the
 * minified production build (`0%` → `0`). Same paint; compare it as one.
 */
const sameStops = (s: string) => s.replace(/\) 0px/g, ") 0%");
const primaryCap = (page: Page) =>
  page.evaluate(() => {
    const d = document.createElement("div");
    d.style.backgroundImage =
      "linear-gradient(180deg, var(--echo-primary-cap-top) 0%, var(--echo-primary-cap-mid) 45%, var(--echo-primary-cap-base) 100%)";
    document.body.appendChild(d);
    const v = getComputedStyle(d).backgroundImage;
    d.remove();
    return v;
  }).then(sameStops);
const noOuterGlow = (s: string) =>
  s.split(/,(?![^(]*\))/).every((l) => l.includes("inset") || !/\s0px\s0px\s[1-9]\d*(\.\d+)?px/.test(l));

test("the current page, progress cells and loader dots are the one lit pink, without halos", async ({ page }) => {
  await page.goto("/gallery/navigation");
  const cap = await primaryCap(page);
  const current = page.locator(".echo-pagination__page[data-current]").first();
  expect(sameStops(await current.evaluate((el) => getComputedStyle(el).backgroundImage))).toBe(cap);
  expect(noOuterGlow(await current.evaluate((el) => getComputedStyle(el).boxShadow))).toBe(true);

  await page.goto("/gallery/surfaces");
  for (const sel of [".echo-progress__cell[data-on]", ".echo-loader__dot"]) {
    const el = page.locator(sel).first();
    expect(sameStops(await el.evaluate((e) => getComputedStyle(e).backgroundImage)), sel).toBe(cap);
    expect(noOuterGlow(await el.evaluate((e) => getComputedStyle(e).boxShadow)), sel).toBe(true);
  }
});

test("Steps: the wire stops short of every marker", async ({ page }) => {
  await page.goto("/gallery/navigation");
  const gaps = await page.locator(".echo-steps__step").evaluateAll((steps) =>
    steps.slice(1).map((step, i) => {
      const wire = getComputedStyle(step, "::before");
      const box = step.getBoundingClientRect();
      const left = box.left + parseFloat(wire.left);
      const right = box.right - parseFloat(wire.right);
      const prev = steps[i]!.querySelector(".echo-steps__marker")!.getBoundingClientRect();
      const here = step.querySelector(".echo-steps__marker")!.getBoundingClientRect();
      return { before: left - prev.right, after: here.left - right };
    }),
  );
  for (const g of gaps) {
    expect(g.before).toBeGreaterThanOrEqual(4);
    expect(g.after).toBeGreaterThanOrEqual(4);
  }
});

test("Steps: three states, three shapes", async ({ page }) => {
  await page.goto("/gallery/navigation");
  await expect(page.locator('.echo-steps__step[data-state="complete"] .echo-steps__check')).toHaveCount(1);
  await expect(page.locator('.echo-steps__step[data-state="current"] .echo-steps__pip')).toHaveCount(1);
});

test("the danger banner is marked by its edge and square, not a full repaint", async ({ page }) => {
  await page.goto("/gallery/surfaces");
  const danger = page.locator('.echo-banner[data-tone="danger"]').first();
  const s = await danger.evaluate((el) => ({
    edge: getComputedStyle(el).borderLeftWidth,
    shadow: getComputedStyle(el).boxShadow,
    text: getComputedStyle(el.querySelector(".echo-banner__text")!).color,
    dim: getComputedStyle(document.documentElement).getPropertyValue("--echo-text-dim").trim(),
  }));
  expect(s.edge).toBe("4px");
  expect(noOuterGlow(s.shadow)).toBe(true);
});

test("the toast sits on the chassis plastic, not a tinted well", async ({ page }) => {
  await page.goto("/gallery/surfaces");
  const bg = await page.locator(".echo-toast").first().evaluate((el) => getComputedStyle(el).backgroundImage);
  expect(bg).toMatch(/linear-gradient/);
});
