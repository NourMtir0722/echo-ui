import { test, expect } from "@playwright/test";
import { budgetPages } from "./helpers/budget";
import { APP_ROUTES, docRoutes, findHorizontalOverflow, formatOverflow } from "./helpers/layout";

/**
 * Reflow and text resize (WCAG 1.4.10, 1.4.4).
 *
 * 1.4.10 is measured at 320 CSS pixels wide — what a 1280px screen gives at
 * 400% zoom — and asks that content still works in one column without
 * scrolling in two directions. layout.spec.ts covers 390 (a phone); this is
 * the narrower case the criterion actually names.
 *
 * It found a missing rule the moment the component pages had changelog entries to
 * render: `.doc-changelog__text` had no `overflow-wrap`, and an entry naming
 * `BaseSwitch.Root.ChangeEventDetails` is one word wider than a 272px column.
 * A sweep over every route is what catches a rule that is missing rather than
 * wrong — nobody writes a test for the page they did not think about.
 *
 * 1.4.4 is the reader who doubles their browser's default text size. That is
 * set through the browser, not through CSS, so it is emulated here the same
 * way (Page.setFontSizes): `rem` sizes AND `rem` media queries respond, which
 * is what lets a layout fold into one column instead of overflowing.
 */
async function sweep(page: import("@playwright/test").Page, routes: string[]): Promise<string[]> {
  budgetPages(routes.length);
  const problems: string[] = [];
  for (const route of routes) {
    await page.goto(route);
    const offenders = await findHorizontalOverflow(page);
    if (offenders.length) problems.push(`${route}: ${formatOverflow(offenders).join(", ")}`);
  }
  return problems;
}

// On the homepage at 320, the AI sheet's keys stuck out of their step, and the foot's lockup and heap
// out of the panel's column.
test("every route reflows into 320px without scrolling sideways", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 512 });
  expect(await sweep(page, [...APP_ROUTES, ...(await docRoutes(page))])).toEqual([]);
});

/*
 * A tablet held sideways, or a small laptop: wide enough for the docs
 * sidebar, so the content column is at its narrowest while the window still
 * looks wide. A layout that picks its breakpoint by the window rather than
 * its column breaks here first.
 */
test("every route holds at 1024px, beside the docs sidebar", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  expect(await sweep(page, [...APP_ROUTES, ...(await docRoutes(page))])).toEqual([]);
});

test("every route survives a doubled browser text size", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "needs a CDP session, which only Chromium exposes");
  await page.setViewportSize({ width: 1024, height: 768 });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Page.setFontSizes", { fontSizes: { standard: 32, fixed: 26 } });
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).fontSize)).toBe("32px");
  expect(await sweep(page, [...APP_ROUTES, ...(await docRoutes(page))])).toEqual([]);
});

/*
 * At 320px the finished logo lockup on /brand/identity is 266px wide
 * in a 224px column, so its wordmark was cut off by the stage. The sweep above
 * only caught it now and then, when it happened to measure mid-boot, while the
 * flower is centred on its own. Reduced motion shows the finished lockup at
 * once, so this measures it every time.
 */
test("the logo lockup fits a 320px column", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 320, height: 512 });
  await page.goto("/brand/identity");
  const boot = page.locator(".brand-boot").first();
  await expect(boot).toBeVisible();
  const spill = await boot.evaluate((el) => {
    const box = el.getBoundingClientRect();
    const right = Math.max(...[...el.querySelectorAll("*")].map((k) => k.getBoundingClientRect().right));
    return { scroll: el.scrollWidth - el.clientWidth, right: Math.round(right - box.right) };
  });
  expect(spill.scroll, "the lockup scrolls inside its button").toBeLessThanOrEqual(1);
  expect(spill.right, "the lockup reaches past its button's right edge").toBeLessThanOrEqual(1);
});

/*
 * Scaled to its column from a layout effect, the lockup would keep its full
 * 266px in a 224px column until the page hydrated, and for good without
 * JavaScript, and the stage would cut its flower off. The sweep above catches
 * that whenever it measures before hydration.
 */
test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });
  test("the logo lockup fits a 320px column before any script runs", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 512 });
    await page.goto("/brand/identity");
    const spill = await page.locator(".brand-stage").first().evaluate((stage) =>
      [stage, ...stage.querySelectorAll("*")]
        .filter((el) => el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflowX !== "auto")
        .map((el) => `${el.tagName.toLowerCase()} ${el.scrollWidth} > ${el.clientWidth}`),
    );
    expect(spill, "the lockup spills out of its column").toEqual([]);
  });
});

/*
 * The Sound page chose its layout by the window's width, not the
 * column's. At 1024px the docs sidebar leaves the recipe cards 696px, the
 * three-column layout stayed, and each fader's track was squeezed to 28px.
 */
test("the Sound page's faders keep a usable track at tablet-landscape width", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 800 });
  await page.goto("/audition");
  expect(formatOverflow(await findHorizontalOverflow(page))).toEqual([]);
  const tracks = await page
    .locator(".aud-param .echo-slider__track")
    .evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().width)));
  expect(tracks.length).toBeGreaterThan(0);
  expect(Math.min(...tracks), `fader tracks: ${tracks.join(", ")}px`).toBeGreaterThanOrEqual(64);
});
