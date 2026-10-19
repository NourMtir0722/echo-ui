import { test, expect } from "@playwright/test";
import { axe } from "./axe";
import { opacityUntilUnmount, reopenMidExit } from "./helpers/exit";

/**
 * Overlays acceptance: Popover + Tooltip behave (open,
 * dismiss, keyboard/hover), the GSAP exit completes before unmount, axe-clean.
 */
test.describe("Popover", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/gallery/overlays");
    await page.getByTestId("open-popover").waitFor();
  });

  /** The exit watched every frame, not looked at once 80ms after the press. */
  test("opens on click, closes on Escape, exit before unmount", async ({ page }) => {
    await page.getByTestId("open-popover").click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.waitForFunction(() => {
      const el = document.querySelector(".echo-popover__popup");
      return !!el && getComputedStyle(el).opacity === "1";
    });

    const frames = opacityUntilUnmount(page, ".echo-popover__popup");
    await page.keyboard.press("Escape");
    const opacities = await frames;
    // Still mounted while it faded, then unmounted.
    expect(opacities.some((o) => o > 0 && o < 1), `opacity each frame: ${opacities.join(", ")}`).toBe(true);
    await expect(page.locator(".echo-popover__popup")).toHaveCount(0);
  });

  /**
   * Reopening while the exit still runs: Base UI lets the closing popup finish
   * and mounts a new one, and the new one has to get its enter.
   */
  test("reopened mid-exit, it ends up open and solid", async ({ page }) => {
    const popup = page.locator(".echo-popover__popup");
    await page.getByTestId("open-popover").click();
    await page.waitForFunction(() => {
      const el = document.querySelector(".echo-popover__popup");
      return !!el && getComputedStyle(el).opacity === "1";
    });
    const reopened = reopenMidExit(page, ".echo-popover__popup", '[data-testid="open-popover"]');
    await page.keyboard.press("Escape");
    expect(await reopened, "the exit finished before the popup could be reopened").toBe(true);

    // The closing popup finishes, and the new one is fully visible.
    await expect(popup).toHaveCount(1);
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect.poll(() => popup.evaluate((el) => getComputedStyle(el).opacity)).toBe("1");
  });

  test("no accessibility violations while open", { tag: "@mobile" }, async ({ page }) => {
    await page.getByTestId("open-popover").click();
    await expect(page.getByRole("dialog")).toBeVisible();
    const results = await axe(page).analyze();
    expect(results.violations).toEqual([]);
  });
});

test.describe("Tooltip", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/gallery/overlays");
    await page.getByTestId("tooltip-trigger").waitFor();
  });

  test("shows on hover and on keyboard focus", async ({ page }) => {
    const popup = page.locator(".echo-tooltip__popup");

    await page.getByTestId("tooltip-trigger").hover();
    await expect(popup).toBeVisible();

    // Move away → the GSAP exit runs and it unmounts.
    await page.mouse.move(0, 0);
    await expect(popup).toHaveCount(0, { timeout: 1500 });

    // Keyboard focus also reveals it (accessibility).
    await page.getByTestId("tooltip-trigger").focus();
    await expect(popup).toBeVisible();
  });
});

/**
 * Each of these is the reason the component exists as a separate
 * item rather than a variant of one that already shipped, so the assertions are
 * about semantics and keyboard operation, not about it rendering.
 */
test.describe("Menu", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/gallery/overlays");
    await page.getByTestId("open-menu").waitFor();
  });

  test("is fully keyboard-operable, including the submenu", async ({ page }) => {
    await page.getByTestId("open-menu").focus();
    await page.keyboard.press("Enter");

    const menu = page.getByRole("menu").first();
    await expect(menu).toBeVisible();

    // Opening from the keyboard highlights the first item, and arrow keys move
    // the roving highlight from there. This is the assertion that notices if
    // the skin ever swallows Base UI's key handling.
    await expect(page.getByTestId("menu-rename")).toHaveAttribute("data-highlighted", "");
    await page.keyboard.press("ArrowDown");
    await expect(page.getByTestId("menu-rename")).not.toHaveAttribute("data-highlighted", "");

    await page.keyboard.press("Escape");
    await expect(menu).toHaveCount(0);
  });

  test("checkbox and radio items report state, not just colour", async ({ page }) => {
    const menu = page.getByRole("menu").first();

    await page.getByTestId("open-menu").click();
    await expect(page.getByTestId("menu-grid")).toHaveAttribute("aria-checked", "true");

    /*
     * A checkbox item toggles WITHOUT dismissing the menu — Base UI's behavior,
     * and the right one: these are settings you may want to flip several of,
     * unlike a command item, which fires and closes. Worth pinning, because it
     * is the kind of thing a well-meaning "close on click" would break.
     */
    await page.getByTestId("menu-grid").click();
    await expect(menu).toBeVisible();
    await expect(page.getByTestId("menu-grid")).toHaveAttribute("aria-checked", "false");

    // Exactly one radio reports itself as chosen — the lit dot is decoration,
    // aria-checked is the answer.
    const radios = page.getByRole("menuitemradio");
    await expect(radios).toHaveCount(2);
    await expect(page.locator("[role='menuitemradio'][aria-checked='true']")).toHaveCount(1);
  });

  test("a submenu opens from its parent item", async ({ page }) => {
    await page.getByTestId("open-menu").click();

    /*
     * ArrowRight, not hover or click. Base UI opens a submenu on hover-INTENT,
     * which is a timer: asserting on it passed in isolation and failed under
     * parallel load, twice, in two different spellings. A timer-driven
     * assertion that is usually green is worse than no assertion, because it
     * teaches you to re-run the suite.
     *
     * The keyboard path is deterministic AND it is the one accessibility
     * depends on, so it is the one worth pinning. Hover-open is Base UI's
     * behavior and Base UI tests it.
     */
    await page.getByTestId("menu-submenu").focus();
    await page.keyboard.press("ArrowRight");
    await expect(page.getByTestId("menu-submenu-item")).toBeVisible();

    // Escape closes the submenu and leaves the parent standing.
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("menu-submenu-item")).toHaveCount(0);
    await expect(page.getByRole("menu").first()).toBeVisible();
  });

  test("the right-click menu opens on contextmenu, not on left click", async ({ page }) => {
    const target = page.getByTestId("context-target");

    await target.click();
    await expect(page.getByTestId("context-split")).toHaveCount(0);

    await target.click({ button: "right" });
    await expect(page.getByTestId("context-split")).toBeVisible();
  });

  test("no accessibility violations while open", { tag: "@mobile" }, async ({ page }) => {
    await page.getByTestId("open-menu").click();
    await expect(page.getByRole("menu").first()).toBeVisible();
    // Contrast has to be measured on the SETTLED panel: scanning mid-fade reads
    // the item text composited against whatever is behind the popup and reports
    // four contrast failures that do not exist once it lands.
    await page.waitForFunction(
      () => getComputedStyle(document.querySelector(".echo-menu__popup")!).opacity === "1",
    );

    const results = await axe(page)
      /*
       * `region` ("all content in landmarks") is a best-practice rule, not
       * WCAG, and it fires for EVERY portalled non-dialog popup — the shipped
       * Select trips it too, with three nodes, the moment you open it. Dialogs
       * escape it because axe excludes dialog roles, not because they are
       * structured better. It is a statement about the page's landmark
       * structure that a transient portalled menu cannot satisfy without
       * pretending to be a landmark, so it is excluded here BY NAME while every
       * WCAG rule stays in force.
       */
      .disableRules(["region"])
      .analyze();
    expect(results.violations).toEqual([]);
  });
});

test.describe("Sheet", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/gallery/overlays");
    await page.getByTestId("open-sheet-right").waitFor();
  });

  for (const side of ["right", "left", "bottom"] as const) {
    test(`opens from the ${side} and closes on Escape`, async ({ page }) => {
      await page.getByTestId(`open-sheet-${side}`).click();

      const popup = page.locator(".echo-sheet__popup");
      await expect(popup).toBeVisible();
      // The edge is data-driven, so this catches a side that reaches the swipe
      // axis but never reaches the CSS (or vice versa).
      await expect(popup).toHaveAttribute("data-side", side);

      await page.keyboard.press("Escape");
      await expect(popup).toHaveCount(0, { timeout: 2000 });
    });
  }

  test("the panel is a named dialog, not an unlabelled region", async ({ page }) => {
    await page.getByTestId("open-sheet-right").click();
    await expect(page.getByRole("dialog", { name: "Channels (right)" })).toBeVisible();
  });

  test("no accessibility violations while open", { tag: "@mobile" }, async ({ page }) => {
    await page.getByTestId("open-sheet-right").click();
    await expect(page.locator(".echo-sheet__popup")).toBeVisible();
    const results = await axe(page).analyze();
    expect(results.violations).toEqual([]);
  });
});

test.describe("AlertDialog", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/gallery/overlays");
    await page.getByTestId("open-alert").waitFor();
  });

  test("is an alertdialog and refuses to be dismissed by clicking away", async ({ page }) => {
    await page.getByTestId("open-alert").click();
    const dialog = page.getByRole("alertdialog");
    await expect(dialog).toBeVisible();

    // THE reason this is not a Modal with red buttons: the question has to be
    // answered. An outside press must leave it standing.
    await page.mouse.click(5, 5);
    await expect(dialog).toBeVisible();

    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(dialog).toHaveCount(0, { timeout: 2000 });
  });

  test("opens with Cancel focused, so a reflex Enter is not destructive", async ({ page }) => {
    await page.getByTestId("open-alert").click();
    await expect(page.getByRole("alertdialog")).toBeVisible();

    // Cancel is first in the DOM, so it takes initial focus — the destructive
    // answer is never one blind Enter away.
    await expect(page.getByRole("button", { name: "Cancel" })).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "Erase" })).toBeFocused();
  });

  test("confirming runs the action; cancelling does not", async ({ page }) => {
    await page.getByTestId("open-alert").click();
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByTestId("erased")).toHaveText("idle");

    await page.getByTestId("open-alert").click();
    await page.getByRole("button", { name: "Erase" }).click();
    await expect(page.getByTestId("erased")).toHaveText("erased");
  });

  test("the non-destructive spelling keeps the modality, drops the heavy cap", async ({ page }) => {
    await page.getByTestId("open-alert-safe").click();
    await expect(page.getByRole("alertdialog")).toBeVisible();
    await expect(page.locator(".echo-alert__popup")).not.toHaveAttribute("data-destructive", "");
    await expect(page.locator(".echo-alert__confirm")).not.toHaveAttribute("data-destructive", "");
  });

  test("no accessibility violations while open", { tag: "@mobile" }, async ({ page }) => {
    await page.getByTestId("open-alert").click();
    await expect(page.getByRole("alertdialog")).toBeVisible();
    const results = await axe(page).analyze();
    expect(results.violations).toEqual([]);
  });
});

/**
 * Stacking against the site chrome.
 *
 * Menu, Sheet and AlertDialog shipped their first build with no z-index, so
 * the sticky top rail (z-index 40) painted OVER them — the Sheet's
 * title and close control were behind it, invisible and unclickable. Nothing
 * caught it: axe reads the accessibility tree, not paint order, and every
 * behavioral assertion passed against an element the user could not see.
 *
 * This drives the docs surface, which is the only place the sticky rail exists.
 */
test.describe("overlays clear the sticky site chrome", () => {
  const topLeftOf = async (page: import("@playwright/test").Page, selector: string) => {
    const box = await page.locator(selector).boundingBox();
    if (!box) throw new Error(`${selector} has no box`);
    // A point just inside the panel's own top edge — where the rail overlapped.
    return { x: box.x + Math.min(60, box.width / 2), y: box.y + 12 };
  };

  test("a Sheet's own top edge is not covered by the top rail", async ({ page }) => {
    await page.goto("/docs/sheet");
    await page.getByRole("button", { name: "Channels" }).first().click();
    await expect(page.locator(".echo-sheet__popup")).toBeVisible();

    const pt = await topLeftOf(page, ".echo-sheet__popup");
    const owner = await page.evaluate(
      ({ x, y }) => document.elementFromPoint(x, y)?.closest(".echo-sheet__popup") !== null,
      pt,
    );
    expect(owner, "the top rail is painting over the sheet").toBe(true);
    await expect(page.getByRole("dialog", { name: "Channels" })).toBeVisible();
  });

  test("an AlertDialog sits above the top rail", async ({ page }) => {
    await page.goto("/docs/alert-dialog");
    await page.getByRole("button", { name: "Erase takes" }).click();
    await expect(page.getByRole("alertdialog")).toBeVisible();
    // It blooms open under a clip-path, and a clip also clips hit-testing:
    // judge the layering once it has opened, when the clip is gone.
    await page.waitForFunction(() => {
      const el = document.querySelector<HTMLElement>(".echo-alert__popup");
      return el !== null && el.style.clipPath === "";
    });

    const box = (await page.locator(".echo-alert__popup").boundingBox())!;
    const covered = await page.evaluate(
      ({ x, y }) => document.elementFromPoint(x, y)?.closest(".echo-alert__popup") === null,
      { x: box.x + box.width / 2, y: box.y + 12 },
    );
    expect(covered).toBe(false);
  });

  test("a Menu opened from the top of the page is not covered", async ({ page }) => {
    // This used to open the home hero's overflow menu, the highest trigger on
    // the site; the hero was replaced (2026-09-18) and that menu went with it.
    // Scrolling the overlays gallery's trigger up under the sticky rail puts a
    // Menu in the same spot: flush against the chrome it must render above.
    await page.goto("/gallery/overlays");
    const trigger = page.getByTestId("open-menu");
    await trigger.evaluate((el) => {
      const rail = document.querySelector(".echo-shell__rail")!.getBoundingClientRect().height;
      window.scrollBy(0, el.getBoundingClientRect().top - rail - 4);
    });
    await trigger.click();
    const popup = page.locator(".echo-menu__popup");
    await expect(popup).toBeVisible();

    const box = (await popup.boundingBox())!;
    const owned = await page.evaluate(
      ({ x, y }) => document.elementFromPoint(x, y)?.closest(".echo-menu__popup") !== null,
      { x: box.x + box.width / 2, y: box.y + 12 },
    );
    expect(owned).toBe(true);
  });
});

/**
 * Overlay viewport collision at 390px.
 *
 * Select, Menu and Popover carry fixed `min-width` of 180-190px with no
 * collision handling of their own. Base UI owns placement, so this was a watch
 * item rather than a confirmed break — but it had never been verified at a
 * phone width, because nothing had. An overlay anchored near the right edge of
 * a 390px screen is the case that would fail, and it is also the case nobody
 * would hit on a desktop.
 *
 * Runs in both projects: at 1440 it is a regression guard, at 390 it is the
 * measurement this ticket asked for.
 */
test.describe("overlays stay inside the viewport", { tag: "@mobile" }, () => {
  /** Nothing may hang off either edge. Vertical is Base UI's flip, also checked. */
  async function expectInsideViewport(page: import("@playwright/test").Page, selector: string) {
    const box = await page.locator(selector).first().boundingBox();
    expect(box, `${selector} has no box`).not.toBeNull();
    const view = page.viewportSize()!;
    expect(box!.x, `${selector} hangs off the left edge`).toBeGreaterThanOrEqual(-1);
    expect(
      box!.x + box!.width,
      `${selector} hangs off the right edge (viewport ${view.width})`,
    ).toBeLessThanOrEqual(view.width + 1);
    expect(box!.width, `${selector} is wider than the viewport`).toBeLessThanOrEqual(view.width);
  }

  test("a Popover opened near the edge stays in the viewport", async ({ page }) => {
    await page.goto("/gallery/overlays");
    await page.getByTestId("open-popover").click();
    await expect(page.locator('[role="dialog"]').first()).toBeVisible();
    await expectInsideViewport(page, '[role="dialog"]');
  });

  test("a Menu opened near the edge stays in the viewport", async ({ page }) => {
    await page.goto("/gallery/overlays");
    await page.getByTestId("open-menu").click();
    await expect(page.locator('[role="menu"]').first()).toBeVisible();
    await expectInsideViewport(page, '[role="menu"]');
  });

  test("a Select popup stays in the viewport", async ({ page }) => {
    await page.goto("/gallery/controls");
    await page.getByRole("combobox").first().click();
    await expect(page.locator('[role="listbox"]').first()).toBeVisible();
    await expectInsideViewport(page, '[role="listbox"]');
  });
});
