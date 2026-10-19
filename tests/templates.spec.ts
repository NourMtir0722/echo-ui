import { test, expect } from "@playwright/test";
import { budgetPages } from "./helpers/budget";
import { axe } from "./axe";

/**
 * The templates.
 *
 * A template is a whole screen, so what is asserted here is what a screen has
 * to get right and a component cannot be asked to: one heading outline, one
 * main landmark, a keyboard path from the first control to the commit, and the
 * flows actually working.
 */
const SLUGS = ["console", "chat"] as const;

for (const slug of ["/templates", ...SLUGS.map((s) => `/templates/${s}`)]) {
  test(`is axe-clean: ${slug}`, { tag: "@mobile" }, async ({ page }) => {
    await page.goto(slug);
    const results = await axe(page).analyze();
    expect(results.violations.map((v) => `${v.id} (${v.nodes.length})`)).toEqual([]);
  });
}

test("every template route keeps one main landmark and one h1", async ({ page }) => {
  budgetPages(SLUGS.length);
  for (const slug of SLUGS) {
    await page.goto(`/templates/${slug}`);
    // Each screen owns an <h1> when it owns the page; inside the docs chrome it
    // must give that up, which is what `embedded` is for.
    await expect(page.locator("main"), slug).toHaveCount(1);
    await expect(page.locator("h1"), slug).toHaveCount(1);
  }
});

test("each template links its install command and says what it proves", async ({ page }) => {
  budgetPages(SLUGS.length);
  for (const slug of SLUGS) {
    await page.goto(`/templates/${slug}`);
    await expect(page.locator("pre").first()).toContainText(`npx echo-ui-cli add ${slug}`);
    // The "what this proves" note is the reason a template exists at all.
    await expect(page.locator(".echo-tpl__proves")).not.toBeEmpty();
    await expect(page.getByTestId("template-stage")).toBeVisible();
  }
});

test("the templates on their way are named, and lead nowhere yet", async ({ page }) => {
  await page.goto("/templates");
  const soon = page.locator(".echo-tlist__row[data-soon]");
  await expect(soon).toHaveCount(4);
  for (const title of ["Auth", "Marketing", "Settings", "Mobile app"]) {
    await expect(soon.filter({ hasText: title })).toContainText("Coming soon");
  }
  // Named only: no link, no route behind them.
  await expect(soon.locator("a")).toHaveCount(0);
});

test.describe("Chat", () => {
  test("sending puts your message in the log and a reply after it", async ({ page }) => {
    await page.goto("/templates/chat");
    const log = page.getByRole("log");
    const input = page.getByRole("textbox", { name: "Message Echo", exact: true });

    // Send is off until there is something to send.
    await expect(page.getByRole("button", { name: "Send", exact: true })).toBeDisabled();

    await input.fill("Bounce the take to WAV");
    await input.press("Enter");
    await expect(log).toContainText("Bounce the take to WAV");
    await expect(input).toHaveValue("");
    await expect(log).toContainText("Done. It is on the device.");
  });

  test("Shift+Enter is a new line, not a send", async ({ page }) => {
    await page.goto("/templates/chat");
    const input = page.getByRole("textbox", { name: "Message Echo", exact: true });
    await input.fill("first line");
    await input.press("Shift+Enter");
    await input.pressSequentially("second");
    await expect(input).toHaveValue("first line\nsecond");
  });

  test("the typing indicator is not inside the log", async ({ page }) => {
    await page.goto("/templates/chat");
    await expect(page.getByRole("log").getByRole("status")).toHaveCount(0);
  });
});

test.describe("Console", () => {
  test("switching channel updates the screen and the chart's name", async ({ page }) => {
    await page.goto("/templates/console");

    await expect(page.getByRole("heading", { name: "Channel 1", level: 2 })).toBeVisible();
    await page.getByRole("button", { name: /Channel 2/ }).click();
    await expect(page.getByRole("heading", { name: "Channel 2", level: 2 })).toBeVisible();

    // The chart is one role="img"; its name has to follow the channel or the
    // reading is attributed to the wrong input.
    await expect(page.getByRole("img", { name: /Channel 2 input level/ })).toBeVisible();
  });

  test("the level matrix is named and summarised, not a decorative rectangle", async ({ page }) => {
    await page.goto("/templates/console");
    const chart = page.getByRole("img", { name: /input level/ });
    const name = (await chart.getAttribute("aria-label")) ?? "";
    expect(name).toMatch(/\d+ samples/);
    expect(name).toMatch(/ending at/);
  });

  test("exactly one readout is lit", async ({ page }) => {
    await page.goto("/templates/console");
    // The accent marks the one reading that matters. Six lit tiles mark
    // nothing, which is what the first build of this screen did.
    await expect(page.locator(".echo-stat-tile")).toHaveCount(6);
    await expect(page.locator(".echo-stat-tile[data-glow]")).toHaveCount(1);
  });

  test("the takes table names itself and its state column carries words", async ({ page }) => {
    await page.goto("/templates/console");
    await expect(page.getByRole("table", { name: "Recorded takes" })).toBeVisible();
    // Colour alone is not a message.
    await expect(page.getByText("Kept").first()).toBeVisible();
    await expect(page.getByText("Review").first()).toBeVisible();
  });
});

test("the homepage links every template, under the screen it frames", async ({ page }) => {
  await page.goto("/");
  const objects = page.locator(".objects");
  for (const slug of SLUGS) {
    await expect(page.locator(`a[href="/templates/${slug}"]`)).toHaveCount(1);
    await expect(objects.locator(`a[href="/templates/${slug}"]`)).toHaveCount(1);
  }
});
