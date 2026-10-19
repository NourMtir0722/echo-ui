import { countIdDivergence } from "./helpers/hydration";
import { test, expect } from "@playwright/test";

/**
 * AppShell.
 *
 * These drive the REAL docs surface rather than a gallery, because the docs
 * site now renders this component instead of the shell it used to hand-roll —
 * which is the acceptance criterion for the item, not an incidental fact. If
 * the component regresses, the site regresses with it, and that is the point.
 */
test.describe("AppShell", () => {
  test("ships one main landmark, and the skip link lands on it", async ({ page, browserName }) => {
    await page.goto("/docs/switch");

    // Two <main>s is the failure this shell caused the first time the site was
    // moved onto it — every page was still rendering its own.
    await expect(page.locator("main")).toHaveCount(1);

    const skip = page.getByRole("link", { name: "Skip to content" });
    await expect(skip).toHaveAttribute("href", "#echo-shell-content");
    await expect(page.locator("main#echo-shell-content")).toHaveCount(1);

    // It is the first thing Tab reaches, or it is not a skip link.
    //
    // Chromium only, and not because Echo behaves differently: macOS Safari
    // does not move focus to LINKS with Tab unless Full Keyboard Access is
    // turned on, and Playwright's WebKit reproduces that default. The skip
    // link is a link, so on WebKit this asserts the platform's preference
    // rather than anything about the shell. Everything above — one `<main>`,
    // the href, the target — is checked on both engines.
    if (browserName === "chromium") {
      await page.keyboard.press("Tab");
      await expect(skip).toBeFocused();
    }
  });

  test("the rail's links fit the rail, so it never scrolls up and down under the wheel", async ({ page }) => {
    await page.goto("/docs/switch");
    const nav = page.locator("nav.echo-shell__railnav");
    // The site's links had their own padding on top of the rail's full height: 70px in a 56px
    // rail, so the rail scrolled 7px and their lit pill was a clipped slab, not a pill.
    const fit = await nav.evaluate((el) => ({
      overflow: el.scrollHeight - el.clientHeight,
      tallest: Math.max(...[...el.querySelectorAll("a")].map((a) => a.getBoundingClientRect().height)),
      rail: el.clientHeight,
    }));
    expect(fit.overflow).toBe(0);
    expect(fit.tallest).toBeLessThan(fit.rail);
  });

  test("the rail and the sidebar are distinctly named landmarks", async ({ page }) => {
    await page.goto("/docs/switch");
    await expect(page.getByRole("navigation", { name: "Site" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Components" })).toBeVisible();
  });

  test("the sidebar sticks under the rail, with no gap and no overlap", async ({ page }) => {
    await page.goto("/docs/switch");
    const rail = (await page.locator(".echo-shell__rail").boundingBox())!;
    const side = (await page.locator("nav.echo-shell__side").boundingBox())!;

    // The offset is derived from --echo-shell-rail-h; hardcoding it is how a
    // rail redesign leaves a dead band at the top of every sidebar.
    expect(Math.abs(side.y - (rail.y + rail.height))).toBeLessThanOrEqual(1);
  });

  test("the rail is exactly --echo-shell-rail-h tall, so what's placed by it meets it", async ({ page }) => {
    await page.goto("/docs/switch");
    const { rail, declared, side } = await page.evaluate(() => {
      const shell = document.querySelector<HTMLElement>(".echo-shell")!;
      return {
        rail: document.querySelector<HTMLElement>(".echo-shell__rail")!.getBoundingClientRect().height,
        declared: parseFloat(getComputedStyle(shell).getPropertyValue("--echo-shell-rail-h")),
        side: document.querySelector<HTMLElement>("nav.echo-shell__side")!.getBoundingClientRect().top,
      };
    });
    // Its hairline was drawn outside the declared height: a 57px rail for a 56px variable, and
    // everything placed by the variable a pixel under it.
    expect(rail).toBe(declared);
    expect(Math.abs(side - rail)).toBeLessThan(0.5);
  });

  test("below 900px the sidebar column is removed, not stacked", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await page.goto("/docs/switch");

    await expect(page.locator("nav.echo-shell__side")).toBeHidden();
    // The content must start at the top of the page, not half a screen down.
    const content = (await page.locator("main.echo-shell__content").boundingBox())!;
    expect(content.y).toBeLessThan(160);

    // And the same list is reachable, through the Sheet the shell's docs
    // recommend pairing it with.
    await page.getByRole("button", { name: "Browse components" }).click();
    await expect(page.getByRole("dialog", { name: "Components" })).toBeVisible();
  });

  test("the homepage uses the bare shell — rail, no sidebar", async ({ page }) => {
    await page.goto("/");
    // The page's own shell: the framed templates further down are AppShells too, with sidebars.
    const shell = page.locator(".home-shell");
    await expect(shell.locator(":scope > .echo-shell__rail")).toHaveCount(1);
    await expect(shell.locator(":scope > .echo-shell__side")).toHaveCount(0);
    await expect(page.locator("main")).toHaveCount(1);
  });

  test("an embedded shell claims no landmarks", async ({ page }) => {
    await page.goto("/docs/app-shell");

    // The doc page renders a whole AppShell inside the site's own. Without
    // `embedded` that is two <main>s, two skip links and a duplicate nav —
    // which is exactly how the suite caught it.
    await expect(page.locator("main")).toHaveCount(1);
    await expect(page.getByRole("link", { name: "Skip to content" })).toHaveCount(1);

    // The layout is still there; only the semantics are dropped.
    await expect(page.getByTestId("preview").locator(".echo-shell__rail")).toBeVisible();
    await expect(page.getByTestId("preview").locator(".echo-shell__side")).toBeVisible();
  });
});

test.describe("Site navigation", () => {
  // /docs/segmented is the page that exposed it: its preview loads the Sheet
  // chunk AFTER site-shell.css, and the trigger's `display: inline-flex` won
  // the equal-specificity tie — so "Components" sat beside the sidebar on
  // desktop. Check several widths above the 900px handover.
  for (const width of [905, 1024, 1440]) {
    test(`the phone nav toggle is hidden beside the sidebar at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto("/docs/segmented");
      await expect(page.locator(".echo-shell__side")).toBeVisible();
      await expect(page.getByRole("button", { name: "Browse components" })).toBeHidden();
    });
  }

  // The tools were bare pages: no rail, no sidebar, no way back.
  for (const path of ["/generator", "/audition", "/tactile"]) {
    test(`${path} renders inside the site shell with one main`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator("main")).toHaveCount(1);
      await expect(page.locator(".echo-shell__side")).toBeVisible();
      const sidebar = page.getByRole("navigation", { name: "Components" });
      await expect(sidebar.locator(`a[href="${path}"]`)).toHaveAttribute("aria-current", "page");
    });
  }

  test("the sidebar lists the theme generator", async ({ page }) => {
    await page.goto("/docs");
    const sidebar = page.getByRole("navigation", { name: "Components" });
    await expect(sidebar.getByRole("link", { name: "Theme generator", exact: true })).toBeVisible();
  });
});

/*
 * AppShell straight from a server layout, as an app's layout.tsx uses it
 * (fixture: apps/www/app/checks/app-shell-server).
 */
test("AppShell and every compound component work from server components", async ({ page }) => {
  await page.goto("/checks/app-shell-server");
  await expect(page.getByRole("banner")).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Fixture nav" })).toBeVisible();
  await expect(page.getByRole("main")).toContainText("AppShell from a server layout");
  await expect(page.getByRole("link", { name: "Skip to content" })).toHaveCount(1);
  // Every compound component rendered from the server page, with its parts.
  await expect(page.getByRole("tab", { name: "Two" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Section" })).toBeVisible();
  await expect(page.getByRole("radio", { name: "B" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Actions" })).toBeVisible();
  await expect(page.getByText("Right-click here")).toBeVisible();
  await expect(page.getByRole("button", { name: "Open sheet" })).toBeVisible();
});

// Failed on Next 15.5 (React 19.2 canary); fixed by the Next 16 upgrade.
test("AppShell from a server layout hydrates with the server's ids", async ({ browser }) => {
  test.setTimeout(180_000);
  const baseURL = test.info().project.use.baseURL!;
  expect(await countIdDivergence(browser, `${baseURL}/checks/app-shell-server`)).toBe(0);
});

/**
 * `embedded` is for a shell inside another one. When the outer shell was bare,
 * its "hide the sidebar" rule reached into the inner shell too (a descendant
 * selector), so the inner screen lost its sidebar and its content fell into
 * the sidebar's narrow column: the homepage's framed Console, squeezed into
 * 200px (fixture: apps/www/app/checks/app-shell-nested).
 */
test("a shell inside a bare shell keeps its own sidebar and content column", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/checks/app-shell-nested");
  const nested = page.getByTestId("nested-shell");
  const side = nested.locator(".echo-shell__side");
  await expect(side).toBeVisible();
  await expect(side.getByRole("link", { name: "Channel 1" })).toBeVisible();

  // The content sits beside the sidebar, not under it in the sidebar's column.
  const sideBox = (await side.boundingBox())!;
  const contentBox = (await page.getByTestId("nested-content").boundingBox())!;
  expect(contentBox.x).toBeGreaterThanOrEqual(sideBox.x + sideBox.width);
  expect(contentBox.width).toBeGreaterThan(600);
});
