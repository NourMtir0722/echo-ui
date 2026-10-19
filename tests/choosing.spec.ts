import { test, expect, type Page } from "@playwright/test";

/**
 * Wave D, choosing: Combobox, TagsInput, Fieldset, CheckboxGroup, Form's
 * error summary, HoldButton and ChoiceCards. Driven on their docs pages,
 * after hydration (they're keyboard-driven).
 */
const preview = (page: Page) => page.getByTestId("preview");
const open = (page: Page, slug: string) => page.goto(`/docs/${slug}`, { waitUntil: "networkidle" });

test.describe("Combobox", () => {
  test.beforeEach(async ({ page }) => {
    await open(page, "combobox");
  });

  test("typing narrows the list and Enter chooses", async ({ page }) => {
    const country = preview(page).getByRole("combobox", { name: "Country" });
    await country.fill("den");
    const list = page.getByRole("listbox");
    await expect(list.getByRole("option")).toHaveCount(1);
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await expect(country).toHaveValue("Denmark");
  });

  test("multiple keeps choices as named tags, and each can be taken out", async ({ page }) => {
    const who = preview(page).getByRole("combobox", { name: "Assignees" });
    await expect(preview(page).getByRole("button", { name: "Remove Ada Lovelace" })).toBeVisible();
    await who.fill("grace");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await expect(preview(page).getByRole("button", { name: "Remove Grace Hopper" })).toBeVisible();
    await preview(page).getByRole("button", { name: "Remove Ada Lovelace" }).click();
    await expect(preview(page).getByRole("button", { name: "Remove Ada Lovelace" })).toHaveCount(0);
  });

  test("creatable offers what you typed when nothing matches", async ({ page }) => {
    const labels = preview(page).getByRole("combobox", { name: "Labels" });
    await labels.fill("urgent");
    await expect(page.getByRole("option", { name: "Create “urgent”" })).toBeVisible();
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await expect(preview(page).getByRole("button", { name: "Remove urgent" })).toBeVisible();
  });
});

test.describe("TagsInput", () => {
  test("Enter or a comma adds, a bad value is refused, Backspace takes the last back, and it's all said", async ({ page }) => {
    await open(page, "tags-input");
    const input = preview(page).getByRole("textbox", { name: "Invite" });
    const tags = preview(page).getByRole("list", { name: "Invite, added" }).getByRole("listitem");
    await expect(tags).toHaveCount(1);
    await input.fill("Grace@Example.com");
    await page.keyboard.press(",");
    await expect(tags).toHaveCount(2);
    await expect(tags.nth(1)).toContainText("grace@example.com");
    await expect(preview(page).locator(".echo-tags-input__live")).toHaveText("Added grace@example.com");
    await input.fill("not an address");
    await page.keyboard.press("Enter");
    await expect(tags).toHaveCount(2);
    await input.fill("");
    await page.keyboard.press("Backspace");
    await expect(tags).toHaveCount(1);
    await expect(preview(page).locator(".echo-tags-input__live")).toHaveText("Removed grace@example.com");
  });
});

test.describe("Fieldset and CheckboxGroup", () => {
  test("a fieldset is a group named by its legend", async ({ page }) => {
    await open(page, "fieldset");
    await expect(preview(page).getByRole("group", { name: "Shipping address" }).getByRole("textbox")).toHaveCount(2);
  });

  test("the parent is mixed while some are checked, and checks them all", async ({ page }) => {
    await open(page, "checkbox-group");
    const all = preview(page).getByRole("checkbox", { name: "Everything" });
    await expect(all).toHaveAttribute("aria-checked", "mixed");
    await all.click();
    for (const name of ["Mentions", "Replies", "Weekly digest"]) {
      await expect(preview(page).getByRole("checkbox", { name })).toHaveAttribute("aria-checked", "true");
    }
  });
});

test.describe("Form", () => {
  test("a failed submit opens a focused summary whose links take you to each field", async ({ page }) => {
    await open(page, "form");
    await preview(page).getByRole("button", { name: "Create account" }).click();
    const summary = preview(page).getByRole("alert");
    await expect(summary).toBeFocused();
    await expect(summary).toContainText("There are 2 problems");
    await summary.getByRole("link", { name: /email address/ }).click();
    await expect(preview(page).getByRole("textbox", { name: "Email" })).toBeFocused();
    // Each field says it too.
    await expect(preview(page).getByRole("textbox", { name: "Email" })).toHaveAttribute("aria-invalid", "true");
  });

  test("once it's right, the summary goes", async ({ page }) => {
    await open(page, "form");
    await preview(page).getByRole("button", { name: "Create account" }).click();
    await preview(page).getByRole("textbox", { name: "Name" }).fill("Ada");
    await preview(page).getByRole("textbox", { name: "Email" }).fill("ada@example.com");
    await preview(page).getByRole("button", { name: "Create account" }).click();
    await expect(preview(page).getByRole("alert")).toHaveCount(0);
    await expect(preview(page).getByRole("button", { name: "Account created" })).toBeVisible();
  });
});

test.describe("HoldButton", () => {
  test.beforeEach(async ({ page }) => {
    await open(page, "hold-button");
  });

  test("a short press drains away; a full hold confirms", async ({ page }) => {
    const button = preview(page).getByRole("button", { name: "End for everyone" });
    const b = (await button.boundingBox())!;
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(300);
    await page.mouse.up();
    await page.waitForTimeout(600);
    await expect(preview(page).getByText("Hold until the cap is full")).toBeVisible();
    await page.mouse.down();
    await page.waitForTimeout(1500);
    await page.mouse.up();
    await expect(preview(page).getByText("Ended 1×")).toBeVisible();
  });

  test("a held key confirms the same way", async ({ page }) => {
    await preview(page).getByRole("button", { name: "End for everyone" }).focus();
    await page.keyboard.down("Space");
    await page.waitForTimeout(1500);
    await page.keyboard.up("Space");
    await expect(preview(page).getByText("Ended 1×")).toBeVisible();
  });

  test("a click that can't hold (assistive tech) arms it, and a second press confirms", async ({ page }) => {
    const button = preview(page).getByRole("button", { name: "End for everyone" });
    await button.evaluate((el) => (el as HTMLButtonElement).click());
    const armed = preview(page).getByRole("button", { name: "Press again to confirm" });
    await expect(armed).toBeVisible();
    await expect(preview(page).getByText("Ended 1×")).toHaveCount(0);
    await armed.evaluate((el) => el.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, button: 0 })));
    await expect(preview(page).getByText("Ended 1×")).toBeVisible();
  });
});

test.describe("ChoiceCards", () => {
  test("one choice is a radio group the arrow keys walk", async ({ page }) => {
    await open(page, "choice-cards");
    const plan = preview(page).getByRole("radiogroup", { name: "Plan" });
    const team = plan.getByRole("radio", { name: /^Team/ });
    await expect(team).toHaveAttribute("aria-checked", "true");
    await team.focus();
    await page.keyboard.press("ArrowRight");
    await expect(plan.getByRole("radio", { name: /^Studio/ })).toHaveAttribute("aria-checked", "true");
  });

  test("visual: choice cards", async ({ page }) => {
    await open(page, "choice-cards");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(preview(page)).toHaveScreenshot("choice-cards.png");
  });
});
