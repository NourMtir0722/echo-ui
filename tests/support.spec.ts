import { test, expect } from "@playwright/test";
import { REPO_PUBLIC, REPO_URL } from "../apps/www/components/site/repo";

/**
 * /support: where npm's `funding` link, GitHub's Sponsor button and the site's
 * own key, Support Echo, all lead.
 */
test("the support page is the support section, titled, with its questions", async ({ page }) => {
  await page.goto("/support");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Support Echo");
  await expect(page.getByRole("group", { name: "Support Echo" })).toBeVisible();
  await expect(page.locator(".echo-shell__rail").getByRole("link", { name: "Support Echo" })).toHaveAttribute("aria-current", "page");

  const faq = page.getByRole("button", { name: "How is the payment made?" });
  await faq.click();
  await expect(page.getByText("Echo never sees your card details.")).toBeVisible();
});

const PAYMENT_LINK = /^https:\/\/buy\.stripe\.com\/(?!test_)[A-Za-z0-9]+$/;
const PORTAL_LINK = /^https:\/\/billing\.stripe\.com\/p\/login\/(?!test_)[A-Za-z0-9]+$/;

/**
 * The key opens Stripe's live payment page for the pair chosen, in a new tab,
 * and someone already giving monthly can find where to manage it: in the panel
 * while Monthly is chosen, and in the questions.
 */
test("the key opens Stripe's page for the amount and how often, and monthly support can be managed", async ({ page }) => {
  await page.goto("/support");
  const panel = page.getByRole("group", { name: "Support Echo" });
  const manage = panel.getByRole("link", { name: "Manage or cancel it" });

  await panel.getByRole("radio", { name: "One-time" }).click();
  await panel.getByRole("group", { name: "Amount" }).getByRole("button", { name: "$50", exact: true }).click();
  const once = panel.getByRole("link", { name: /\$50 once/ });
  await expect(once).toHaveAttribute("href", PAYMENT_LINK);
  await expect(once).toHaveAttribute("target", "_blank");
  await expect(manage).toHaveCount(0);
  const onceHref = await once.getAttribute("href");

  await panel.getByRole("radio", { name: "Monthly" }).click();
  const monthly = panel.getByRole("link", { name: /\$50 a month/ });
  await expect(monthly).toHaveAttribute("href", PAYMENT_LINK);
  expect(await monthly.getAttribute("href")).not.toBe(onceHref);
  await expect(manage).toHaveAttribute("href", PORTAL_LINK);

  await page.getByRole("button", { name: "How do I change or cancel monthly support?" }).click();
  await expect(page.getByRole("link", { name: "Stripe’s page for your subscription" })).toHaveAttribute("href", PORTAL_LINK);
});

/**
 * At 320px (a small phone, or 1280px at 400% zoom) the Donate key's label is
 * the widest thing in the panel. It used to widen the panel's one column, which
 * pushed everything right and cut the key, the readout and the note off at the
 * panel's edge: by a pixel on a Mac, by four with Linux's fonts, by ten for
 * "Donate $100 a month" anywhere.
 */
test("at 320px the donation panel holds every amount, and the key says it whole", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto("/support");
  const donate = page.getByRole("group", { name: "Support Echo" });
  for (const often of ["Monthly", "One-time"]) {
    await donate.getByRole("radio", { name: often }).click();
    for (const amount of ["$5", "$10", "$25", "$50", "$100"]) {
      await donate.getByRole("group", { name: "Amount" }).getByRole("button", { name: amount, exact: true }).click();
      await expect(donate.locator(".donate__go")).toContainText(`Support with ${amount} `);
      const spill = await donate.evaluate((group) => {
        const panel = group.closest(".donate__panel") ?? group.querySelector(".donate__panel")!;
        const label = [...panel.querySelectorAll(".donate__go .echo-hw__content > span:not(.echo-hw__icon)")].pop()!;
        return { panel: panel.scrollWidth - panel.clientWidth, label: label.scrollWidth - label.clientWidth };
      });
      expect(spill, `${often}, ${amount}`).toEqual({ panel: 0, label: 0 });
    }
  }
});

/**
 * The key drops "Support with" below a 368px window, but the
 * words need the key itself to be 320px wide, which takes a 410px window:
 * at 375 and 390, the iPhones most people hold, the key read "Support with
 * $25 a mo…". Whether the words fit is the key's width, so the key decides.
 * Where there's room, it still says them.
 */
test("on a phone of any width, the support key says its amount whole", async ({ page }) => {
  await page.goto("/support");
  const donate = page.getByRole("group", { name: "Support Echo" });
  const verb = donate.locator(".donate__verb").first();
  for (const width of [360, 375, 390, 400, 414, 430]) {
    await page.setViewportSize({ width, height: 844 });
    for (const often of ["Monthly", "One-time"]) {
      await donate.getByRole("radio", { name: often }).click();
      for (const amount of ["$5", "$100"]) {
        await donate.getByRole("group", { name: "Amount" }).getByRole("button", { name: amount, exact: true }).click();
        await expect(donate.locator(".donate__go").getByRole("link")).toHaveAccessibleName(new RegExp(`^Support with \\${amount} `));
        const spill = await donate.evaluate((group) => {
          const label = [...group.querySelectorAll(".donate__go .echo-hw__content > span:not(.echo-hw__icon)")].pop()!;
          return label.scrollWidth - label.clientWidth;
        });
        expect(spill, `${width}px, ${often}, ${amount}`).toBe(0);
      }
    }
  }
  // A big phone has room for the words, and shows them.
  expect((await verb.boundingBox())!.width).toBeGreaterThan(40);
});

test("every page's top bar leads to it, with one key and no second link beside it", async ({ page }) => {
  await page.goto("/docs/switch");
  const rail = page.locator(".echo-shell__rail");
  await expect(rail.getByRole("link", { name: "Support Echo" })).toHaveAttribute("href", "/support");
  await expect(rail.getByRole("link", { name: "Support Echo" })).not.toHaveAttribute("aria-current", "page");
  await expect(rail.locator("a[href='/support']")).toHaveCount(1);
});

/**
 * AppShell lights the rail's current link with a 2px glow drawn in its
 * `::after`, and a HardwareButton link's `::after` is its hit area, reaching
 * past the cap into the well. On /support the bar's key is the current link,
 * so the rail's rule shrank the hit area to 2px and painted it as a glowing
 * line across the top of the cap.
 */
test("in the rail, the key to the page you're on keeps its hit area and no lit-rail line", async ({ page }) => {
  await page.goto("/support");
  const key = page.locator(".echo-shell__rail").getByRole("link", { name: "Support Echo" });
  await expect(key).toHaveAttribute("aria-current", "page");
  const hit = await key.evaluate((a) => {
    const after = getComputedStyle(a, "::after");
    return { cap: a.getBoundingClientRect().height, hit: parseFloat(after.height), background: after.backgroundColor };
  });
  expect(hit.hit).toBeGreaterThan(hit.cap);
  expect(hit.background).toBe("rgba(0, 0, 0, 0)");
});

/**
 * A link to a private repository is a 404 for everyone but its owner. The
 * homepage linked it four times (the nav's GitHub key, the footer, "Star Echo
 * on GitHub", "report a bug") and /support twice more while it was private.
 * Every link to it waits on REPO_PUBLIC (repo.ts), and the deploy refuses the
 * switch on while GitHub answers a visitor with a 404 (scripts/repo-public.mjs).
 */
test("a page links the repository only once REPO_PUBLIC says it opens", async ({ page }) => {
  for (const path of ["/", "/support"]) {
    await page.goto(path);
    // Every link, the panels and sheets that aren't open included.
    const hrefs = await page.locator("a[href]").evaluateAll((as) => as.map((a) => a.getAttribute("href") ?? ""));
    const links = hrefs.filter((h) => h.startsWith(REPO_URL));
    if (REPO_PUBLIC) expect(links.length, path).toBeGreaterThan(0);
    else expect(links, path).toEqual([]);
  }
});

/**
 * The same reason, in words: while the repository is private, someone who
 * reads "open source" and goes looking finds nothing. The letter, the share
 * text and the homepage's support section say "free"; /support's lede alone
 * still said "free and open source".
 */
test("while the repository is private, the support page doesn't call Echo open source", async ({ page }) => {
  test.skip(REPO_PUBLIC, "the repository is public: open source is true");
  await page.goto("/support");
  await expect(page.locator(".sp-hero__line")).toContainText("Echo is free");
  await expect(page.locator("main")).not.toContainText(/open[ -]source/i);
});
