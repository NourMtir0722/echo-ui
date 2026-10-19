import { test, expect, type Locator, type Page } from "@playwright/test";
import { axe } from "./axe";

/**
 * Table's data mode, on /checks/table: sort (aria-sort, the LED pips, the
 * keyboard), selection with a select-all that reads "some", a filter that
 * says what it leaves, row actions and a row press, two thousand rows
 * windowed, and the loading and empty rows.
 */
const takes = (page: Page) => page.locator("#takes");
const rowNames = (table: Locator) => table.locator("tbody tr th[scope=row]").allInnerTexts();

test.beforeEach(async ({ page }) => {
  await page.goto("/checks/table");
});

test("a sortable header sorts by it, lights its pip and carries aria-sort; again reverses", async ({ page }) => {
  const table = takes(page);
  const seconds = table.getByRole("button", { name: "Seconds" });
  const header = table.locator("th", { has: page.getByRole("button", { name: "Seconds" }) });
  await expect(header).not.toHaveAttribute("aria-sort", /./);

  await seconds.click();
  await expect(header).toHaveAttribute("aria-sort", "ascending");
  await expect(header.locator(".echo-table__pips i").first()).toHaveAttribute("data-lit", "");
  expect(await rowNames(table)).toEqual(["Vocal pass", "Room tone", "Kick close", "Overheads", "Guitar DI"]);
  await expect(page.getByRole("status").filter({ hasText: "Sorted by Seconds, ascending." })).toBeAttached();

  // From the keyboard: the header is a button.
  await seconds.focus();
  await page.keyboard.press("Enter");
  await expect(header).toHaveAttribute("aria-sort", "descending");
  await expect(header.locator(".echo-table__pips i").last()).toHaveAttribute("data-lit", "");
  expect(await rowNames(table)).toEqual(["Guitar DI", "Overheads", "Kick close", "Room tone", "Vocal pass"]);
});

test("select-all selects every row shown, and reads as mixed when some are", async ({ page }) => {
  const table = takes(page);
  const all = table.getByRole("checkbox", { name: "Select every row shown" });
  await table.getByRole("checkbox", { name: "Select Guitar DI" }).click();
  await expect(page.locator("#selected")).toHaveText("t3");
  await expect(all).toHaveAttribute("aria-checked", "mixed");

  await all.click();
  await expect(all).toHaveAttribute("aria-checked", "true");
  await expect(page.locator("#selected")).toHaveText(/^(t\d,){4}t\d$/);

  // Filtered, select-all is about the rows shown.
  await page.getByRole("searchbox", { name: "Search takes" }).fill("room");
  await all.click();
  await expect(page.locator("#selected")).not.toContainText("t1");
  await expect(page.locator("#selected")).toContainText("t3");
});

test("a filter leaves the rows that match, says how many, and says when none do", async ({ page }) => {
  const table = takes(page);
  await page.getByRole("searchbox", { name: "Search takes" }).fill("o");
  expect(await rowNames(table)).toEqual(["Room tone", "Vocal pass", "Kick close", "Overheads"]);
  await expect(page.getByRole("status").filter({ hasText: "4 of 5 rows." })).toBeAttached();
  await page.getByRole("searchbox", { name: "Search takes" }).fill("zzz");
  await expect(table.locator("tbody")).toContainText("Nothing matches “zzz”.");
});

test("a row press: its label is a button the keyboard presses, and a click on the row presses it too, but not one on its controls", async ({ page }) => {
  const table = takes(page);
  await table.getByRole("button", { name: "Vocal pass", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#pressed")).toHaveText("Vocal pass");

  await table.locator("tbody tr", { hasText: "Kick close" }).locator("td").last().click({ position: { x: 2, y: 2 } });
  await expect(page.locator("#pressed")).toHaveText("Kick close");

  await table.getByRole("button", { name: "Delete Overheads" }).click();
  await expect(page.locator("#pressed")).toHaveText("delete Overheads");
  await table.getByRole("checkbox", { name: "Select Room tone" }).click();
  await expect(page.locator("#pressed")).toHaveText("delete Overheads");
});

test("two thousand rows: only the ones in view are drawn, and their place in the whole is said", async ({ page }) => {
  const events = page.locator("#events");
  await expect(events).toHaveAttribute("aria-rowcount", "2001");
  const drawn = await events.locator("tbody tr[aria-rowindex]").count();
  expect(drawn).toBeGreaterThan(5);
  expect(drawn).toBeLessThan(40);
  await expect(events.locator("tbody tr[aria-rowindex]").first()).toHaveAttribute("aria-rowindex", "2");

  const region = page.getByRole("region", { name: "Events" });
  await region.scrollIntoViewIfNeeded();
  await region.evaluate((el) => (el.scrollTop = 32 * 1000));
  await expect(events.getByRole("rowheader", { name: "Event 1001" })).toBeVisible();
  const index = Number(await events.locator("tbody tr", { hasText: "Event 1001" }).getAttribute("aria-rowindex"));
  expect(index).toBe(1002);
  // Its header stays at the top of its own scroll.
  await expect(events.locator("thead th").first()).toBeInViewport();
});

test("loading rows keep the table busy, and an empty table says so in its own words", async ({ page }) => {
  await expect(page.locator("#loading")).toHaveAttribute("aria-busy", "true");
  await expect(page.locator("#loading tbody tr")).toHaveCount(5);
  await expect(page.locator("#empty tbody")).toHaveText("No drafts yet.");
});

test("rows slide to their new place when sorted, and don't under reduced motion", async ({ page }) => {
  const table = takes(page);
  await table.getByRole("button", { name: "Seconds" }).click();
  const moving = await table.locator("tbody tr").evaluateAll((rows) => rows.some((r) => getComputedStyle(r).transform !== "none"));
  expect(moving).toBe(true);

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();
  await takes(page).getByRole("button", { name: "Seconds" }).click();
  const still = await takes(page).locator("tbody tr").evaluateAll((rows) => rows.every((r) => getComputedStyle(r).transform === "none"));
  expect(still).toBe(true);
});

test("every state is axe-clean", { tag: "@mobile" }, async ({ page }) => {
  await takes(page).getByRole("button", { name: "Take" }).click();
  await takes(page).getByRole("checkbox", { name: "Select Room tone" }).click();
  const results = await axe(page).include("main").analyze();
  expect(results.violations.map((v) => `${v.id} (${v.nodes.length})`)).toEqual([]);
});

test("in forced colours, the lit pip still shows which way, once its light has come up", async ({ page }) => {
  await page.emulateMedia({ forcedColors: "active" });
  await page.reload();
  // A busy page, replayed: the pip's light takes its time to come up.
  await page.addStyleTag({ content: ".echo-table__pips > i { transition-duration: 1500ms !important; }" });
  const table = takes(page);
  await table.getByRole("button", { name: "Seconds" }).click();
  const pips = table.locator("th", { has: page.getByRole("button", { name: "Seconds" }) }).locator(".echo-table__pips i");
  // Read them once the light has come up: straight after the click, WebKit reads the lit pip
  // mid-transition, the same as the unlit one.
  await expect(pips.first()).toHaveAttribute("data-lit", "");
  await pips.first().evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished)));
  const [lit, unlit] = await Promise.all([pips.first(), pips.last()].map((p) => p.evaluate((el) => getComputedStyle(el).backgroundColor)));
  expect(lit).not.toBe(unlit);
});

test("visual: a sorted, selected table in the data mode", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const table = takes(page);
  await table.getByRole("button", { name: "Seconds" }).click();
  await table.getByRole("checkbox", { name: "Select Guitar DI" }).click();
  await page.mouse.move(0, 0);
  await expect(page.getByRole("region", { name: "Recent takes" })).toHaveScreenshot("table-data.png");
});
