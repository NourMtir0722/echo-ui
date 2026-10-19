import { test, expect, type Page } from "@playwright/test";

/**
 * Wave E, navigation: SideNav, TabBar and NotificationCenter, driven on
 * their docs pages after hydration.
 */
const preview = (page: Page) => page.getByTestId("preview");
const open = (page: Page, slug: string) => page.goto(`/docs/${slug}`, { waitUntil: "networkidle" });

test.describe("SideNav", () => {
  test.beforeEach(async ({ page }) => {
    await open(page, "side-nav");
  });

  test("a named nav whose current link says so, and the rail travels to a new one", async ({ page }) => {
    const nav = preview(page).getByRole("navigation", { name: "Workspace" });
    await expect(nav.getByRole("link", { name: /^Inbox/ })).toHaveAttribute("aria-current", "page");
    const rail = nav.locator(".echo-side-nav__rail");
    const top = () => rail.evaluate((el) => el.getBoundingClientRect().top);
    const before = await top();
    await nav.getByRole("link", { name: "Guides" }).click();
    await expect(nav.getByRole("link", { name: "Guides" })).toHaveAttribute("aria-current", "page");
    await expect.poll(top).toBeGreaterThan(before + 40);
  });

  test("a badge reads as a count of new things", async ({ page }) => {
    await expect(preview(page).getByRole("link", { name: "Inbox 3 new" })).toBeVisible();
  });

  test("a nested group is a disclosure button", async ({ page }) => {
    const echo = preview(page).getByRole("button", { name: "Echo" });
    await expect(echo).toHaveAttribute("aria-expanded", "false");
    await echo.click();
    await expect(echo).toHaveAttribute("aria-expanded", "true");
    await expect(preview(page).getByRole("link", { name: "Board" })).toBeVisible();
  });

  test("folded, every link keeps its name and shows it as a tip on focus", async ({ page }) => {
    await preview(page).getByRole("button", { name: "Fold" }).click();
    const nav = preview(page).getByRole("navigation", { name: "Workspace" });
    await expect.poll(() => nav.evaluate((el) => el.getBoundingClientRect().width)).toBeLessThan(80);
    const drafts = nav.getByRole("link", { name: "Drafts" });
    await drafts.focus();
    const tip = await drafts.locator("xpath=..").evaluate((li) => getComputedStyle(li, "::after").content);
    expect(tip).toBe('"Drafts"');
  });

  test("visual: side nav", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(preview(page)).toHaveScreenshot("side-nav.png");
  });
});

test.describe("TabBar", () => {
  test("a named nav, the current destination lit and marked, at least 52px tall", async ({ page }) => {
    await open(page, "tab-bar");
    const bar = preview(page).getByRole("navigation", { name: "Main" });
    await expect(bar.getByRole("link", { name: "Today" })).toHaveAttribute("aria-current", "page");
    await bar.getByRole("link", { name: /^Inbox/ }).click();
    await expect(bar.getByRole("link", { name: /^Inbox/ })).toHaveAttribute("aria-current", "page");
    await expect(bar.getByRole("link", { name: /^Inbox\s*,\s*2 new$/ })).toBeVisible();
    const h = await bar.getByRole("link", { name: "Today" }).evaluate((el) => el.getBoundingClientRect().height);
    expect(h).toBeGreaterThanOrEqual(52);
  });

  test("visual: tab bar", async ({ page }) => {
    await open(page, "tab-bar");
    await expect(preview(page)).toHaveScreenshot("tab-bar.png");
  });
});

test.describe("NotificationCenter", () => {
  test("the bell says the count, opening one marks it read, and Mark all read clears them", async ({ page }) => {
    await open(page, "notification-center");
    const bell = preview(page).getByRole("button", { name: "Notifications, 2 unread" });
    await bell.click();
    const panel = page.getByRole("dialog", { name: "Notifications" });
    await expect(panel.getByRole("listitem")).toHaveCount(3);
    await panel.getByRole("button", { name: /Export finished/ }).click();
    await expect(preview(page).getByRole("button", { name: "Notifications, 1 unread" })).toBeVisible();
    await panel.getByRole("button", { name: "Mark all read" }).click();
    await expect(preview(page).getByRole("button", { name: "Notifications" , exact: true })).toBeVisible();
  });
});

test.describe("PullToRefresh", () => {
  test.beforeEach(async ({ page }) => {
    await open(page, "pull-to-refresh");
  });

  const pull = async (page: Page, dx: number, dy: number, release = true) => {
    const region = preview(page).locator(".echo-ptr");
    const b = (await region.boundingBox())!;
    const x = b.x + b.width / 2;
    const y = b.y + 40;
    await page.mouse.move(x, y);
    await page.mouse.down();
    for (let i = 1; i <= 12; i++) {
      await page.mouse.move(x + (dx * i) / 12, y + (dy * i) / 12);
      await page.waitForTimeout(16);
    }
    if (release) await page.mouse.up();
  };

  test("a pull past the detent arms it, and letting go refreshes", async ({ page }) => {
    const region = preview(page).locator(".echo-ptr");
    await pull(page, 0, 260, false);
    await expect(region).toHaveAttribute("data-phase", "armed");
    await expect(region.locator(".echo-ptr__hint")).toHaveText("Release to refresh");
    await page.mouse.up();
    await expect(region.getByRole("status")).toHaveText("Refreshing tasks…");
    await expect(region.getByRole("status")).toHaveText("Tasks up to date", { timeout: 5000 });
    await expect(preview(page).getByText("Updated once")).toBeVisible();
  });

  test("a short pull springs back without refreshing", async ({ page }) => {
    const region = preview(page).locator(".echo-ptr");
    await pull(page, 0, 40);
    await expect(region).toHaveAttribute("data-phase", "idle");
    await expect.poll(() => region.locator(".echo-ptr__content").evaluate((e) => e.style.translate)).toBe("");
  });

  test("a sideways drag is not a pull", async ({ page }) => {
    const region = preview(page).locator(".echo-ptr");
    await pull(page, 200, 60);
    await expect(region).toHaveAttribute("data-phase", "idle");
  });

  test("the gesture is never the only way: a Refresh button, shown on focus", async ({ page }) => {
    const button = preview(page).getByRole("button", { name: "Refresh tasks" });
    await expect(button).toBeAttached();
    await page.keyboard.press("Tab");
    await button.focus();
    await expect(button).toBeVisible();
    await page.keyboard.press("Enter");
    await expect(preview(page).getByRole("status")).toHaveText("Tasks up to date", { timeout: 5000 });
  });
});
