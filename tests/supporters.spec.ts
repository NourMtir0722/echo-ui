import { test, expect, type Page } from "@playwright/test";
import { axe } from "./axe";

/**
 * /supporters: Echo's island. The island is WebGL, which a test browser may
 * not draw; everything a visitor needs is also on the page itself (the ask,
 * Find yourself, the list of everyone, the cards), so these tests hold whether
 * it draws or not.
 */
test("the island asks for the next supporter, with what it costs, and leads to Support", async ({ page }) => {
  await page.goto("/supporters");
  await expect(page.getByRole("heading", { level: 1, name: "Supporters" })).toBeAttached();
  await expect(page.locator(".sw-island__head")).toContainText("There’s room for you.");
  const ask = page.locator(".sw-island__ask");
  await expect(ask).toContainText("From $5, once or monthly.");
  await expect(ask.getByRole("link", { name: "Get your Echo on the island" })).toHaveAttribute("href", "/support");
  // The island either draws or says it can't; it never stays "raising".
  await expect(page.locator(".sw-island")).toHaveAttribute("data-state", /ready|failed/, { timeout: 30_000 });
});

test("the list of everyone slides out from its key, and before anyone has joined it says the first is No. 001", async ({ page }) => {
  await page.goto("/supporters");
  await page.getByRole("button", { name: /^Everyone on the island/ }).click();
  const list = page.getByRole("dialog", { name: "Everyone on the island" });
  await expect(list.getByRole("button", { name: "Noor" })).toBeVisible();
  await expect(list.getByRole("link", { name: "Yours could be No. 001." })).toHaveAttribute("href", "/support");
  // A name in the list opens that person's card, and the list makes way for it.
  await list.getByRole("button", { name: "Noor" }).click();
  await expect(page.getByRole("dialog", { name: "Noor" })).toBeVisible();
  await expect(list).toHaveCount(0);
});

test("Find yourself finds a name and opens that person's card", async ({ page }) => {
  await page.goto("/supporters");
  await page.getByRole("combobox", { name: "Find yourself", exact: true }).fill("No");
  await page.getByRole("option", { name: "Noor" }).click();
  await expect(page.getByRole("dialog", { name: "Noor" })).toBeVisible();
});

test("a person's own link opens their card, the card closes with Escape, and Noor's links are her own", async ({ page }) => {
  await page.goto("/supporters#noor");
  const card = page.getByRole("dialog", { name: "Noor" });
  await expect(card).toBeVisible();
  await expect(card.getByRole("link", { name: "X" })).toHaveAttribute("rel", /\bme\b/);
  await expect(page).toHaveURL(/#noor$/);
  await page.keyboard.press("Escape");
  await expect(card).toHaveCount(0);
  await expect(page).not.toHaveURL(/#noor/);
});

/**
 * The video is made on the visitor's device (video.ts). Where the browser can
 * make it, the card makes a nine-second, 1080 × 1080 H.264 MP4; where it
 * can't, the card offers the link to post instead.
 */
test("a card makes the video of that place, a real MP4, or offers the link where it can't", async ({ page, browserName }) => {
  test.slow();
  await page.goto("/supporters#noor");
  const card = page.getByRole("dialog", { name: "Noor" });
  const make = card.getByRole("button", { name: "Make the video" });
  const fallback = card.getByRole("link", { name: "Share this place" });
  await expect(make.or(fallback)).toBeVisible({ timeout: 15_000 });
  if (await fallback.isVisible()) {
    await expect(fallback).toHaveAttribute("href", /^https:\/\/x\.com\/intent\/post\?/);
    return;
  }
  test.skip(browserName !== "chromium", "One engine making the whole video is enough; the others show the key.");
  // CI's runner has no GPU, and drawing nine seconds of the island in software and encoding
  // them didn't finish in two and a half minutes. There the card offering the key is the check; the
  // whole video is made, and read as an MP4, in the local run before each merge.
  test.skip(!!process.env.CI, "No GPU on CI: the key is offered; the video is made in the local run before each merge.");
  await make.click();
  const preview = card.locator("video");
  await expect(preview).toBeVisible({ timeout: 150_000 });
  const head = await preview.evaluate(async (v: HTMLVideoElement) => {
    const bytes = new Uint8Array(await (await fetch(v.src)).arrayBuffer());
    return { size: bytes.length, box: String.fromCharCode(...bytes.subarray(4, 8)) };
  });
  expect(head.box).toBe("ftyp");
  expect(head.size).toBeGreaterThan(200_000);
  await expect(card.getByRole("button", { name: /Download the video|Share the video/ })).toBeVisible();
});

/*
 * Who's on the island comes from the supporters server as each page opens (components/supporters/live.ts).
 * A copy of the site asks its own origin, where public/supporters-api/supporters answers that no one is on it
 * yet; these tests answer with supporters, or not at all.
 */
const TWO = {
  supporters: [
    { id: "ana", name: "Ana", plan: "monthly", no: 1, since: "October 2026", times: 3, links: [{ kind: "x", href: "https://x.com/ana" }] },
    { id: "bo", name: "Bo", plan: "once", no: 3, since: "October 2026", times: 1, links: [] },
  ],
  next: 4,
};
const answer = (page: Page, body: unknown, status = 200) => page.route("**/supporters-api/supporters", (route) => route.fulfill({ status, json: body }));

test("the island, the crowd and the footer show whoever the supporters server says is there", async ({ page }) => {
  await answer(page, TWO);
  await page.goto("/supporters");
  await page.getByRole("button", { name: "Everyone on the island, 3" }).click();
  const list = page.getByRole("dialog", { name: "Everyone on the island" });
  await expect(list.getByRole("button", { name: "Ana" })).toBeVisible();
  await expect(list.getByRole("button", { name: "Bo" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("footer")).toContainText("Some of the Echos above are Echo’s supporters");

  await page.goto("/");
  const crowd = page.locator(".crowd");
  await expect(crowd.getByRole("list", { name: "Supporters" }).getByRole("link", { name: "Ana" })).toHaveAttribute("href", "/supporters#ana");
  await expect(crowd).not.toContainText("Be the first");
});

test("a supporter's own link opens their card, even when the list takes a moment to come", async ({ page }) => {
  await page.route("**/supporters-api/supporters", async (route) => {
    await new Promise((done) => setTimeout(done, 600));
    await route.fulfill({ json: TWO });
  });
  await page.goto("/supporters#ana");
  const card = page.getByRole("dialog", { name: "Ana" });
  await expect(card).toBeVisible();
  await expect(card.getByRole("link", { name: "X" })).toHaveAttribute("rel", /\bsponsored\b/);
  await expect(page).toHaveURL(/#ana$/);
});

test("a supporter whose time has run out sleeps on the island: listed apart, and their card says how it wakes", async ({ page }) => {
  await answer(page, { supporters: [...TWO.supporters, { id: "cy", name: "Cy", plan: "once", no: 4, since: "September 2026", times: 2, asleep: true, links: [] }], next: 5 });
  await page.goto("/supporters#ana");
  await expect(page.getByRole("dialog", { name: "Ana" })).toContainText("Supported Echo 3 times");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: /^Everyone on the island/ }).click();
  const list = page.getByRole("dialog", { name: "Everyone on the island" });
  await expect(list.getByText("Asleep", { exact: true })).toBeVisible();
  await list.getByRole("button", { name: "Cy" }).click();
  const card = page.getByRole("dialog", { name: "Cy" });
  await expect(card).toContainText("Asleep for now: supporting Echo again wakes it up.");
  await expect(card).toContainText("Supported Echo twice");
});

/*
 * Typed into Find yourself before the island's list had come, a name never showed: the box held no
 * one yet, and the list arriving didn't refresh what it offered. The box waits for the list now.
 */
test("Find yourself, typed into while the list is still coming, finds the name once it's here", async ({ page }) => {
  await page.route("**/supporters-api/supporters", async (route) => {
    await new Promise((done) => setTimeout(done, 1500));
    await route.fulfill({ json: TWO });
  });
  await page.goto("/supporters");
  await page.getByRole("combobox", { name: "Find yourself", exact: true }).fill("An");
  await page.getByRole("option", { name: "Ana" }).click();
  await expect(page.getByRole("dialog", { name: "Ana" })).toBeVisible();
});

test("on /support, the visitor's Echo carries the number the server will give next", async ({ page }) => {
  await answer(page, TWO);
  await page.goto("/support");
  await expect(page.locator(".sp-you__no").first()).toHaveText("No. 004");
});

test("with no one on the island yet the crowd keeps a place for the first; without an answer it claims nothing", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".crowd")).toContainText("Be the first");

  await answer(page, { ok: false }, 500);
  await page.goto("/");
  const crowd = page.locator(".crowd");
  await expect(crowd.locator(".crowd__pile")).toBeVisible();
  await expect(crowd).not.toContainText("Be the first");
  await page.goto("/supporters");
  await expect(page.getByRole("button", { name: "Everyone on the island, 1" })).toBeVisible();
  await expect(page.locator(".sw-island")).toHaveAttribute("data-state", /ready|failed/, { timeout: 30_000 });
});

test("every page's footer leads to the island, and so do /support's island and the homepage's support panel", async ({ page }) => {
  await page.goto("/support");
  await expect(page.locator("footer").getByRole("link", { name: "Supporters", exact: true })).toHaveAttribute("href", "/supporters");
  await expect(page.locator(".sp-island__foot").getByRole("link", { name: "See the full island" })).toHaveAttribute("href", "/supporters");
  await page.goto("/");
  await expect(page.locator(".crowd").getByRole("link", { name: "Visit the island" })).toHaveAttribute("href", "/supporters");
});

/**
 * The island and /support open in the brand's blue, as the homepage does,
 * until the visitor picks a colour. The Light key keeps the colour and changes
 * the device; but it was only told the page's opening colour on the homepage,
 * so on these two pages Light put the visitor on the library's default purple
 * instead: a light page round a blue island they hadn't asked to change.
 */
test("on the island and on /support, Light keeps the brand's blue", async ({ page }) => {
  for (const path of ["/supporters", "/support"]) {
    await page.goto(path);
    const accent = () => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--echo-accent").trim().toLowerCase());
    const blue = await accent();
    await page.getByRole("banner").getByRole("button", { name: "Light" }).click();
    await expect.poll(accent, { message: path }).toBe(blue);
    await page.evaluate(() => localStorage.clear());
  }
});

/**
 * On a phone the footer's groups of links are Echo's Accordion, whose headers are h3s. On the
 * homepage they came after the page's h2s; on /supporters, whose only other heading is its h1, they skipped
 * a level, and axe's heading-order failed the page. The phone menu has an h2 of its own now, so its groups
 * sit under it on any page.
 */
test("on a phone, no heading on /supporters or /support skips a level", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of ["/supporters", "/support", "/"]) {
    await page.goto(route);
    const levels = await page.evaluate(() =>
      [...document.querySelectorAll("h1, h2, h3, h4, h5, h6")]
        .filter((h) => h.getClientRects().length > 0 || getComputedStyle(h).clipPath === "inset(50%)")
        .map((h) => Number(h.tagName[1])),
    );
    const skips = levels.flatMap((l, i) => (i > 0 && l > levels[i - 1]! + 1 ? [`h${levels[i - 1]} → h${l}`] : []));
    expect(skips, route).toEqual([]);
  }
});

/*
 * The thank-you page a payment leads to (/supporters/welcome). The supporters
 * server is played here by routes: what it answers, and what the page sends it.
 */
test("without a payment, the thank-you page says what it's for and leads to supporting", async ({ page }) => {
  await page.goto("/supporters/welcome");
  await expect(page.getByRole("heading", { level: 1, name: "For supporters." })).toBeVisible();
  await expect(page.getByRole("link", { name: "Support Echo", exact: true }).last()).toHaveAttribute("href", "/support");
});

test("after paying, a supporter names their Echo and gives a link, and the page leads to their place on the island", async ({ page }) => {
  const sent: unknown[] = [];
  await page.route("**/supporter/session", (route) => route.fulfill({ json: { ok: true, plan: "monthly", saved: null, shown: true } }));
  await page.route("**/supporter/save", async (route) => {
    sent.push(route.request().postDataJSON());
    await route.fulfill({ json: { ok: true, plan: "monthly", saved: { name: "Ana", links: [{ kind: "x", href: "https://x.com/ana" }], id: "ana" }, shown: true } });
  });
  await page.goto("/supporters/welcome?session_id=cs_live_testTestTestTest1");
  await expect(page.getByRole("heading", { level: 1, name: "Thank you." })).toBeVisible();
  await expect(page.locator(".wl")).toContainText("in the village round the hill");
  expect((await axe(page).analyze()).violations).toEqual([]);
  await page.getByLabel("Name for your Echo").fill("Ana");
  await page.getByLabel("A link", { exact: true }).fill("x.com/ana");
  await page.getByRole("button", { name: "Put my Echo on the island" }).click();
  await expect(page.getByRole("heading", { name: "Your Echo is on the island" })).toBeVisible();
  await expect(page.locator(".wl__done")).toContainText("x.com");
  await expect(page.getByRole("link", { name: "See your Echo" })).toHaveAttribute("href", "/supporters#ana");
  expect((await axe(page).analyze()).violations).toEqual([]);
  expect(sent).toEqual([{ session: "cs_live_testTestTestTest1", name: "Ana", links: ["x.com/ana", ""] }]);
});

test("an Echo Noor has taken off the island says so, and how to ask about it", async ({ page }) => {
  await page.route("**/supporter/session", (route) => route.fulfill({ json: { ok: true, plan: "once", saved: { name: "Ana", links: [], id: "ana" }, shown: false } }));
  await page.goto("/supporters/welcome?session_id=cs_live_testTestTestTest1");
  await expect(page.getByRole("heading", { name: "Your Echo is off the island" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Change it" })).toHaveCount(0);
  await expect(page.locator(".wl__done").getByRole("link", { name: /^support@/ })).toBeVisible();
});

test("back on the page later, a supporter finds their Echo on the island, and can change its name", async ({ page }) => {
  const sent: unknown[] = [];
  await page.route("**/supporter/session", (route) => route.fulfill({ json: { ok: true, plan: "once", saved: { name: "Ana", links: [], id: "ana" }, shown: true, times: 2 } }));
  await page.route("**/supporter/save", async (route) => {
    sent.push(route.request().postDataJSON());
    await route.fulfill({ json: { ok: true, plan: "once", saved: { name: "Ana Silva", links: [], id: "ana" }, shown: true, times: 2 } });
  });
  await page.goto("/supporters/welcome?session_id=cs_live_testTestTestTest1");
  await expect(page.getByRole("heading", { name: "Your Echo is on the island" })).toBeVisible();
  // A second payment with the same email is the same Echo: the page says it's counted.
  await expect(page.locator(".wl__done")).toContainText("Its card says you’ve supported Echo twice.");
  await expect(page.locator(".wl")).toContainText("Your Echo lives on the island now, out in the meadows.");
  await page.getByRole("button", { name: "Change it" }).click();
  await expect(page.getByLabel("Name for your Echo")).toHaveValue("Ana");
  await page.getByLabel("Name for your Echo").fill("Ana Silva");
  await page.getByRole("button", { name: "Save my Echo" }).click();
  await expect(page.locator(".wl__done")).toContainText("Ana Silva");
  await expect(page.getByRole("link", { name: "See your Echo" })).toHaveAttribute("href", "/supporters#ana");
  expect(sent).toEqual([{ session: "cs_live_testTestTestTest1", name: "Ana Silva", links: ["", ""] }]);
});

test("a link that isn't one is said before anything is sent", async ({ page }) => {
  let saves = 0;
  await page.route("**/supporter/session", (route) => route.fulfill({ json: { ok: true, plan: "once", saved: null } }));
  await page.route("**/supporter/save", (route) => (saves++, route.fulfill({ json: { ok: true } })));
  await page.goto("/supporters/welcome?session_id=cs_live_testTestTestTest1");
  await page.getByLabel("Name for your Echo").fill("Ana");
  await page.getByLabel("A link", { exact: true }).fill("not a link");
  await page.getByRole("button", { name: "Put my Echo on the island" }).click();
  await expect(page.locator(".wl__problems")).toContainText("Link 1 isn't a web address");
  await expect(page.locator(".wl__problems")).toHaveAttribute("role", "alert");
  expect(saves).toBe(0);
});

test("a payment that hasn't gone through yet gets the way to finish it", async ({ page }) => {
  await page.route("**/supporter/session", (route) => route.fulfill({ status: 402, json: { ok: false, reason: "unpaid" } }));
  await page.goto("/supporters/welcome?session_id=cs_live_testTestTestTest1");
  await expect(page.getByRole("heading", { level: 1, name: "Almost there." })).toBeVisible();
});
