import { test, expect } from "@playwright/test";
import {
  APP_ROUTES,
  MIN_TARGET,
  MIN_TOUCH_TARGET,
  OVERFLOW_SKIPS,
  docRoutes,
  expectLayout,
  findSmallTargets,
  formatTargets,
} from "./helpers/layout";

/**
 * Layout integrity.
 *
 * The suite could not see a phone, so its overflow bugs went unnoticed for
 * as long as it took someone to open one. This spec runs in both projects —
 * `chromium` at 1440 and `mobile` at 390 — and holds every route the docs app
 * serves to one rule: nothing scrolls sideways unless it says it does.
 *
 * Known breaks live in OVERFLOW_SKIPS with the ticket that removes them, and
 * the list can only shrink: a route that starts passing fails here.
 */
test.describe("Layout", { tag: "@mobile" }, () => {
  for (const route of APP_ROUTES) {
    test(`lays out inside the viewport: ${route}`, async ({ page }, testInfo) => {
      await page.goto(route);
      await expectLayout(page, route, testInfo.project.name);
    });
  }

  /**
   * The 53 doc pages sweep in one test rather than 53. They are the library's
   * largest surface and nothing used to measure them; per-route tests here
   * would triple the suite's route count for pages that mostly differ by one
   * component.
   */
  test("every doc page lays out inside the viewport", async ({ page }, testInfo) => {
    test.slow(); // 53 routes in one test
    const project = testInfo.project.name;
    const failures: string[] = [];

    for (const route of await docRoutes(page)) {
      await page.goto(route);
      try {
        await expectLayout(page, route, project);
      } catch (error) {
        failures.push(`${route}: ${(error as Error).message.split("\n")[0]}`);
      }
    }
    expect(failures, `doc pages overflowing at ${project}`).toEqual([]);
  });
});

/**
 * The skip list is a ledger, not a suppression: an entry that names a route
 * nothing serves, or a ticket nobody filed, is how a skip list turns into
 * permanent silence.
 */
test.describe("The overflow skip list", { tag: "@mobile" }, () => {
  test("names a real ticket and a real route for every entry", async ({ page }) => {
    const routes = new Set<string>([...APP_ROUTES, ...(await docRoutes(page))]);
    for (const skip of OVERFLOW_SKIPS) {
      expect(skip.ticket, `${skip.route} has no ticket`).toMatch(/^ECHO-\d+$/);
      expect(skip.projects.length, `${skip.route} skips no project`).toBeGreaterThan(0);
      expect(routes.has(skip.route), `${skip.route} is not a route this app serves`).toBe(true);
    }
  });

  test("holds no duplicate route/project pair", async () => {
    const pairs = OVERFLOW_SKIPS.flatMap((s) => s.projects.map((p) => `${s.route} @ ${p}`));
    expect(pairs.length, "a route is listed twice for one project").toBe(new Set(pairs).size);
  });

  test("does not skip a route in a project that project never runs", async () => {
    // Guards the typo that silently disables a route: `mobille`, `desktop`.
    const known = new Set(test.info().config.projects.map((p) => p.name));
    for (const skip of OVERFLOW_SKIPS) {
      for (const project of skip.projects) {
        expect(known.has(project), `${skip.route} names unknown project "${project}"`).toBe(true);
      }
    }
  });
});

/**
 * Hit areas.
 *
 * WCAG 2.2 2.5.8 is 24x24 at AA. Six elements shipped under it, the worst
 * being `.echo-tag__remove` at 16x16 — a destructive action at 40% of the
 * minimum area. No component used hit-area expansion, so the visual size WAS
 * the target size throughout, and nothing measured it.
 *
 * This runs in both projects: a target is 24px at every width, and the
 * touch-specific 44px guideline is a separate test.
 */
test.describe("Hit areas", { tag: "@mobile" }, () => {
  for (const route of APP_ROUTES) {
    test(`every target is at least ${MIN_TARGET}x${MIN_TARGET}: ${route}`, async ({ page }) => {
      await page.goto(route);
      const small = formatTargets(await findSmallTargets(page));
      expect(small, `targets under ${MIN_TARGET}px on ${route}`).toEqual([]);
    });
  }
});

/**
 * The platform touch guideline.
 *
 * Everything here already clears 2.5.8's 24px. This is the 44px both platform
 * guidelines use, which is about a fingertip rather than about conformance,
 * and it is met with `@media (pointer: coarse)` so the desktop chrome does not
 * move. It therefore only runs in the `touch` project — a project without
 * pointer emulation would measure the desktop sizes and pass while proving
 * nothing.
 *
 * Pagination comes first, because people tap it
 * repeatedly and that is exactly when a 30px target starts costing mis-taps.
 */
test.describe("Touch targets", { tag: "@touch" }, () => {
  for (const route of APP_ROUTES) {
    test(`every target is at least ${MIN_TOUCH_TARGET}px on a coarse pointer: ${route}`, async ({
      page,
    }) => {
      await page.goto(route);
      const small = formatTargets(await findSmallTargets(page, MIN_TOUCH_TARGET));
      expect(small, `targets under ${MIN_TOUCH_TARGET}px on ${route}`).toEqual([]);
    });
  }
});

/**
 * On a touch screen each top-bar link has a 44px minimum width. In the rail's
 * flex row that replaced the links' natural floor (their text), so the long
 * ones shrank below their words and ran into the next: "TemplatesThemes".
 */
test("on a phone, every top-bar link is as wide as its words", { tag: "@touch" }, async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/docs");
  const cut = await page.locator(".echo-topnav__link").evaluateAll((links) =>
    links.filter((a) => a.scrollWidth > a.clientWidth + 1).map((a) => `${a.textContent} ${a.clientWidth}/${a.scrollWidth}`),
  );
  expect(cut, "links narrower than their words").toEqual([]);
});
