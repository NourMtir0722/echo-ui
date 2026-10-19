import { test, expect } from "@playwright/test";

/**
 * Segmented's keyboard contract. The
 * hand-rolled version failed all three: arrows were hard-coded left-to-right,
 * no segment could be disabled, and an out-of-range value left no tab stop.
 */
test.beforeEach(async ({ page }) => {
  await page.goto("/checks/segmented");
});

test("arrow keys skip a disabled segment", async ({ page }) => {
  const group = page.getByRole("radiogroup", { name: "With a disabled segment" });
  await expect(group.getByRole("radio", { name: "Log" })).toBeDisabled();
  await group.getByRole("radio", { name: "Meter" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(group.getByRole("radio", { name: "Config" })).toBeChecked();
  await expect(group.getByRole("radio", { name: "Config" })).toBeFocused();
});

test("with an out-of-range value, the control is still reachable by Tab", async ({ page }) => {
  const group = page.getByRole("radiogroup", { name: "Out of range" });
  await page.getByRole("radiogroup", { name: "With a disabled segment" }).getByRole("radio", { name: "Meter" }).focus();
  await page.keyboard.press("Tab");
  const focused = page.locator(":focus");
  await expect(focused).toHaveAttribute("role", "radio");
  expect(await group.evaluate((g) => g.contains(document.activeElement))).toBe(true);
});

test("in right-to-left, the left arrow moves forward", async ({ page }) => {
  const group = page.getByRole("radiogroup", { name: "Right to left" });
  await group.getByRole("radio", { name: "One" }).focus();
  await page.keyboard.press("ArrowLeft");
  await expect(group.getByRole("radio", { name: "Two" })).toBeChecked();
});

test("Home and End jump to the first and last enabled segment", async ({ page }) => {
  const group = page.getByRole("radiogroup", { name: "With a disabled segment" });
  await group.getByRole("radio", { name: "Meter" }).focus();
  await page.keyboard.press("End");
  await expect(group.getByRole("radio", { name: "Config" })).toBeChecked();
  await expect(group.getByRole("radio", { name: "Config" })).toBeFocused();
  await page.keyboard.press("Home");
  await expect(group.getByRole("radio", { name: "Meter" })).toBeChecked();
});

/**
 * Two options can share a label, and the list can change under them.
 * Keyed by label rather than by position, React had two children with the same
 * key: it reused one node for another's place and left the third behind, and
 * the leftover's stale `data-index` is what the Home/End handler reads.
 */
test("two segments with the same label are two segments", async ({ page }) => {
  const group = page.getByRole("radiogroup", { name: "Repeated labels" });
  await expect(group.getByRole("radio")).toHaveCount(3);

  await page.getByRole("button", { name: "Rotate" }).click();
  await expect(group.getByRole("radio")).toHaveCount(3);
  await expect(group.getByRole("radio").nth(0)).toHaveText("Sent");
  await expect(group.getByRole("radio").nth(2)).toHaveAttribute("data-index", "2");

  // End lands on the last segment, and selects the one it lands on.
  await group.getByRole("radio").first().focus();
  await page.keyboard.press("End");
  await expect(group.getByRole("radio").nth(2)).toBeFocused();
  await expect(group.getByRole("radio").nth(2)).toBeChecked();
});
