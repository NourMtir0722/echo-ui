import { test, expect, type Page } from "@playwright/test";
import { axe } from "./axe";
import { hydrated } from "./helpers/hydration";

/**
 * FileUpload, on /checks/file-upload: the tray opens the file dialog and
 * takes a drop, files upload with progress, fail and retry, are cancelled,
 * or are refused by type, size and count; a form submits held files; a
 * disabled one takes nothing.
 */
test.beforeEach(async ({ page }) => {
  await page.goto("/checks/file-upload");
  await hydrated(page.locator("#off .echo-file-upload__tray"));
});

const file = (name: string, bytes = 1024, mimeType = name.endsWith(".pdf") ? "application/pdf" : name.endsWith(".png") ? "image/png" : "text/plain") => ({
  name,
  mimeType,
  buffer: Buffer.alloc(bytes, 1),
});
const input = (page: Page, section: string) => page.locator(`${section} input[type=file]`);
const row = (page: Page, name: string) => page.locator("#upload .echo-file-upload__row", { hasText: name });

test("the tray is a named button that opens the file dialog", async ({ page }) => {
  const tray = page.locator("#upload").getByRole("button", { name: "Choose files or drop them here" });
  await expect(tray).toHaveAccessibleDescription("Images or PDFs, up to 1 MB each, three at most.");
  await expect(page.getByRole("group", { name: "Attachments" })).toBeVisible();
  const chooser = page.waitForEvent("filechooser");
  await tray.focus();
  await page.keyboard.press("Enter");
  expect((await chooser).isMultiple()).toBe(true);
});

test("files become rows that upload, fill their strip, and say so", async ({ page }) => {
  await input(page, "#upload").setInputFiles([file("photo.png"), file("scan.pdf")]);
  await expect(row(page, "photo.png").getByRole("progressbar", { name: "photo.png" })).toBeVisible();
  await expect(row(page, "photo.png")).toContainText("Uploaded");
  await expect(row(page, "scan.pdf")).toContainText("Uploaded");
  await expect(page.locator("#upload-rows")).toHaveText("photo.png:done scan.pdf:done");
  await expect(page.locator("#upload [role=status]")).toHaveText(/uploaded\./);
  await expect(row(page, "photo.png").getByRole("progressbar")).toHaveCount(0);
});

test("a file of another type, too big, or one too many is refused in words and never uploaded", async ({ page }) => {
  await input(page, "#upload").setInputFiles([file("notes.txt"), file("huge.png", 1_500_000), file("a.png"), file("b.png"), file("c.png"), file("d.png")]);
  await expect(row(page, "notes.txt")).toContainText("notes.txt isn't a type this takes.");
  await expect(row(page, "huge.png")).toContainText("huge.png is 1.5 MB; the most it takes is 1 MB.");
  await expect(row(page, "d.png")).toContainText("d.png is one too many: it takes 3 at most.");
  await expect(row(page, "notes.txt").getByRole("progressbar")).toHaveCount(0);
  await expect(row(page, "notes.txt").getByRole("button", { name: "Remove notes.txt" })).toBeVisible();
  await expect(row(page, "c.png")).toContainText("Uploaded");
  await expect(page.locator("#upload-rows")).toHaveText(/notes\.txt:error huge\.png:error a\.png:done b\.png:done c\.png:done d\.png:error/);
});

test("a failed upload says why, and can be tried again", async ({ page }) => {
  await input(page, "#upload").setInputFiles([file("fail-once.png")]);
  await expect(row(page, "fail-once.png")).toContainText("The server said no.");
  await expect(page.locator("#upload [role=status]")).toHaveText("fail-once.png didn't upload: The server said no.");
  // From the keyboard: Retry goes as it's pressed, and focus moves to the row's other key.
  await row(page, "fail-once.png").getByRole("button", { name: "Retry fail-once.png" }).focus();
  await page.keyboard.press("Enter");
  await expect(row(page, "fail-once.png").locator(".echo-file-upload__keys button").last()).toBeFocused();
  await expect(row(page, "fail-once.png")).toContainText("Uploaded");
});

test("cancelling stops the upload and takes the row away", async ({ page }) => {
  await input(page, "#upload").setInputFiles([file("stuck.png")]);
  await expect(row(page, "stuck.png").getByRole("progressbar")).toHaveAttribute("aria-valuenow", "40");
  await row(page, "stuck.png").getByRole("button", { name: "Cancel stuck.png" }).focus();
  await page.keyboard.press("Enter");
  await expect(row(page, "stuck.png")).toHaveCount(0);
  // Its key went with it: the tray has focus, not the page.
  await expect(page.locator("#upload .echo-file-upload__tray")).toBeFocused();
  await expect(page.locator("#upload-aborts")).toHaveText("aborted: 1");
  await expect(page.locator("#upload [role=status]")).toHaveText("stuck.png cancelled.");
});

test("files dragged over light the tray, and dropping adds them", async ({ page }) => {
  const tray = page.locator("#upload .echo-file-upload__tray");
  const dataTransfer = await page.evaluateHandle(() => {
    const dt = new DataTransfer();
    dt.items.add(new File(["x"], "dropped.png", { type: "image/png" }));
    return dt;
  });
  await tray.dispatchEvent("dragenter", { dataTransfer });
  await expect(tray).toHaveAttribute("data-dragging", "");
  await tray.dispatchEvent("drop", { dataTransfer });
  await expect(tray).not.toHaveAttribute("data-dragging", /./);
  await expect(row(page, "dropped.png")).toContainText("Uploaded");
});

test("without an upload handler, a form submits the files it holds", async ({ page }) => {
  await input(page, "#form").setInputFiles([file("avatar.png")]);
  await expect(page.locator("#form .echo-file-upload__row")).toContainText("avatar.png");
  await page.locator("#form").getByRole("button", { name: "Send" }).click();
  await expect(page.locator("#form-value")).toHaveText("avatar.png");
  await page.locator("#form").getByRole("button", { name: "Remove avatar.png" }).click();
  await page.locator("#form").getByRole("button", { name: "Send" }).click();
  await expect(page.locator("#form-value")).toHaveText("not sent");
});

test("a disabled one takes nothing", async ({ page }) => {
  await expect(page.locator("#off").getByRole("button", { name: /Choose a file/ })).toBeDisabled();
});

test("with rows in every state, it's axe-clean", { tag: "@mobile" }, async ({ page }) => {
  await input(page, "#upload").setInputFiles([file("stuck.png"), file("notes.txt"), file("photo.png")]);
  await expect(row(page, "photo.png")).toContainText("Uploaded");
  const results = await axe(page).include("main").analyze();
  expect(results.violations.map((v) => `${v.id} (${v.nodes.length})`)).toEqual([]);
});

test("visual: a tray with a file going up, one uploaded and one refused", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await input(page, "#upload").setInputFiles([file("stuck.png", 240_000), file("photo.png", 830_000), file("notes.txt", 12_000)]);
  await expect(row(page, "photo.png")).toContainText("Uploaded");
  await page.mouse.move(0, 0);
  await expect(page.locator("#upload .echo-file-upload")).toHaveScreenshot("file-upload.png");
});
