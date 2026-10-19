import { test, expect, type Page } from "@playwright/test";
import { axe } from "./axe";

/**
 * The brand pages. They belong to the site alone:
 * the creature, the mark and the brand grain are not registry items.
 */
const SLUGS = ["identity", "logo-use", "creature", "movement", "world", "materials", "voice"] as const;

for (const slug of SLUGS) {
  test(`is axe-clean: /brand/${slug}`, { tag: "@mobile" }, async ({ page }) => {
    await page.goto(`/brand/${slug}`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const results = await axe(page).analyze();
    expect(results.violations, results.violations.map((v) => v.id).join(", ")).toEqual([]);
  });
}

test("the sidebar lists every brand page", async ({ page }) => {
  await page.goto("/brand/identity");
  const sidebar = page.getByRole("navigation", { name: "Components" });
  for (const name of ["Logo & identity", "The creature", "Movement set", "Brand world", "Voice & tone"]) {
    await expect(sidebar.getByRole("link", { name, exact: true })).toBeVisible();
  }
  await expect(sidebar.getByRole("link", { name: "Logo & identity", exact: true })).toHaveAttribute(
    "aria-current",
    "page",
  );
});

test("the movement picker switches the behaviour", async ({ page }) => {
  await page.goto("/brand/movement");
  const picker = page.getByRole("radiogroup", { name: "Behaviour" });
  await picker.getByRole("radio", { name: "nap", exact: true }).click();
  await expect(picker.getByRole("radio", { name: "nap", exact: true })).toHaveAttribute("aria-checked", "true");
});

test("the gradient ids are unique, so two creatures never share a gloss", async ({ page }) => {
  await page.goto("/brand/movement");
  const ids = await page.evaluate(() => [...document.querySelectorAll("radialGradient")].map((g) => g.id));
  expect(ids.length).toBeGreaterThan(4);
  expect(new Set(ids).size).toBe(ids.length);
});

/* --- the logo boot --------------------------------------------------------- */

/** The page as the server sent it: every script blocked, so nothing hydrates. */
async function firstPaint(page: Page) {
  await page.route(
    (url) => url.pathname.startsWith("/_next/static/") && url.pathname.endsWith(".js"),
    (route) => route.abort(),
  );
  await page.goto("/brand/identity");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
}

/*
 * The boot's markup was its LAST frame: the server's page painted the
 * finished lockup, and when the scripts arrived the effect snapped it back to
 * the seed and played. Blocking the scripts holds the page at that first paint.
 */
test("the boot never paints the finished logo before it plays", async ({ page }) => {
  await firstPaint(page);
  const boot = page.locator(".brand-boot").first();
  await expect(boot).toBeAttached();
  await expect(boot.locator("svg")).toBeHidden();
  await expect(boot.getByText("E", { exact: true })).toBeHidden();
});

test("with reduced motion, the boot is the finished lockup from the first paint and never moves", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await firstPaint(page);
  const boot = page.locator(".brand-boot").first();
  await expect(boot.locator("svg")).toBeVisible();
  await expect(boot.getByText("H", { exact: true })).toBeVisible();

  // And once the scripts run, it stays exactly as it is.
  await page.unrouteAll();
  await page.reload();
  const still = () =>
    boot.evaluate((el) =>
      [...el.querySelectorAll("*")].map((n) => `${getComputedStyle(n).transform}|${getComputedStyle(n).opacity}|${n.getAttribute("d") ?? ""}`).join(";"),
    );
  const first = await still();
  await page.waitForTimeout(800);
  expect(await still()).toBe(first);
});

test("the boot plays from the seed and lands on the canonical mark and the whole word", async ({ page }) => {
  await page.goto("/brand/identity");
  const boot = page.locator(".brand-boot").first();
  await expect(boot).toHaveAttribute("data-boot", "live");
  await expect(boot.locator("svg")).toBeVisible();
  for (const letter of ["E", "C", "H"]) {
    await expect(boot.getByText(letter, { exact: true })).toHaveCSS("opacity", "1", { timeout: 6000 });
  }
  const body = await page.evaluate(() => document.querySelector(".brand-boot svg path")?.getAttribute("d"));
  const canonical = await page.evaluate(() => document.querySelector(".brand-flower svg path")?.getAttribute("d"));
  expect(body, "the boot ends on BODY itself, not a sampled copy").toBe(canonical);
});

test("each bloom variant replays the logo and lands on the same mark", async ({ page }) => {
  await page.goto("/brand/identity");
  const boot = page.locator(".brand-boot").first();
  const landed = () =>
    page.evaluate(() => {
      const body = document.querySelector(".brand-boot svg path")?.getAttribute("d");
      return body === document.querySelector(".brand-flower svg path")?.getAttribute("d");
    });
  await expect.poll(landed, { timeout: 6000 }).toBe(true);
  const picker = page.getByRole("radiogroup", { name: "Bloom" });
  await expect(picker.getByRole("radio", { name: "Unfurl" })).toHaveAttribute("aria-checked", "true");
  for (const name of ["Nested", "Divide", "One breath", "Unfurl"]) {
    await picker.getByRole("radio", { name }).click();
    // It starts again from the seed…
    await expect.poll(landed, { timeout: 2000, intervals: [20], message: `${name} starts from the seed` }).toBe(false);
    // …and blooms back into the mark, with the whole word.
    await expect.poll(landed, { timeout: 6000, message: `${name} lands on the mark` }).toBe(true);
    await expect(boot.getByText("H", { exact: true })).toHaveCSS("opacity", "1");
  }
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });
  test("the boot shows the finished lockup", async ({ page }) => {
    await page.goto("/brand/identity");
    const boot = page.locator(".brand-boot").first();
    await expect(boot.locator("svg")).toBeVisible();
    await expect(boot.getByText("E", { exact: true })).toBeVisible();
  });
});

/* --- the creature ---------------------------------------------------------- */

/*
 * Mood was an effect dependency, and a changed dependency reverted the
 * whole GSAP context, so every tween snapped back to where it started: press
 * Pause on the home device (or pick Resting here) and Echo jumped back to the
 * centre, mid-drift, before starting to rest.
 */
test("changing mood carries on from where the creature is, it never jumps", async ({ page }) => {
  await page.goto("/brand/creature");
  const stage = page.locator(".brand-stage").first();
  // Where the body's centre is now, and how far that is from where it rests:
  // its own geometry mapped through the svg alone, without the motion's groups.
  const where = () =>
    stage.evaluate((el) => {
      const svg = el.querySelector("svg")!;
      const body = svg.querySelector("path")!;
      const r = body.getBoundingClientRect();
      const b = body.getBBox();
      const rest = new DOMPoint(b.x + b.width / 2, b.y + b.height / 2).matrixTransform(svg.getScreenCTM()!);
      const now = [r.x + r.width / 2, r.y + r.height / 2] as const;
      return { now, off: Math.hypot(now[0] - rest.x, now[1] - rest.y) };
    });
  // Wait until it has drifted far enough for a snap back to show.
  await expect.poll(async () => (await where()).off, { timeout: 20000, intervals: [100] }).toBeGreaterThan(3);

  const jump = await stage.evaluate(async (el) => {
    const centre = () => {
      const r = el.querySelector("svg path")!.getBoundingClientRect();
      return [r.x + r.width / 2, r.y + r.height / 2] as const;
    };
    const frame = () => new Promise((done) => requestAnimationFrame(() => done(null)));
    const before = centre();
    [...el.querySelectorAll<HTMLElement>("[role='radio']")].find((r) => r.textContent?.trim() === "Resting")!.click();
    let worst = 0;
    for (let i = 0; i < 6; i++) {
      await frame();
      const now = centre();
      worst = Math.max(worst, Math.hypot(now[0] - before[0], now[1] - before[1]));
    }
    return worst;
  });
  // Six frames of a slow drift move it well under a pixel; the snap moved it by the whole drift.
  expect(jump).toBeLessThan(1.5);
});

/*
 * The nap's z's animated inside a group held at opacity 0, so the
 * "drifting z's" the movement set promises never showed.
 */
test("napping, Echo's z's drift up where you can see them", async ({ page }) => {
  await page.goto("/brand/movement");
  await page.getByRole("radiogroup", { name: "Behaviour" }).getByRole("radio", { name: "nap", exact: true }).click();
  const stage = page.locator(".brand-stage").first();
  const brightestZ = () =>
    stage.evaluate((el) =>
      Math.max(
        0,
        ...[...el.querySelectorAll("text")].map((z) => {
          let seen = 1;
          for (let n: Element | null = z; n && n.tagName !== "svg"; n = n.parentElement) seen *= Number(getComputedStyle(n).opacity);
          return seen;
        }),
      ),
    );
  await expect.poll(brightestZ, { timeout: 8000, intervals: [100] }).toBeGreaterThan(0.3);
});

for (const path of ["/brand/creature", "/brand/movement"]) {
  test(`with reduced motion, every creature holds one still frame: ${path}`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const pose = () =>
      page.evaluate(() =>
        [...document.querySelectorAll(".brand-page svg g, .brand-page svg path")]
          .map((n) => `${n.getAttribute("transform") ?? ""}|${getComputedStyle(n).transform}|${n.getAttribute("d")?.length ?? 0}`)
          .join(";"),
      );
    const first = await pose();
    await page.mouse.move(40, 40);
    await page.mouse.move(600, 400, { steps: 8 });
    await page.waitForTimeout(900);
    expect(await pose()).toBe(first);
  });
}
