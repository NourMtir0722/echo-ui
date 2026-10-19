import { test, expect } from "@playwright/test";

/**
 * The sidebar keeps its place (2026-09-18).
 *
 * Every link was a plain <a>, so every click was a full page load and the
 * list came back scrolled to the top — pick something near the bottom and you
 * were thrown back to "Tools". These walk exactly that.
 */
// The site's own sidebar: a component's preview can hold an AppShell with a sidebar of its own.
const side = "nav.echo-shell__side.echo-sidenav";

async function scrollSidebarToBottom(page: import("@playwright/test").Page) {
  await page.locator(side).evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });
  return page.locator(side).evaluate((el) => el.scrollTop);
}

test("picking an item low in the list keeps the list where it was", async ({ page }) => {
  await page.goto("/docs/hardware-button");
  const before = await scrollSidebarToBottom(page);
  expect(before).toBeGreaterThan(200);

  // The lowest component in the list, whatever it is as the list grows: it's
  // on screen once the list is scrolled to the bottom, so the click itself
  // doesn't move the list.
  const low = page.locator(side).locator('a[href^="/docs/"]').last();
  const href = (await low.getAttribute("href"))!;

  // Client-side navigation: a full load would drop this marker.
  await page.evaluate(() => ((window as unknown as { __stay: boolean }).__stay = true));
  await low.click();
  await expect(page).toHaveURL(new RegExp(`${href}$`));

  expect(await page.evaluate(() => (window as unknown as { __stay?: boolean }).__stay)).toBe(true);
  const after = await page.locator(side).evaluate((el) => el.scrollTop);
  expect(Math.abs(after - before)).toBeLessThan(40);
  await expect(page.locator(side).locator(`a[href="${href}"]`)).toBeInViewport();
});

test("crossing into another section (docs → gallery) restores the position", async ({ page }) => {
  await page.goto("/docs/hardware-button");
  await scrollSidebarToBottom(page);
  // Measure where the list is once the link is on screen: clicking scrolls it
  // into view first, and that position is the one to keep.
  const link = page.locator(side).locator('a[href="/gallery/primitives"]');
  await link.scrollIntoViewIfNeeded();
  const before = await page.locator(side).evaluate((el) => el.scrollTop);
  expect(before).toBeGreaterThan(200);

  // The Data display overview is a /gallery route — a different layout, so a
  // new sidebar mounts. It must come back where the old one was.
  await link.click();
  await expect(page).toHaveURL(/\/gallery\/primitives$/);
  const after = await page.locator(side).evaluate((el) => el.scrollTop);
  expect(Math.abs(after - before)).toBeLessThan(40);
});

test("arriving from outside brings the current page into view in the list", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => sessionStorage.removeItem("echo-sidenav-scroll"));
  await page.goto("/docs/chat");
  await expect(page.locator(side).locator('a[aria-current="page"]')).toBeInViewport();
  // …without scrolling the page itself: a page you open starts at its top.
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
});

test("the sidebar fits the window below the rail, so its end is reachable", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/docs/hardware-button");
  const box = (await page.locator(side).boundingBox())!;
  expect(box.y + box.height).toBeLessThanOrEqual(720 + 1);

  // Scrolled to its end, the very last entry is on screen.
  await scrollSidebarToBottom(page);
  await expect(page.locator(side).locator("a").last()).toBeInViewport({ ratio: 1 });
});
