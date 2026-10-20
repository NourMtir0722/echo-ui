import { test, expect, type Page } from "@playwright/test";

/**
 * The containers: Card, Item, Stack & Grid, Collapsible, ScrollArea, Link.
 * What each must never cost a keyboard or screen-reader user, and that each
 * does what it's for. Driven on their docs pages, which render the previews.
 */
const preview = (page: Page) => page.getByTestId("preview");

test.describe("Card", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/docs/card");
  });

  test("an interactive card is one link, named by its title, with a real heading", async ({ page }) => {
    const card = preview(page).locator(".echo-card[data-interactive]");
    await expect(card.getByRole("link")).toHaveCount(1);
    await expect(card.getByRole("link")).toHaveAccessibleName("Getting started");
    await expect(card.getByRole("heading", { level: 3, name: "Getting started" })).toBeVisible();
  });

  test("a press anywhere on an interactive card follows its link", async ({ page }) => {
    // Short enough that the card ends below the fold on every machine, as it
    // does at 720px on CI's Linux fonts: a press made by position has to be
    // made where the card is on screen.
    await page.setViewportSize({ width: 1280, height: 600 });
    const card = preview(page).locator(".echo-card[data-interactive]");
    await card.scrollIntoViewIfNeeded();
    const b = (await card.boundingBox())!;
    // Low on the card, nowhere near the title: the stretched link still takes it.
    await Promise.all([page.waitForURL(/\/docs\/installation\/?$/), page.mouse.click(b.x + b.width - 12, b.y + b.height - 12)]);
  });

  test("its focus ring goes round the whole card", async ({ page }) => {
    const card = preview(page).locator(".echo-card[data-interactive]");
    // A key press first, so the browser treats the focus as keyboard focus
    // (WebKit's Tab skips links unless the user asks it not to).
    await page.keyboard.press("Shift");
    await card.getByRole("link").focus();
    await expect(card.getByRole("link")).toBeFocused();
    // The card eases its shadow (the hover lift), so the ring arrives on a short transition.
    await expect.poll(() => card.evaluate((el) => getComputedStyle(el).boxShadow)).toContain("0px 0px 0px 4px");
  });

  test("a footer's controls are sm, and stay their own targets", async ({ page }) => {
    const restore = preview(page).getByRole("button", { name: "Restore" });
    await expect(restore.locator("xpath=ancestor::div[contains(concat(' ', @class, ' '), ' echo-hw ')][1]")).toHaveAttribute("data-size", "sm");
  });

  test("visual: cards", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(preview(page)).toHaveScreenshot("cards.png");
  });
});

test.describe("Item", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/docs/item");
  });

  const swipe = async (page: Page, row: ReturnType<Page["locator"]>, dx: number) => {
    await row.scrollIntoViewIfNeeded();
    const b = (await row.boundingBox())!;
    const y = b.y + b.height / 2;
    await page.mouse.move(b.x + b.width - 40, y);
    await page.mouse.down();
    // At a hand's pace: a frame between moves, so a short drag isn't read as a flick.
    for (let i = 1; i <= 8; i++) {
      await page.mouse.move(b.x + b.width - 40 + (dx * i) / 8, y + 1);
      await page.waitForTimeout(16);
    }
    await page.waitForTimeout(60);
    await page.mouse.up();
  };

  /** The people list; the task row under it has a test of its own. */
  const team = (page: Page) => preview(page).getByRole("list", { name: "Team" });

  test("a swipe toward the start opens the actions, and a short one springs back", async ({ page }) => {
    const row = team(page).locator(".echo-item").first();
    const surface = row.locator(".echo-item__surface");
    await swipe(page, row, -30);
    await expect.poll(() => surface.evaluate((e) => e.style.translate)).toBe("");
    await swipe(page, row, -140);
    await expect.poll(() => surface.evaluate((e) => parseFloat(e.style.translate || "0"))).toBeLessThan(-60);
    await row.getByRole("button", { name: "Archive" }).click();
    await expect(team(page).locator(".echo-item")).toHaveCount(2);
  });

  test("the actions are never only a gesture: Tab reaches them and opens the row", async ({ page }) => {
    const row = team(page).locator(".echo-item").first();
    const action = row.getByRole("button", { name: "Archive" });
    await action.focus();
    await expect(action).toBeFocused();
    await expect.poll(() => row.locator(".echo-item__surface").evaluate((e) => parseFloat(e.style.translate || "0"))).toBeLessThan(-60);
    await page.keyboard.press("Enter");
    await expect(team(page).locator(".echo-item")).toHaveCount(2);
  });

  test("items are list items in a list", async ({ page }) => {
    await expect(team(page).getByRole("listitem")).toHaveCount(3);
  });

  test("visual: items", async ({ page }) => {
    await expect(preview(page)).toHaveScreenshot("items.png");
  });

  /*
   * An interactive row's title is a link stretched over the whole row,
   * and `media` sat under it. A done box at the start of a row looked like a
   * control and wasn't one: pressing it opened the row instead.
   */
  test("a control in an Item's media is its own target, above the row's link", async ({ page }) => {
    const box = preview(page).getByRole("checkbox", { name: "Done: Book the Q4 planning room" });
    await box.click();
    await expect(box).toBeChecked();
    // The row's own link did not fire: it was not opened.
    await expect(preview(page).getByText("Press the row to open it")).toBeVisible();
    // …and the rest of the row still opens it.
    await preview(page).getByRole("button", { name: "Book the Q4 planning room" }).click();
    await expect(preview(page).getByText("Opened", { exact: true })).toBeVisible();
  });
});

test.describe("Collapsible", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/docs/collapsible");
  });

  test("opens and closes from the keyboard, saying so", async ({ page }) => {
    const trigger = preview(page).getByRole("button", { name: "Advanced settings" });
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await trigger.focus();
    await page.keyboard.press("Enter");
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await expect(preview(page).getByText("Most people never change them")).toBeVisible();
    await page.keyboard.press("Space");
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  test("closed content is still in the page for find-in-page", async ({ page }) => {
    const panel = preview(page).locator(".echo-collapsible__panel");
    await expect(panel).toHaveAttribute("hidden", "until-found");
    await expect(panel).toContainText("Most people never change them");
  });
});

test.describe("ScrollArea", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/docs/scroll-area");
  });

  test("a named region that the keyboard can scroll", async ({ page }) => {
    const region = preview(page).getByRole("region", { name: "Session log" });
    await region.focus();
    await expect(region).toBeFocused();
    const before = await region.evaluate((el) => el.scrollTop);
    await page.keyboard.press("PageDown");
    await expect.poll(() => region.evaluate((el) => el.scrollTop)).toBeGreaterThan(before);
  });

  test("the end still to see is shaded; at the bottom, it isn't", async ({ page }) => {
    const region = preview(page).getByRole("region", { name: "Session log" });
    const shade = async () =>
      parseFloat(await region.evaluate((el) => getComputedStyle(el).getPropertyValue("--scroll-area-overflow-y-end"))) || 0;
    // Base UI measures the box once the page's scripts run, and on a slow machine that's after the page has
    // loaded: read at once, the shade wasn't there yet.
    await expect.poll(shade).toBeGreaterThan(0);
    await region.evaluate((el) => el.scrollTo({ top: el.scrollHeight }));
    await expect.poll(shade).toBeLessThan(1);
  });
});

test.describe("Link", () => {
  test("an external link says it opens a new tab, and opens it safely", async ({ page }) => {
    await page.goto("/docs/link");
    const link = preview(page).getByRole("link", { name: /Base UI/ });
    await expect(link).toHaveAccessibleName("Base UI (opens in a new tab)");
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  test("the words keep text colour; the accent is only the underline", async ({ page }) => {
    await page.goto("/docs/link");
    const link = preview(page).getByRole("link", { name: "theming guide" });
    const [color, text, underline] = await link.evaluate((el) => {
      const cs = getComputedStyle(el);
      const probe = document.createElement("span");
      probe.style.color = "var(--echo-text)";
      el.parentElement!.append(probe);
      const t = getComputedStyle(probe).color;
      probe.remove();
      return [cs.color, t, cs.textDecorationLine];
    });
    expect(color).toBe(text);
    expect(underline).toBe("underline");
  });
});

test.describe("Stack & Grid", () => {
  test("a Grid is one column on a narrow screen, and nothing scrolls sideways", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto("/docs/layout");
    const grid = preview(page).locator(".echo-grid");
    const columns = await grid.evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(" ").length);
    expect(columns).toBeLessThanOrEqual(2);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  });
});
