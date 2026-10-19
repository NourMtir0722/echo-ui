import { test, expect, type Locator, type Page } from "@playwright/test";

/**
 * On a touch screen a tap leaves the tapped element under `:hover` until the
 * next tap somewhere else, which is how phones emulate a mouse. A hover style
 * therefore stays on after the finger lifts: a table row stays shaded, a
 * trigger stays lit, as if it were still being pointed at. Echo's hover rules
 * sit inside `@media (hover: hover)`, so a device that can't hover never gets
 * them (scales.test.ts holds every rule to that).
 *
 * The `touch` project emulates a phone: coarse pointer, no hover.
 */
const preview = (page: Page) => page.getByTestId("preview");

async function looks(el: Locator) {
  return el.evaluate((node) => {
    const s = getComputedStyle(node);
    return { background: s.backgroundColor, color: s.color, shadow: s.boxShadow };
  });
}

for (const { name, route, target, surface } of [
  {
    name: "a table row",
    route: "/docs/table",
    target: (page: Page) => preview(page).locator(".echo-table__body .echo-table__row").first(),
    surface: (row: Locator) => row.locator(".echo-table__cell").first(),
  },
  {
    name: "an accordion trigger",
    route: "/docs/accordion",
    target: (page: Page) => preview(page).locator(".echo-accordion__trigger").first(),
    surface: (trigger: Locator) => trigger,
  },
]) {
  test(`on a touch screen, ${name} doesn't stay lit after it's tapped`, { tag: "@touch" }, async ({ page }) => {
    await page.goto(route);
    const el = target(page);
    const look = surface(el);
    const before = await looks(look);
    await el.tap();
    // The phone's half of the bug: the tapped element is still "hovered". Chromium on a Mac
    // leaves it so after a tap; on Linux it left the accordion's trigger unhovered, and the
    // test failed before it asked anything of Echo. The pointer rests on it, as a
    // phone's emulated mouse does, so it's hovered in every engine.
    const box = (await el.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await expect.poll(() => el.evaluate((node) => node.matches(":hover"))).toBe(true);
    // Echo's half: it doesn't look it.
    await page.waitForTimeout(400);
    expect(await looks(look)).toEqual(before);
  });
}
