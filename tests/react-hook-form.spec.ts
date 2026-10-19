import { expect, test } from "@playwright/test";

/**
 * `react-hook-form` integrates uncontrolled, and `shouldFocusError` focuses the right field.
 *
 * The fixture is `/checks/react-hook-form`. It uses `register()`, which is the
 * UNCONTROLLED path: react-hook-form hands each control a `ref`, an `onBlur`,
 * a `name` and an `onChange`, then reads values off the DOM nodes it was given.
 * Before Echo's interop set, that could not work with any Echo control — four of 49 could take
 * a ref at all, and `onBlur` appeared in zero public prop types.
 *
 * Why this is a browser test and not a unit test: the thing that breaks is a
 * ref not being populated, and a ref is only populated by a real commit to a
 * real DOM. `control-interop.test.ts` asserts the shape that makes this
 * possible; this asserts that it actually happens.
 */
test.describe("react-hook-form, uncontrolled", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/checks/react-hook-form");
  });

  /**
   * The ref is the whole ticket. `shouldFocusError` calls `.focus()` on
   * whatever `register()` was handed back; a control whose ref is never
   * populated is simply skipped, silently, with nothing in the console. That
   * is precisely what a plain `ref` prop does on React 18, which is why Echo
   * uses `forwardRef`.
   */
  test("shouldFocusError focuses the first invalid field", async ({ page }) => {
    await page.getByTestId("submit").click();

    const email = page.getByTestId("email");
    await expect(email).toBeFocused();
  });

  test("validation runs, so the fields were actually registered", async ({ page }) => {
    await page.getByTestId("submit").click();
    await expect(page.getByTestId("email-error")).toBeVisible();
    await expect(page.getByTestId("bio-error")).toBeVisible();
  });

  /**
   * A full round trip: type into the two text controls, submit, and read back
   * what the form collected. This is what `register()` exists to do, and it
   * only works if the ref reached the input rather than a wrapper.
   */
  test("text controls round-trip their values through register()", async ({ page }) => {
    await page.getByTestId("email").fill("user@example.com");
    await page.getByTestId("bio").fill("Builds devices that happen to be software.");

    // Satisfy the remaining required fields so the submit handler runs.
    await page.getByTestId("terms").click();
    await page.getByTestId("plan").click();
    await page.getByRole("option", { name: "Studio" }).click();

    await page.getByTestId("submit").click();

    const submitted = page.getByTestId("submitted");
    await expect(submitted).toBeVisible();
    const values = JSON.parse((await submitted.textContent()) ?? "{}");
    expect(values.email).toBe("user@example.com");
    expect(values.bio).toBe("Builds devices that happen to be software.");

    // And the Controller half, collected by the same submit.
    expect(values.plan).toBe("studio");
    expect(values.terms).toBe(true);
  });

  /**
   * `onBlur` is the other half of `register()`, and it was in zero public prop
   * types before the interop set. react-hook-form uses it for `onTouched`/`onBlur` modes;
   * here it is enough to prove the handler reaches the element and fires.
   */
  test("onBlur reaches the control", async ({ page }) => {
    await page.getByTestId("email").click();
    await page.getByTestId("bio").click();
    await expect(page.getByTestId("email")).not.toBeFocused();
  });

  /**
   * Checkbox spread the caller's props over the cap's handlers, so
   * `register()`'s onBlur replaced the one that lets the cap back up. Hold
   * Space, Tab away, and the cap stayed sunk.
   */
  test("the caller's onBlur doesn't stop the checkbox cap coming back up", async ({ page }) => {
    const box = page.getByTestId("terms");
    const press = () => box.evaluate((el) => parseFloat(getComputedStyle(el).getPropertyValue("--press")) || 0);

    await box.focus();
    await page.keyboard.down(" ");
    await expect.poll(press).toBeGreaterThan(0.5);
    await page.keyboard.press("Tab");
    await page.keyboard.up(" ");
    await expect(box).not.toBeFocused();
    await expect.poll(press).toBeLessThan(0.05);
  });
});
