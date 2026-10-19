import { test, expect } from "@playwright/test";

/**
 * The toaster. A live region created at
 * the same moment as its text is often not announced; the old Toast was
 * exactly that. The toaster's region is on the page, empty, before anything is
 * said, and toasts are added into it.
 */
test.beforeEach(async ({ page }) => {
  await page.goto("/checks/toast");
});

const region = (page: import("@playwright/test").Page) => page.getByRole("region", { name: "Notifications" });

test("the live region is on the page before any toast", async ({ page }) => {
  await expect(region(page)).toHaveAttribute("aria-live", "polite");
  await expect(region(page)).toBeEmpty();
});

test("a toast is added inside that region", async ({ page }) => {
  await page.getByRole("button", { name: "Save take" }).click();
  await expect(region(page)).toContainText("Take saved");
  await expect(region(page)).toContainText("Stored on this device.");
});

test("a toast can be dismissed by a named button", async ({ page }) => {
  await page.getByRole("button", { name: "Record" }).click();
  await expect(region(page)).toContainText("Recording");
  await region(page).getByRole("button", { name: "Dismiss notification" }).click();
  await expect(region(page)).not.toContainText("Recording");
});

test("an active toast lights its LED", async ({ page }) => {
  await page.getByRole("button", { name: "Record" }).click();
  await expect(region(page).locator('.echo-toast[data-tone="active"]')).toHaveCount(1);
});

test("a toast raised from inside a dialog shows above it", async ({ page }) => {
  await page.getByRole("button", { name: "Open modal" }).click();
  await page.getByRole("button", { name: "Apply preset" }).click();
  const toast = region(page).locator(".echo-toast").first();
  await expect(toast).toContainText("Preset applied");
  await page.waitForTimeout(500);
  const box = (await toast.boundingBox())!;
  const onTop = await toast.evaluate(
    (el, { x, y }) => {
      const hit = document.elementFromPoint(x, y);
      return hit !== null && (el === hit || el.contains(hit));
    },
    { x: box.x + box.width / 2, y: box.y + box.height / 2 },
  );
  expect(onTop).toBe(true);
});

test("the dismiss button is never hidden from assistive tech while it can be focused", async ({ page }) => {
  await page.getByRole("button", { name: "Record" }).click();
  await expect(region(page).locator(".echo-toast__close")).not.toHaveAttribute("aria-hidden", "true");
});

test("a toast's title and body sit together, as on the slab alone", async ({ page }) => {
  // Base UI renders the title as an h2 and the body as a p; the browser's
  // own margins opened a gap between them that the slab alone doesn't have.
  await page.getByRole("button", { name: "Save take" }).click();
  const toast = region(page).locator(".echo-toast").first();
  await expect(toast).toContainText("Stored on this device.");
  const gap = await toast.evaluate((el) => {
    const title = el.querySelector(".echo-toast__title")!.getBoundingClientRect();
    const body = el.querySelector(".echo-toast__body")!.getBoundingClientRect();
    return body.top - title.bottom;
  });
  expect(gap).toBeLessThanOrEqual(4);
});

const raiseThree = async (page: import("@playwright/test").Page) => {
  for (const name of ["Save take", "Record", "Save take"]) await page.getByRole("button", { name }).click();
  await page.mouse.move(5, 5);
  await expect(region(page).locator(".echo-toast")).toHaveCount(3);
  await page.waitForTimeout(600);
};
const tops = (page: import("@playwright/test").Page) =>
  region(page).locator(".echo-toast").evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top)));

test("toasts pile like ThrowStack's cards, and fan into a column under the pointer", async ({ page }) => {
  await raiseThree(page);
  // Piled: the newest in front, each one behind only a step higher.
  const piled = await tops(page);
  expect(Math.max(...piled) - Math.min(...piled)).toBeLessThan(40);
  await expect(region(page).locator(".echo-toast[data-behind]")).toHaveCount(2);
  // Fanned: every toast clear of the next, so each can be read.
  await region(page).locator(".echo-toast:not([data-behind])").hover();
  await expect(region(page).locator(".echo-toast[data-expanded]")).toHaveCount(3);
  await page.waitForTimeout(600);
  const fanned = await region(page)
    .locator(".echo-toast")
    .evaluateAll((els) => els.map((e) => e.getBoundingClientRect()).map((r) => [r.top, r.bottom]).sort((a, b) => a[0]! - b[0]!));
  for (let i = 1; i < fanned.length; i++) expect(fanned[i]![0]!).toBeGreaterThanOrEqual(fanned[i - 1]![1]!);
});

test("the keyboard fans the pile too, and every dismiss button can be reached", async ({ page }) => {
  await raiseThree(page);
  await page.keyboard.press("F6");
  await expect(region(page).locator(".echo-toast[data-expanded]")).toHaveCount(3);
  await expect(region(page).getByRole("button", { name: "Dismiss notification" })).toHaveCount(3);
  for (const close of await region(page).getByRole("button", { name: "Dismiss notification" }).all()) {
    await expect(close).toBeVisible();
  }
});

test("a flicked toast leaves the way it was thrown, turning, and is gone", async ({ page }) => {
  await page.getByRole("button", { name: "Record" }).click();
  const toast = region(page).locator(".echo-toast").first();
  await expect(toast).toContainText("Recording");
  await page.waitForTimeout(500);
  const b = (await toast.boundingBox())!;
  // Held low, it turns the other way as it's dragged.
  const x = b.x + 60;
  const y = b.y + b.height * 0.8;
  await page.mouse.move(x, y);
  await page.mouse.down();
  for (let i = 1; i <= 6; i++) await page.mouse.move(x + i * 25, y);
  expect(parseFloat(await toast.evaluate((el) => el.style.rotate))).toBeLessThan(0);
  await page.mouse.up();
  await expect(toast).toHaveAttribute("data-swipe-direction", "right");
  expect(await toast.evaluate((el) => el.style.getPropertyValue("--fling-turn"))).toBe("22deg");
  await expect(region(page)).not.toContainText("Recording");
});

test("under reduced motion a dragged toast doesn't turn, and a flicked one still goes", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("button", { name: "Record" }).click();
  const toast = region(page).locator(".echo-toast").first();
  await expect(toast).toContainText("Recording");
  const b = (await toast.boundingBox())!;
  await page.mouse.move(b.x + 60, b.y + b.height * 0.8);
  await page.mouse.down();
  for (let i = 1; i <= 6; i++) await page.mouse.move(b.x + 60 + i * 25, b.y + b.height * 0.8);
  expect(await toast.evaluate((el) => el.style.rotate)).toBe("");
  await page.mouse.up();
  await expect(region(page)).not.toContainText("Recording");
});
