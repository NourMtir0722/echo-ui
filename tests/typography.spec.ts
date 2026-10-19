import { test, expect } from "@playwright/test";

/**
 * The site's typefaces (see components/site/site-theme.ts).
 *
 * Every page builds its own theme, and createEchoTheme emits all four font
 * roles each time, so one page left on the bare engine silently drops back to
 * system fonts. This walks a page of every kind and reads what actually
 * rendered.
 */
const ROUTES = ["/", "/docs", "/docs/hardware-button", "/gallery/controls", "/templates/chat", "/generator", "/audition", "/brand/world"];

for (const path of ROUTES) {
  test(`renders in the Red Hat family: ${path}`, async ({ page }) => {
    await page.goto(path);
    const fonts = await page.evaluate(() => ({
      body: getComputedStyle(document.body).fontFamily,
      nav: getComputedStyle(document.querySelector(".echo-topnav__link")!).fontFamily,
      cap: document.querySelector(".echo-hw__cap")
        ? getComputedStyle(document.querySelector(".echo-hw__cap")!).fontFamily
        : "Red Hat (no cap on page)",
    }));
    expect(fonts.body).toMatch(/Red Hat Text/);
    expect(fonts.nav, "the nav is the text face, not a mono").toMatch(/Red Hat Text/);
    expect(fonts.cap).toMatch(/Red Hat/);
  });
}

test("the rail carries the real mark: the flower and the Fredoka wordmark", async ({ page }) => {
  await page.goto("/docs");
  const word = page.locator(".echo-wordmark__word");
  await expect(word).toHaveText("ECHO");
  expect(await word.evaluate((el) => getComputedStyle(el).fontFamily)).toMatch(/Fredoka/);
  await expect(page.locator(".echo-wordmark .brand-flower svg")).toBeVisible();
});

test("the wordmark's visible words are inside its accessible name", async ({ page }) => {
  await page.goto("/docs");
  const link = page.locator("a.echo-wordmark").first();
  const [text, name] = await link.evaluate((el) => [el.textContent ?? "", el.getAttribute("aria-label") ?? ""]);
  // WCAG 2.5.3 Label in Name, read the way axe and text tools read it: the words, in order.
  const said = text.replace(/\s+/g, " ").trim().toLowerCase();
  expect(said).toBe("echo ui");
  expect(name.toLowerCase()).toContain(said);
});

test("the generator's copied CSS is the library's, not the site's", async ({ page }) => {
  await page.goto("/generator");
  await page.getByRole("button", { name: "Generated CSS" }).click();
  // A web-first assertion, so it retries while the panel fills. Reading
  // `innerText` straight after the click raced on WebKit, which populates it a
  // beat later than Chromium.
  const code = page.locator(".gen__code");
  await expect(code).toContainText("--echo-font-sans");
  const css = await code.innerText();
  expect(css, "a copied theme must not name the site's font variables").not.toContain("--site-font");
});
