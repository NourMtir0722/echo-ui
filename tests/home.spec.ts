import { test, expect, chromium, type Page } from "@playwright/test";
import { HOSTED_MCP_URL } from "../registry/src/agent/guidance";
import { CHATGPT_LISTING_URL } from "../mcp/src/plugin-downloads";
import { REPO_PUBLIC, REPO_URL } from "../apps/www/components/site/repo";
import { axe } from "./axe";
import { budgetPages } from "./helpers/budget";
import { hydrated } from "./helpers/hydration";
import { findHorizontalOverflow, formatOverflow } from "./helpers/layout";

/**
 * The homepage.
 *
 * Every test here is one of the homepage's acceptance criteria, written so
 * that the page degrading into a claim, or Echo into something that gets in
 * the way, fails the suite rather than quietly shipping.
 *
 * `/` is already swept by docs.spec.ts's axe loop; what is added here is axe
 * on a RESEEDED page, which the default-seed sweep cannot see.
 */

/** Where the flat guide (the fallback without WebGL) is drawn: the creature's box, in the viewport. */
const guide = (page: Page) =>
  page.evaluate(() => {
    const g = document.querySelector<HTMLElement>(".guide")!;
    const r = g.querySelector(".echo-creature")!.getBoundingClientRect();
    return { visible: getComputedStyle(g).visibility === "visible", x: r.left + r.width / 2, y: r.top + r.height / 2, left: r.left, right: r.right };
  });

/**
 * The 3D stage, once it has drawn Echo. Where the browser has no WebGL, as CI's
 * Chromium hasn't, there's no stage to test: the drawing makes the
 * journey, and its own tests cover it.
 */
async function stage(page: Page) {
  const webgl = await page.evaluate(() => !!document.createElement("canvas").getContext("webgl2"));
  test.skip(!webgl, "no WebGL here, so the drawing makes the journey");
  const canvas = page.locator("canvas.echo3d");
  await expect(canvas).toHaveAttribute("data-echo", "ready", { timeout: 20_000 });
  return canvas;
}

/** Where the 3D Echo is drawn: its centre and size, in the viewport. */
const drawn = async (page: Page) => {
  const [x, y, size] = ((await page.locator("canvas.echo3d").getAttribute("data-at")) ?? "0,0,0").split(",").map(Number);
  return { x: x!, y: y!, size: size!, left: x! - size! / 2, right: x! + size! / 2 };
};

/** No WebGL: every context the page asks for comes back empty, as on a machine without it. */
const withoutWebGL = () => {
  const real = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, kind: string, ...rest: unknown[]) {
    if (kind.startsWith("webgl")) return null;
    return (real as (...a: unknown[]) => unknown).call(this, kind, ...rest);
  } as typeof real;
};

/**
 * What the page copies, recorded instead of read back from the system
 * clipboard: that one is shared by every browser the suite runs in parallel,
 * so a test could read another test's copy, or be refused for not having focus.
 */
const recordCopies = () => {
  const w = window as unknown as { __copied: string[] };
  w.__copied = [];
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText: async (text: string) => void w.__copied.push(text), readText: async () => w.__copied.at(-1) ?? "" },
  });
};
const lastCopy = (page: Page) => page.evaluate(() => (window as unknown as { __copied: string[] }).__copied.at(-1));

/** The hero's device, Echo's home. */
const device = (page: Page) => page.locator(".hero4 .brand-device");

/* --- the hero ------------------------------------------------------------------ */

test("the hero says what Echo is, and its device is the library's, working", async ({ page }) => {
  await page.goto("/");
  const hero = page.locator(".hero4");
  // The category and who it's for: said to everyone by the heading, shown on the screen by the words and the sentence they finish.
  await expect(hero.getByRole("heading", { level: 1 })).toHaveText("Echo: The design system your AI agent builds with");
  await expect(hero.locator(".hero4__word")).toHaveText(["DESIGN", "SYSTEM"]);
  await expect(hero.locator(".hero4__small")).toHaveText(["The", "your AI agent builds with"]);
  // What Echo is, in a line.
  await expect(hero.locator(".hero4__lede")).toHaveText(
    "An open-source UI library for AI agents, and the check that keeps every screen on-brand and accessible.",
  );

  // The device's keys are the library's caps, and they do what they say. The device floats, so
  // it's pressed from the keyboard: a pointer can't be asked to hit something that's moving.
  const pause = hero.getByRole("button", { name: "Pause", exact: true });
  await expect(pause).toHaveClass(/echo-hw__cap/);
  await hydrated(pause);
  await pause.focus();
  await page.keyboard.press("Enter");
  await expect(hero.getByRole("button", { name: "Start", exact: true })).toBeVisible();
  await expect(device(page)).toContainText("RESTING");
});

test("every button in the hero is the library's cap, and the calls to action are links", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const hero = page.locator(".hero4");
  for (const b of await hero.getByRole("button").all()) {
    // The command pill is the one exception: it's the code, pressed to copy.
    if ((await b.getAttribute("class"))?.includes("copy-cmd") || (await b.getAttribute("class"))?.includes("hero4__cmd")) continue;
    // The light key is the library's latching cap (LedKey); every other button is HardwareButton's.
    await expect(b).toHaveClass(/echo-hw__cap|echo-led-key__cap/);
  }

  // The two ways in: Echo's listing in ChatGPT, a link wearing the primary cap (open in a new tab, status-bar URL), and the command.
  const plugin = hero.getByRole("link", { name: "ChatGPT plugin" });
  await expect(plugin).toHaveAttribute("href", CHATGPT_LISTING_URL);
  await expect(plugin).toHaveClass(/echo-hw__cap/);
  await expect(plugin).toHaveAttribute("data-variant", "primary");
  expect(await plugin.evaluate((el) => getComputedStyle(el).textDecorationLine)).toBe("none");
  await expect(hero.getByRole("link", { name: "Support Echo" })).toHaveAttribute("href", "/support");

  // The card's own nav, and beside Support: GitHub (once the repository opens: REPO_PUBLIC), then X.
  const nav = hero.getByRole("navigation", { name: "Main" });
  await expect(nav.getByRole("link")).toHaveText(["Docs", "Plugin", "Motion", "Themes"]);
  const elsewhere = hero.getByRole("list", { name: "Echo elsewhere" }).getByRole("link");
  if (REPO_PUBLIC) {
    await expect(elsewhere).toHaveCount(2);
    await expect(elsewhere.first()).toHaveAccessibleName("Echo on GitHub");
    await expect(elsewhere.first()).toHaveAttribute("href", REPO_URL);
    await expect(elsewhere.last()).toHaveAccessibleName("Noor on X");
  } else {
    await expect(hero.locator(`a[href*='${REPO_URL}']`)).toHaveCount(0);
  }
});

test("the bar that takes over from the hero keeps its key, Support Echo, and neither has a sound key", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const rail = page.locator(".home-shell > .echo-shell__rail");
  await expect(page.locator(".hero4").getByRole("link", { name: "Support Echo" })).toHaveAttribute("href", "/support");
  // The bar is hidden until the card has scrolled away, so it's read by its key's place, not its role.
  const key = rail.locator(".echo-topnav__key a");
  await expect(key).toHaveText("Support Echo");
  await expect(key).toHaveAttribute("href", "/support");
  // The page's sound is switched on beside the motion buttons; a laptop mutes itself.
  await expect(page.locator(".navtools button")).toHaveCount(0);
  await expect(page.locator(".hero4 .navtools").getByRole("link", { name: "Noor on X" })).toBeVisible();
});

test("the hero's command copies as the plain command, and says so", async ({ page }) => {
  await page.addInitScript(recordCopies);
  await page.goto("/");
  const cmd = page.locator(".hero4 .hero4__cmd");
  // "Copied" shows for 1.6s. Recorded as it happens rather than looked for afterwards: while the
  // 3D stage starts up under a loaded test machine, the page can be busy for longer than that.
  await cmd.evaluate((el) => {
    const w = window as unknown as { __labels: string[] };
    w.__labels = [];
    new MutationObserver(() => w.__labels.push(el.getAttribute("aria-label") ?? "")).observe(el, { attributeFilter: ["aria-label"] });
  });
  await cmd.click();
  expect(await lastCopy(page)).toBe("npx echo-ui-cli init");
  await expect.poll(() => page.evaluate(() => (window as unknown as { __labels: string[] }).__labels)).toContain("Copied");
});

test("on a desktop, the site's own bar stands down while the hero's card (with its own nav) is on screen", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const rail = page.locator(".home-shell > .echo-shell__rail");
  // Hidden by visibility, so its links are out of the tab order too.
  await expect(rail).toBeHidden();
  // Well past the card.
  await page.evaluate(() => window.scrollTo(0, window.innerHeight * 2));
  await expect(rail).toBeVisible();
  await expect(rail.getByRole("link", { name: "Docs", exact: true })).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(rail).toBeHidden();
});

/**
 * Past the card and back ten times on one page, the bar comes and goes every time. A miss says when:
 * the timeline of scrolls, the bar's attribute and Lenis starting.
 */
test("on a desktop, the site's bar comes back every time the card scrolls away", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page.evaluate(() => {
    const w = window as unknown as { __timeline: string[] };
    w.__timeline = [];
    const t0 = performance.now();
    const root = document.documentElement;
    const note = (what: string) => w.__timeline.push(`${Math.round(performance.now() - t0)}ms ${what} at ${Math.round(window.scrollY)}, passed ${root.hasAttribute("data-hero-passed")}, lenis ${root.classList.contains("lenis")}`);
    window.addEventListener("scroll", () => note("scroll"), { passive: true });
    new MutationObserver(() => note("html changed")).observe(root, { attributes: true, attributeFilter: ["data-hero-passed", "class"] });
  });
  const rail = page.locator(".home-shell > .echo-shell__rail");
  for (let i = 0; i < 10; i++) {
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(rail).toBeHidden();
    await page.evaluate(() => window.scrollTo(0, window.innerHeight * 2));
    const shown = await expect(rail).toBeVisible().then(
      () => true,
      () => false,
    );
    if (!shown) {
      const timeline = await page.evaluate(() => (window as unknown as { __timeline: string[] }).__timeline.slice(-40));
      expect(shown, timeline.join("\n")).toBe(true);
    }
  }
});

/** The bar's notice comes from the scroll too, so a browser holding its observer's notices back can't keep it away. */
test("on a desktop, the site's bar comes back past the card even when the browser holds back its intersection notices", async ({ page }) => {
  await silenceObservers(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await folded(page);
  const rail = page.locator(".home-shell > .echo-shell__rail");
  await expect(rail).toBeHidden();
  await page.evaluate(() => window.scrollTo(0, window.innerHeight * 2));
  await expect(rail).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(rail).toBeHidden();
});

test("on a phone, the site's bar navigates and the card's own nav steps aside", { tag: "@mobile" }, async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator(".home-shell > .echo-shell__rail")).toBeVisible();
  await expect(page.locator(".hero4").getByRole("navigation", { name: "Main" })).toBeHidden();
});

/**
 * On a phone the hero is one column, and Echo at home has to sit on the
 * device's screen, clear of the paragraph under it. The first version of this
 * bug was the old hero's Echo sitting on the end of its line of text.
 */
test("on a phone, Echo at home sits on the device's screen, clear of the words", { tag: "@mobile" }, async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const [home, screen, text] = await page.evaluate(() => {
    const box = (el: Element) => {
      const r = el.getBoundingClientRect();
      return { left: r.left, right: r.right, top: r.top, bottom: r.bottom };
    };
    const range = document.createRange();
    range.selectNodeContents(document.querySelector(".hero4__lede")!);
    return [
      box(document.querySelector(".hero4 .brand-device__home")!),
      box(document.querySelector(".hero4 .brand-device__well")!),
      box(range),
    ];
  });
  const overlaps = (a: typeof home, b: typeof home) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
  expect(overlaps(home!, text!), `home ${JSON.stringify(home)}, text ${JSON.stringify(text)}`).toBe(false);
  // Inside the screen, not spilling out of it.
  expect(home!.left).toBeGreaterThanOrEqual(screen!.left - 1);
  expect(home!.right).toBeLessThanOrEqual(screen!.right + 1);
});

/* --- the story ------------------------------------------------------------------ */

test("the page tells Echo's story in order: what, who for, how it works, motion, objects, ChatGPT, where it works, who made it", async ({ page }) => {
  await page.goto("/");
  const headings = (await page.locator("main h1, main h2").allInnerTexts()).map((h) => h.replace(/\s+/g, " ").trim().toLowerCase());
  const at = (text: string) => {
    const i = headings.findIndex((h) => h.includes(text));
    expect(i, `"${text}" is a heading`).toBeGreaterThanOrEqual(0);
    return i;
  };
  const order = [
    "the design system your ai agent builds with",
    "for developers, designers and ai builders",
    "one design system. endless styles.",
    "motion buttons",
    "dials, tiles and flip boards",
    "echo ui is now in chatgpt",
    "wherever your agent builds.",
    "30 products before i turn 30",
  ].map(at);
  expect(order).toEqual([...order].sort((a, b) => a - b));
});

/* --- the road ------------------------------------------------------------------ */

/** The road's stops, in order: Add Echo to your AI, then the four steps, each a demo card. */
const STOPS = [
  ["get", "Add Echo to your AI"],
  ["make", "Make a style with AI"],
  ["pick", "Pick it, and try it on"],
  ["build", "Build with Echo"],
  ["check", "On-brand and WCAG 2.2 AA, checked"],
] as const;

/**
 * Under a heavy load a browser can hold an IntersectionObserver's notices back for seconds (on CI's
 * runner they never came while a test waited). This replaces the observer with one whose notices never
 * arrive, the far end of a starved one: what the homepage does on its own has to hold without them.
 */
async function silenceObservers(page: Page) {
  await page.addInitScript(() => {
    window.IntersectionObserver = class {
      // Takes what the real one takes, and never calls back.
      constructor(_callback: IntersectionObserverCallback, _options?: IntersectionObserverInit) {}
      readonly root = null;
      readonly rootMargin = "0px";
      readonly thresholds = [0];
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return [];
      }
    } as unknown as typeof IntersectionObserver;
  });
}

/**
 * The homepage hydrated and laid out as it stays: the Puzzle enhanced, its sheets folded away. Before
 * the fold every stop under it is about 2,000px lower, so a jump measured then lands that far past
 * where it meant to once the fold comes (on CI's runner, Chromium's scroll anchoring didn't make it up).
 */
async function folded(page: Page) {
  await hydrated(page.locator(".hero4").getByRole("button", { name: "Pause", exact: true }));
  await expect(page.locator(".pz[data-enhanced]")).toBeAttached({ timeout: 15_000 });
}

/**
 * Frames stop `id` in the room under the site's bar, as the wheel's step leaves
 * it (snap.ts `frameFor`). First the page has to be hydrated and still: before
 * it is, the Puzzle's three sheets stand one under another (as without
 * JavaScript), and their folding away moves every stop under them, by a whole
 * screen and more in WebKit, which keeps no scroll anchor. The fold is waited
 * for by its own mark (`data-enhanced`): on a busy machine the page could look
 * still for a moment before it, and Pick was framed, then left 2,000px away.
 */
async function frame(page: Page, id: string) {
  await folded(page);
  let last = -1;
  await expect
    .poll(
      async () => {
        const y = await page.evaluate((id) => Math.round(document.getElementById(id)!.getBoundingClientRect().top + window.scrollY), id);
        const still = y === last;
        last = y;
        return still;
      },
      { intervals: [250], timeout: 10_000 },
    )
    .toBe(true);
  await page.evaluate((id) => {
    const el = document.getElementById(id)!;
    const bar = document.querySelector<HTMLElement>(".home-shell > .echo-shell__rail")?.offsetHeight ?? 0;
    const r = el.getBoundingClientRect();
    const room = window.innerHeight - bar;
    const air = r.height <= room ? (room - r.height) / 2 : 16;
    window.scrollTo(0, Math.round(r.top + window.scrollY - bar - air));
  }, id);
}
const phase = (page: Page, id: string) => page.locator(`#${id}`).getAttribute("data-phase");

test("the road: Add Echo to your AI, then four steps, each a card under a plain name, and its links lead somewhere", async ({ page, request }) => {
  await page.goto("/");
  const road = page.locator("section.hiw");
  await expect(road.getByRole("heading", { level: 2 })).toHaveText("One design system. Endless styles.");
  for (const [id, name] of STOPS) await expect(page.locator(`#${id}`).getByRole("heading", { level: 3 }).first()).toHaveText(name);
  // Each stop is one the page comes to rest on.
  for (const [id] of STOPS) await expect(page.locator(`#${id}`)).toHaveAttribute("data-snap", "");
  const hrefs = await road.locator("a[href^='/']").evaluateAll((as) => [...new Set(as.map((a) => a.getAttribute("href")!.split("#")[0]!))]);
  expect(hrefs).toContain("/docs/workflow");
  for (const href of hrefs) expect((await request.get(href)).ok(), href).toBe(true);
});

test("Add Echo to your AI: the plugin is a link, and the terminal's own command line copies the command", async ({ page }) => {
  await page.addInitScript(recordCopies);
  await page.goto("/");
  const get = page.locator("#get");
  await expect(get.getByRole("link", { name: "Get the plugin" })).toHaveAttribute("href", "/docs/plugin");
  // One command on the card, and it's the terminal's: no second pill repeating it.
  await expect(get.getByRole("button", { name: /^Copy the command/ })).toHaveCount(1);
  const line = get.locator(".term__cmd");
  await expect(line).toHaveAccessibleName("Copy the command: npx echo-ui-cli init");
  await hydrated(line);
  // "Copied" shows for 1.6s: recorded as it happens, as the hero's command is, not looked for afterwards.
  await line.evaluate((el) => {
    const w = window as unknown as { __labels: string[] };
    w.__labels = [];
    new MutationObserver(() => w.__labels.push(el.getAttribute("aria-label") ?? "")).observe(el, { attributeFilter: ["aria-label"] });
  });
  await line.click();
  // The copy is the clipboard's, so it lands a moment after the press.
  await expect.poll(() => lastCopy(page)).toBe("npx echo-ui-cli init");
  await expect.poll(() => page.evaluate(() => (window as unknown as { __labels: string[] }).__labels)).toContain("Copied");
  // What init printed is the real output, word for word, as far as it's shown.
  await expect(get.locator(".term:not(.term--chat)")).toContainText("Then: npx echo-ui-cli add hardware-button");
  // It's a demo like the other stops: framed, Echo sends the chat's question, then hops onto the terminal and init runs.
  await frame(page, "get");
  await expect.poll(() => phase(page, "get"), { timeout: 20_000 }).toBe("done");
  await expect(get.locator(".jy-msg[data-from='me']")).toBeVisible();
  await expect(get.locator(".term:not(.term--chat)")).toHaveAttribute("data-state", "typing");
});

test("a demo plays once its card is framed, and Echo presses its buttons through to the end", async ({ page }) => {
  await page.setViewportSize({ width: 1512, height: 860 });
  await page.goto("/");
  await expect(page.locator("#build")).toHaveAttribute("data-live", "");
  await expect.poll(() => phase(page, "build")).toBe("waiting");
  await frame(page, "build");
  await expect.poll(() => phase(page, "build"), { timeout: 10_000 }).toBe("playing");
  await expect.poll(() => phase(page, "build"), { timeout: 20_000 }).toBe("done");
  // Echo pressed Send: the prompt went up, and the run's reply came in under it.
  const build = page.locator("#build");
  await expect(build.locator(".jy-msg[data-from='me']")).toBeVisible();
  await expect(build).toContainText("Built Pocket with real Echo UI components in Ink Instrument.");
  await expect(build.locator(".jy-file__title")).toHaveText(["Student budget source", "Student budget, desktop"]);
  // Beside the conversation, what it built, on the desktop and the phone it was checked on.
  await expect(build.getByRole("img", { name: /^Pocket, the screen it built.* On a desktop\.$/ })).toBeVisible();
  await expect(build.getByRole("img", { name: /^Pocket, the screen it built.* On a phone\.$/ })).toBeVisible();
  await expect(build.getByRole("button", { name: "Play the demo again" })).toBeVisible();
});

/**
 * WCAG 2.2.2: anything that moves on its own for longer than five seconds,
 * beside the page's content, needs a way to stop it that isn't hovering. The
 * first version of this bug was the old homepage's ticker; then the
 * comparison's sweeping line. On the road today, it's every demo card: its
 * pause key stops it from the keyboard, and plays it on again.
 */
test("what moves on its own can be stopped without a mouse, and started again", async ({ page }) => {
  await page.setViewportSize({ width: 1512, height: 860 });
  await page.goto("/");
  await frame(page, "make");
  await expect.poll(() => phase(page, "make"), { timeout: 10_000 }).toBe("playing");
  const pause = page.locator("#make").getByRole("button", { name: "Pause the demo" });
  await hydrated(pause);
  await pause.focus();
  await page.keyboard.press("Enter");
  await expect.poll(() => phase(page, "make")).toBe("paused");
  const ring = () => page.locator("#make").evaluate((el) => getComputedStyle(el).getPropertyValue("--demo-p").trim());
  const stopped = await ring();
  await page.waitForTimeout(1200);
  expect(await ring()).toBe(stopped);
  await page.locator("#make").getByRole("button", { name: "Play the demo" }).press("Enter");
  await expect.poll(() => phase(page, "make")).toBe("playing");
  await expect.poll(ring).not.toBe(stopped);
});

test("Pick it, and try it on: the page wears Ink Instrument while the card is read, and is Echo's own again past it", async ({ page }) => {
  await page.setViewportSize({ width: 1512, height: 860 });
  await page.goto("/");
  const worn = () => page.evaluate(() => document.documentElement.hasAttribute("data-journey-wear"));
  await frame(page, "pick");
  // Echo flips the style toggle (its second press), and the whole page changes.
  await expect.poll(worn, { timeout: 15_000 }).toBe(true).catch(async (e) => {
    const at = await page.evaluate(() => {
      const r = document.getElementById("pick")!.getBoundingClientRect();
      const bar = document.querySelector<HTMLElement>(".home-shell > .echo-shell__rail")!.getBoundingClientRect();
      return `pick ${Math.round(r.top)}..${Math.round(r.bottom)} of ${window.innerHeight}, bar ${Math.round(bar.top)}..${Math.round(bar.bottom)}, phase ${document.getElementById("pick")!.dataset.phase}, step ${document.getElementById("pick")!.dataset.step}, scrollY ${Math.round(window.scrollY)}`;
    });
    throw new Error(`${(e as Error).message}\n${at}`);
  });
  await expect.poll(() => phase(page, "pick"), { timeout: 20_000 }).toBe("done");
  // The promise under the parts is selected: whatever you wear, text stays readable.
  await expect(page.locator("#pick")).toContainText("WCAG 2.2 AA");
  await expect(page.locator("#pick .try__select")).toHaveAttribute("data-on", "");
  // On to Build, and back up to Make: Echo's own style both ways. Back on Pick: worn again.
  await frame(page, "build");
  await expect.poll(worn).toBe(false);
  await frame(page, "pick");
  await expect.poll(worn).toBe(true);
  await frame(page, "make");
  await expect.poll(worn).toBe(false);
});

/*
 * The hand wins over a motion. On the road, a press of the visitor's own while a demo plays is
 * theirs: the demo stops where they took it, and nothing moves it back.
 */
test("a press of your own while a demo plays is yours: the demo stops where you took it", async ({ page }) => {
  await page.setViewportSize({ width: 1512, height: 860 });
  await page.goto("/");
  await frame(page, "pick");
  await expect.poll(() => phase(page, "pick"), { timeout: 10_000 }).toBe("playing");
  // The style toggle is the demo's second press. Taken before Echo gets there or after (a slow browser
  // can be later than its 2.8s), the press is ours: it flips the toggle, and the demo stops.
  const toggle = page.locator("#pick").getByRole("switch", { name: "Wear Ink Instrument on this page" });
  await hydrated(toggle);
  const mine = (await toggle.getAttribute("aria-checked")) === "true" ? "false" : "true";
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-checked", mine);
  await expect.poll(() => phase(page, "pick")).toBe("paused");
  // Longer than the whole demo: one still writing would have flipped it by now.
  await page.waitForTimeout(6000);
  await expect(toggle).toHaveAttribute("aria-checked", mine);
  expect(await phase(page, "pick")).toBe("paused");
});

test("On-brand and WCAG 2.2 AA, checked: you ask Echo to check, the button is selected and numbered as the findings are, and the fix puts Echo's in its place", async ({ page }) => {
  await page.setViewportSize({ width: 1512, height: 860 });
  await page.goto("/");
  const check = page.locator("#check");
  const stage = check.locator(".ck-stage");
  await frame(page, "check");
  await expect(check).toContainText("2 problems, each with the Echo way to fix it:", { timeout: 15_000 });
  await expect(check).toContainText("is a colour written by hand: use a role from your theme");
  // Checked: the blue button is selected, the verdict on the glass beside it lit, and the picture says why.
  await expect(stage).toHaveAttribute("data-checked", "");
  await expect(stage.locator(".ck-select")).toHaveAttribute("data-on", "");
  await expect(stage.locator(".echo-annunciator__mark[data-on]")).toHaveText(["Not your style"]);
  await expect(check.getByRole("img", { name: /not your style/ })).toBeVisible();
  await expect.poll(() => phase(page, "check"), { timeout: 20_000 }).toBe("done");
  await expect(check).toContainText("No problems: nothing here goes against Echo's rules.");
  // Fixed: Echo's button in the blue one's place, in the page's own style (the style is worn on Pick only).
  await expect(stage).toHaveAttribute("data-fixed", "");
  await expect(check.getByRole("img", { name: /in your style, at WCAG 2\.2 AA/ })).toBeVisible();
  await expect(stage.locator(".echo-annunciator__mark[data-on]")).toHaveText(["In your style", "WCAG 2.2 AA"]);
  expect(await page.evaluate(() => document.documentElement.hasAttribute("data-journey-wear"))).toBe(false);
});

test("the wheel steps one stop per push, and a push while a card plays hurries it, then goes on", async ({ page }) => {
  await page.setViewportSize({ width: 1512, height: 860 });
  await page.goto("/");
  await expect(page.locator("html")).toHaveClass(/\blenis\b/);
  await page.mouse.move(700, 500);
  /** Which stop is framed now, if any. */
  const framed = () =>
    page.evaluate(() => {
      const bar = document.querySelector<HTMLElement>(".home-shell > .echo-shell__rail")?.offsetHeight ?? 0;
      return ["get", "make", "pick", "build", "check"].find((id) => {
        const r = document.getElementById(id)!.getBoundingClientRect();
        return r.top >= bar - 40 && r.bottom <= window.innerHeight + 40;
      });
    });
  /**
   * One push: a flick's wheel events, sent in one go from inside the page. Sent
   * one by one from the test, a loaded machine spaces them out, and the page
   * rightly reads each gap as a new push.
   */
  const push = (dir: 1 | -1) =>
    page.evaluate((dir) => {
      const el = document.elementFromPoint(700, 500) ?? document.body;
      for (let i = 0; i < 12; i++) el.dispatchEvent(new WheelEvent("wheel", { deltaY: 100 * dir, bubbles: true, cancelable: true, clientX: 700, clientY: 500 }));
    }, dir);
  // Near the road by script (a script never steps), then the wheel takes over.
  await page.evaluate(() => window.scrollTo(0, document.getElementById("get")!.getBoundingClientRect().top + window.scrollY - 900));
  await page.waitForTimeout(800);
  /** Where the page rests against a stop's frame (snap.ts `frameFor`), once it has stopped moving. */
  const rest = async (id: string) => {
    let last = -1;
    await expect.poll(async () => {
      const y = await page.evaluate(() => Math.round(window.scrollY));
      const still = y === last;
      last = y;
      return still;
    }, { intervals: [300], timeout: 8000 }).toBe(true);
    return page.evaluate((id) => {
      const el = document.getElementById(id)!;
      const bar = document.querySelector<HTMLElement>(".home-shell > .echo-shell__rail")?.offsetHeight ?? 0;
      const r = el.getBoundingClientRect();
      const room = window.innerHeight - bar;
      const air = r.height <= room ? (room - r.height) / 2 : 16;
      return `scrollY ${Math.round(window.scrollY)}, ${id}'s frame ${Math.round(r.top + window.scrollY - bar - air)}`;
    }, id);
  };
  await push(1);
  await expect.poll(framed, { timeout: 5000 }).toBe("get");
  const atGet = await rest("get");
  await page.waitForTimeout(400);
  // One push: Add Echo to your AI is playing, so it plays the rest fast and the page goes on to Make, which starts to play.
  await push(1);
  await expect.poll(framed, { timeout: 5000, message: `from ${atGet}` }).toBe("make");
  const where = () =>
    page.evaluate(() => {
      const r = document.getElementById("make")!.getBoundingClientRect();
      const bar = document.querySelector<HTMLElement>(".home-shell > .echo-shell__rail")!.getBoundingClientRect();
      return `make ${Math.round(r.top)}..${Math.round(r.bottom)} of ${window.innerHeight}, bar bottom ${Math.round(bar.bottom)}, scrollY ${Math.round(window.scrollY)}, live ${document.getElementById("make")!.hasAttribute("data-live")}`;
    });
  await expect.poll(() => phase(page, "make"), { timeout: 10_000, message: "Make starts" }).toBe("playing").catch(async (e) => {
    throw new Error(`${(e as Error).message}\n${await where()}`);
  });
  // Pushed on while it plays, the page stays on it and the rest of the demo plays fast: the pause key pulses to say why.
  await page.waitForTimeout(400);
  await push(1);
  await expect(page.locator("#make")).toHaveAttribute("data-nudged", "");
  await expect(page.locator("#make")).toHaveAttribute("data-hurried", "");
  expect(await framed()).toBe("make");
  // Once it has played to its end, every step seen, the page goes on by itself, as the push asked: two pushes a card.
  await expect.poll(() => phase(page, "make"), { timeout: 5000 }).toBe("done");
  await expect(page.locator("#make")).toHaveAttribute("data-seen", "");
  await expect.poll(framed, { timeout: 5000 }).toBe("pick");
  // Up is never held.
  await page.waitForTimeout(1200);
  await push(-1);
  await expect.poll(framed, { timeout: 5000 }).toBe("make");
  // Seen, Make holds nothing now, even playing again: one push goes on.
  await page.waitForTimeout(1200);
  await push(1);
  await expect.poll(framed, { timeout: 5000 }).toBe("pick");
});

/*
 * The page can come to rest a few pixels off a stop's frame (a glide
 * dropped when late content shifts the page under it, which a loaded machine
 * makes likely). The wheel's hold took a card within 40px as framed, but a
 * card only started playing within 6px, and the next push took the stop
 * already in view as the "next" one. So the card waited, the wheel waited for
 * it, and a push went nowhere. Within the same 40px, a stop is the one in view.
 */
test("a stop the page rests a little off is the one in view: its demo plays, and a push moves on", async ({ page }) => {
  await page.setViewportSize({ width: 1512, height: 860 });
  await page.goto("/");
  await expect(page.locator("html")).toHaveClass(/\blenis\b/);
  await expect(page.locator("#make")).toHaveAttribute("data-live", "");
  /** Where the page frames stop `id`, plus `off` px: one script scroll, so the stop is never exactly framed first. */
  const restOff = (id: string, off: number) =>
    page.evaluate(
      ([id, off]) => {
        const el = document.getElementById(id)!;
        const bar = document.querySelector<HTMLElement>(".home-shell > .echo-shell__rail")?.offsetHeight ?? 0;
        const r = el.getBoundingClientRect();
        const room = window.innerHeight - bar;
        const air = r.height <= room ? (room - r.height) / 2 : 16;
        window.scrollTo(0, Math.round(r.top + window.scrollY - bar - air) + off);
      },
      [id, off] as const,
    );
  const top = () => page.evaluate(() => Math.round(window.scrollY));

  // 30px short of Make's frame (its foot just under the window's): Make plays.
  await restOff("make", -30);
  await expect.poll(() => phase(page, "make"), { timeout: 10_000 }).toBe("playing");

  // 20px short of Get's frame, a push down goes on to Make, not back onto Get.
  await restOff("get", -20);
  await page.waitForTimeout(400);
  const before = await top();
  await page.mouse.move(700, 500);
  await page.evaluate(() => {
    const el = document.elementFromPoint(700, 500) ?? document.body;
    for (let i = 0; i < 12; i++) el.dispatchEvent(new WheelEvent("wheel", { deltaY: 100, bubbles: true, cancelable: true, clientX: 700, clientY: 500 }));
  });
  await expect.poll(top, { timeout: 5000 }).toBeGreaterThan(before + 200);
});

test("under reduced motion every card shows its end, and nothing plays", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1512, height: 860 });
  await page.goto("/");
  for (const [id] of STOPS.slice(1)) {
    await frame(page, id);
    await expect(page.locator(`#${id}`)).not.toHaveAttribute("data-live", "");
  }
  await expect(page.locator("#build")).toContainText("Built Pocket with real Echo UI components in Ink Instrument.");
  // The Check card tells the whole story at once: what was found, then the fix.
  await expect(page.locator("#check")).toContainText("is a colour written by hand");
  // Nothing is put on for you: the style toggle is yours to press.
  expect(await page.evaluate(() => document.documentElement.hasAttribute("data-journey-wear"))).toBe(false);
});

/* --- colour ---------------------------------------------------------------------- */

const accent = (page: Page) => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--echo-accent").trim());

test("the homepage opens on Sky until a colour is chosen, and one chosen anywhere on the site relights the whole page", async ({ page }) => {
  await page.goto("/");
  const read = () =>
    page.evaluate(() => {
      const root = getComputedStyle(document.documentElement);
      return {
        accent: root.getPropertyValue("--echo-accent").trim(),
        // Deliberately OUTSIDE the hero: if the seed only reached the device, these are what notice.
        rail: getComputedStyle(document.querySelector(".home-shell > .echo-shell__rail")!).backgroundColor,
        piece: getComputedStyle(document.querySelector(".pz__piece[data-role='seed'] .pz__stop-mid")!).stopColor,
      };
    });
  const before = await read();
  expect(before.accent.toLowerCase()).toBe("#3d8ef0");
  expect(await page.evaluate(() => document.documentElement.hasAttribute("data-seed-chosen"))).toBe(false);

  // A colour chosen in the theme generator is the site's: the homepage opens on it.
  await page.goto("/generator");
  const coral = page.getByRole("button", { name: "Coral", exact: true });
  await hydrated(coral);
  await coral.click();
  await page.goto("/");
  const after = await read();
  expect(after.accent).not.toBe(before.accent);
  expect(after.rail).not.toBe(before.rail);
  expect(after.piece).not.toBe(before.piece);
});

test("a reseeded homepage is still axe-clean, the hard colour included", { tag: "@mobile" }, async ({ page }) => {
  // Two presets, and a hard yellow by link, the way the plugin's link brings a colour: fixed up to AA.
  const links = ["/generator?style=drafting-index", "/generator?accent=e0457b", "/generator?accent=f2e66b"];
  // Each link is a generator page, the whole homepage and axe over all of it: about 4s on two cores, and
  // more than twice that on a busy CI runner, where three of them outran the default 30s.
  budgetPages(links.length, 15_000);
  for (const link of links) {
    await page.goto(link);
    await expect(page.locator("html")).toHaveAttribute("data-seed-chosen", "");
    await page.goto("/");
    const results = await axe(page).analyze();
    expect(results.violations, `${link}: ${results.violations.map((v) => v.id).join(", ")}`).toEqual([]);
  }
  // The hard yellow was moved until it reads: it isn't the yellow that was asked for.
  expect((await accent(page)).toLowerCase()).not.toBe("#f2e66b");
});

/* --- sound ------------------------------------------------------------------------- */

test("sound is offered, never forced", async ({ page }) => {
  // Count AudioContext constructions from before the page's own scripts run.
  await page.addInitScript(() => {
    const w = window as unknown as { __ac: number; AudioContext: typeof AudioContext };
    w.__ac = 0;
    const Real = w.AudioContext;
    w.AudioContext = class extends Real {
      constructor(...args: ConstructorParameters<typeof AudioContext>) {
        super(...args);
        w.__ac += 1;
      }
    } as typeof AudioContext;
  });

  await page.goto("/");
  // No AudioContext until a user gesture. Nothing makes noise on arrival.
  expect(await page.evaluate(() => (window as unknown as { __ac: number }).__ac)).toBe(0);

  // On/off is a Switch — the library's, not a hand-made pill — and there is ONE.
  // A first visit starts with sound off: nothing sounds until you ask for it.
  const toggle = page.getByRole("switch", { name: "Sound", exact: true });
  await expect(toggle).toHaveCount(1);
  await expect(toggle).toHaveAttribute("aria-checked", "false");

  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-checked", "true");

  // The preference is answered once, not on every visit.
  await page.reload();
  await expect(page.getByRole("switch", { name: "Sound", exact: true })).toHaveAttribute("aria-checked", "true");
});

/* --- who it's for ------------------------------------------------------------------- */

test("who it's for: a piece opens its sheet, the switcher moves between them, and Esc gives focus back", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const pieces = page.locator(".pz__board[data-set='wide']");
  const dev = pieces.getByRole("button", { name: "For developers" });
  await expect(pieces.getByRole("button")).toHaveCount(3);
  await expect(dev).toHaveAttribute("aria-expanded", "false");

  await dev.click();
  const sheet = page.locator(".pz__sheet");
  // The sheet grows out of the piece; once it has, it's whole.
  await expect.poll(() => sheet.evaluate((el) => el.style.clipPath)).toBe("");
  await expect(page.getByRole("heading", { level: 3, name: "You get the source code" })).toBeFocused();
  // Adding Echo, as the terminal printed it: both commands, each a key that copies it.
  await expect(sheet.getByRole("button", { name: "Copy the command: npx echo-ui-cli add hardware-button" })).toBeVisible();
  await expect(sheet).toContainText("new  src/components/echo/hardware-button/hardware-button.tsx");

  // The switcher is the library's Segmented; the pieces behind the sheet can't be reached.
  await page.getByRole("radio", { name: "Designers" }).click();
  await expect(page.getByRole("heading", { level: 3, name: "Your mood board becomes a style" })).toBeVisible();
  await expect(page.locator("#for-developers")).toBeHidden();
  expect(await pieces.evaluate((el) => el.inert)).toBe(true);

  await page.keyboard.press("Escape");
  await expect(sheet).toBeHidden();
  await expect(pieces.getByRole("button", { name: "For designers" })).toBeFocused();
  await expect(pieces.getByRole("button", { name: "For designers" })).toHaveAttribute("aria-expanded", "false");
});

test("who it's for: the address opens a piece, and the AI sheet adds Echo in ChatGPT first, then init, the plugin or the hosted server for tools without a terminal", async ({ page }) => {
  await page.goto("/#for-ai");
  const panel = page.locator("#for-ai");
  await expect(panel).toBeVisible();
  await expect(panel.getByRole("heading", { level: 3, name: "Echo is in ChatGPT" })).toBeVisible();
  await expect(panel.getByRole("link", { name: "Add to ChatGPT" })).toHaveAttribute("href", CHATGPT_LISTING_URL);
  await expect(panel.getByRole("button", { name: "Copy the command: npx echo-ui-cli init" })).toBeVisible();
  await expect(panel).toContainText(HOSTED_MCP_URL);
  await expect(panel.getByRole("link", { name: "Get the plugin" })).toHaveAttribute("href", "/docs/plugin");
});

test("who it's for: the designers' sheet links the generator and the tests, and shows a finding as the terminal printed it", async ({ page }) => {
  await page.goto("/#for-designers");
  const panel = page.locator("#for-designers");
  await expect(panel.getByRole("link", { name: "Make a theme" })).toHaveAttribute("href", "/generator");
  await expect(panel.getByRole("link", { name: "See the tests" })).toHaveAttribute("href", "/docs/checks");
  await expect(panel.getByRole("button", { name: "Copy the command: npx echo-ui-cli test" })).toBeVisible();
  await expect(panel).toContainText("3 cards side by side have their actions at 2 heights");
});

test("who it's for: the filler pieces are only filling, nothing to press or reach", async ({ page }) => {
  await page.goto("/");
  const fillers = page.locator(".pz__piece[data-filler]");
  expect(await fillers.count()).toBeGreaterThan(0);
  for (const f of await fillers.all()) {
    await expect(f).toHaveAttribute("aria-hidden", "true");
    expect(await f.evaluate((el) => el.tagName)).toBe("SPAN");
  }
});

/* --- sound and motion ----------------------------------------------------------------- */

test("the motion list: eight running buttons on one panel, each with a way to its docs, and one awake at a time", async ({ page, request }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const cells = page.locator(".wins__cell");
  await expect(cells).toHaveCount(8);
  for (const link of await page.locator(".wins__name").all()) {
    const href = (await link.getAttribute("href"))!;
    expect((await request.get(href)).status(), href).toBe(200);
  }
  await expect(page.locator(".wins__all")).toHaveAttribute("href", "/motion");

  // Calm: pointing at one wakes it, and only it.
  await cells.nth(4).scrollIntoViewIfNeeded();
  await cells.nth(4).hover();
  await expect(cells.nth(4)).toHaveAttribute("data-awake", "");
  await expect(page.locator(".wins__cell[data-awake]")).toHaveCount(1);
});

/* --- the objects ---------------------------------------------------------------- */

test("the objects are real components: each is named with a link to its page, and its component", async ({ page, request }) => {
  await page.goto("/");
  const cells = page.locator(".objects__cell");
  await expect(cells).toHaveCount(6);
  for (const cell of await cells.all()) {
    const slug = (await cell.getAttribute("data-object"))!;
    await expect(cell.locator(".objects__name")).toHaveAttribute("href", `/docs/${slug}`);
    await expect(cell.locator(".objects__tag")).not.toBeEmpty();
    expect((await request.get(`/docs/${slug}`)).status(), slug).toBe(200);
  }
  // The status island opens by itself as it scrolls up into the window, and shuts again scrolled back below it.
  const island = page.locator('[data-object="status-island"] .echo-status-island button[aria-expanded]').first();
  await page.locator('[data-object="status-island"]').evaluate((el) => el.scrollIntoView({ block: "center" }));
  await expect(island).toHaveAttribute("aria-expanded", "true", { timeout: 15_000 });
  await page.evaluate(() => window.scrollBy(0, -window.innerHeight));
  await expect(island).toHaveAttribute("aria-expanded", "false");
});

test("a whole screen: the framed template switches, and runs", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const pick = page.getByRole("group", { name: "Screen" });
  await pick.scrollIntoViewIfNeeded();
  await expect(pick.getByRole("button", { name: "Console" })).toHaveAttribute("aria-pressed", "true");
  await pick.getByRole("button", { name: "Chat" }).click();
  await expect(pick.getByRole("button", { name: "Chat" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".objects__frame").getByRole("textbox").first()).toBeVisible({ timeout: 15_000 });
});

/**
 * The homepage hides its own top bar while the hero's card is on screen, by a
 * rule on `.home-shell .echo-shell__rail`. That also caught the Console
 * template's bar inside the framed screen further down: it went
 * `position: fixed` and sat over the top of the window, on top of the site's
 * own bar. Only the page's own bar is the page's.
 */
test("the framed Console keeps its bar inside its frame", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const frame = page.locator(".objects__frame");
  const rail = frame.locator(".echo-shell__rail").first();
  // Brought into view until it stays: on CI's runner the page's glide carried on past the frame,
  // which loads its screen only when it's near, and it never came back.
  await expect(async () => {
    await frame.scrollIntoViewIfNeeded();
    await expect(rail).toBeAttached({ timeout: 3_000 });
  }).toPass({ timeout: 30_000 });
  expect(await rail.evaluate((el) => getComputedStyle(el).position)).not.toBe("fixed");
  // Both edges read in one go: the page glides as it scrolls, and two separate
  // reads can land on different frames of the glide.
  const [frameTop, railTop] = await frame.evaluate((el) => [
    el.getBoundingClientRect().y,
    el.querySelector(".echo-shell__rail")!.getBoundingClientRect().y,
  ]);
  expect(railTop).toBeGreaterThanOrEqual(frameTop! - 1);
});

/**
 * A demo below the fold keeps its place while its code is on the way. Its box
 * held a height until it came near, then let it go the moment loading began,
 * so the objects and the framed screen collapsed for as long as their chunks
 * took (half a second on a dev server) and grew back after: the page under
 * the visitor shrank by a screen and more, and the browser moved them.
 */
test("a demo's place keeps its size while its code loads, so the page never jumps", async ({ page }) => {
  await page.setViewportSize({ width: 1512, height: 860 });
  await page.goto("/");
  await folded(page);
  // Every frame from the jump until the demos are in: the least the sheet and the frame ever measured.
  await page.evaluate(() => {
    const w = window as unknown as { least: { grid: number; screen: number } };
    w.least = { grid: Infinity, screen: Infinity };
    const grid = document.querySelector(".objects__grid")!;
    const screen = document.querySelector(".objects__screen")!;
    const tick = () => {
      w.least.grid = Math.min(w.least.grid, grid.getBoundingClientRect().height);
      w.least.screen = Math.min(w.least.screen, screen.getBoundingClientRect().height);
      requestAnimationFrame(tick);
    };
    tick();
    document.querySelector(".objects__show")!.scrollIntoView({ block: "center" });
  });
  await expect(page.locator(".objects__fit .echo-console__body")).toBeVisible({ timeout: 15_000 });
  await expect(page.locator(".objects__cell .objects__stage > *").first()).toBeVisible();
  await page.waitForTimeout(500);
  const { least, now } = await page.evaluate(() => ({
    least: (window as unknown as { least: { grid: number; screen: number } }).least,
    now: {
      grid: document.querySelector(".objects__grid")!.getBoundingClientRect().height,
      screen: document.querySelector(".objects__screen")!.getBoundingClientRect().height,
    },
  }));
  expect(least.screen, "the framed screen's box, at its least").toBeGreaterThan(now.screen * 0.95);
  expect(least.grid, "the objects' sheet, at its least").toBeGreaterThan(now.grid * 0.9);
});

/**
 * On a phone the homepage panned sideways, by 826px once its demos had come
 * in: the framed screen's column took the 1180px screen's width as its own,
 * and a chat bubble's column its longest unbroken key. The route sweep loads
 * the page and never scrolls it, so the demos that mount as you come near
 * were never measured.
 */
/*
 * An open StatusIsland was as wide as the screen allowed (up to
 * 340px), whatever it sat in: its open width made it at least that wide, so a
 * box sized by its content (the objects' cell, on a phone) grew past its column
 * and the page scrolled sideways. Open, it's as wide as its box allows.
 */
test("on the smallest phone, the open status island stays inside its cell", { tag: "@mobile" }, async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const cell = page.locator('[data-object="status-island"]');
  await cell.evaluate((el) => el.scrollIntoView({ block: "center" }));
  const slab = cell.locator(".echo-status-island__slab[data-open]");
  await expect(slab).toBeVisible({ timeout: 15_000 });
  const [inner, open] = await Promise.all([
    cell.locator(".objects__stage").evaluate((el) => el.getBoundingClientRect().right),
    slab.evaluate((el) => el.getBoundingClientRect().right),
  ]);
  expect(open).toBeLessThanOrEqual(inner + 0.5);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
});

test("on a phone the homepage never scrolls sideways, every demo in", { tag: "@mobile" }, async ({ page }) => {
  // It also holds Check's leader, a 1.5px hairline on a phone, hung its 7px dot out of both sides.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await folded(page);
  // Down the whole page, so every demo that waits to be near has mounted.
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < height; y += 600) {
    await page.evaluate((top) => window.scrollTo(0, top), y);
    await page.waitForTimeout(80);
  }
  await expect(page.locator(".objects__fit .echo-console__body")).toBeAttached({ timeout: 15_000 });
  await page.waitForTimeout(500);
  expect(formatOverflow(await findHorizontalOverflow(page))).toEqual([]);
});

/* --- on a phone, laid out for it ------------------------------------------------- */

/*
 * On a phone the page is laid out for a phone, not shrunk from the desktop: the road's
 * cable gives its strip to the cards, the templates reflow at their frame's width, and the close's sheet
 * fits the window, so the scroll writes it while it's held.
 */
test("on a phone, the road has no cable and its cards take the column's whole width; a wide window has the cable", { tag: "@mobile" }, async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await folded(page);
  await page.locator(".hiw__way").evaluate((el) => window.scrollBy({ top: el.getBoundingClientRect().top - 100, behavior: "instant" }));
  await expect(page.locator(".hiw__card .demo[data-live]").first()).toBeAttached();
  await page.waitForTimeout(800);
  await expect(page.locator(".hiw__road, .hiw-station, .hiw__plug")).toHaveCount(0);
  const edges = (sel: string) =>
    page.locator(sel).first().evaluate((el) => {
      const r = el.getBoundingClientRect();
      return [Math.round(r.left), Math.round(r.right)];
    });
  expect(await edges(".hiw__card")).toEqual(await edges(".hiw > .big-title"));
  await page.setViewportSize({ width: 1280, height: 800 });
  await expect(page.locator(".hiw__road")).toHaveCount(1);
});

test("on a phone, the bar is the wordmark and Menu's three lines, and Menu opens everything else", { tag: "@mobile" }, async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const rail = page.locator(".home-shell > .echo-shell__rail");
  await hydrated(rail.getByRole("button", { name: "Menu" }));
  // Nothing in the bar scrolls sideways, and nothing in it is out of sight.
  expect(await rail.locator(".echo-shell__railnav").evaluate((el) => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(0);
  // Two things: the wordmark, and Menu as its icon alone, named for a screen reader.
  await expect(rail.getByRole("link", { name: "Support Echo" })).toBeHidden();
  await expect(rail.locator(".echo-topnav__link").first()).toBeHidden();
  await expect(rail.getByRole("button", { name: "Menu" })).toHaveText("");
  const toggle = await rail.getByRole("button", { name: "Menu" }).boundingBox();
  expect(toggle!.width).toBeGreaterThanOrEqual(24);
  expect(toggle!.width).toBeLessThanOrEqual(toggle!.height + 1);
  await rail.getByRole("button", { name: "Menu" }).click();
  const menu = page.getByRole("dialog", { name: "Menu" });
  await expect(menu.getByRole("navigation", { name: "Site" }).getByRole("link")).toHaveText(["Docs", "Motion", "Templates", "Themes", "Sound", "Tactile"]);
  // Under the list, the bar's right-hand side: the page's own keys, then Support Echo. No sound key.
  await expect(menu.getByRole("link", { name: "Noor on X" })).toBeVisible();
  await expect(menu.getByRole("list", { name: "Echo elsewhere" }).getByRole("button")).toHaveCount(0);
  await expect(menu.getByRole("link", { name: "Support Echo" })).toHaveAttribute("href", "/support");
  await expect(menu.getByRole("link", { name: "Support Echo" })).toBeVisible();
  // A wide window has them in the bar, and no menu.
  await page.keyboard.press("Escape");
  await page.setViewportSize({ width: 1280, height: 800 });
  await expect(rail.getByRole("link", { name: "Docs", exact: true })).toBeVisible();
  await expect(rail.getByRole("button", { name: "Menu" })).toBeHidden();
});

test("under a finger, a road card's name is there before the card plays", { tag: "@touch" }, async ({ page }) => {
  await page.goto("/");
  await folded(page);
  const card = page.locator(".hiw__card .demo").nth(1);
  await expect(card).toHaveAttribute("data-live", "");
  // Its head in the middle of the window: on the way to it, not yet framed.
  await card.evaluate((el) => window.scrollBy({ top: el.getBoundingClientRect().top - window.innerHeight / 2, behavior: "instant" }));
  await page.waitForTimeout(400);
  await expect(card).toHaveAttribute("data-phase", "waiting");
  expect(await card.locator(".demo__name").evaluate((el) => getComputedStyle(el).opacity)).toBe("1");
});

test("on a phone, the whole screens are laid out at their frame's width, not drawn small, and both are one height", { tag: "@mobile" }, async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await folded(page);
  const show = page.locator(".objects__show");
  await show.evaluate((el) => window.scrollBy({ top: el.getBoundingClientRect().top - 70, behavior: "instant" }));
  await expect(page.locator(".objects__fit .echo-console__body")).toBeAttached({ timeout: 15_000 });
  const laid = () =>
    page.locator(".objects__fit").evaluate((el) => {
      const s = el.querySelector<HTMLElement>(".fit__screen")!;
      return { box: el.clientWidth, width: s.offsetWidth, scale: new DOMMatrix(getComputedStyle(s).transform).a, height: el.getBoundingClientRect().height };
    });
  // Measured once it's laid out (FitScreen sizes its box on the next frame).
  await expect.poll(async () => (await laid()).height).toBeGreaterThan(0);
  const consoleScreen = await laid();
  expect(consoleScreen.scale).toBe(1);
  expect(consoleScreen.width).toBe(consoleScreen.box);
  // The keys and the frame are one screen under the bar.
  expect(await show.evaluate((el) => el.getBoundingClientRect().height)).toBeLessThanOrEqual(844 - 56);
  await page.locator(".objects__pick").getByRole("button", { name: "Chat" }).click();
  await expect(page.locator(".objects__fit .echo-chat")).toBeAttached();
  await expect.poll(async () => (await laid()).height).toBe(consoleScreen.height);
  expect((await laid()).scale).toBe(1);
});

test("on a phone, the close's sheet fits the window, so the scroll writes it while it's held, in words big enough to read", { tag: "@mobile" }, async ({ page }) => {
  for (const [width, height] of [
    [390, 844],
    [375, 667],
    [360, 740],
    [360, 640],
  ] as const) {
    await page.setViewportSize({ width, height });
    await page.goto("/");
    await folded(page);
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator(".bp__hold[data-held]"), `${width} × ${height}`).toBeAttached();
    const room = await page.evaluate(() => window.innerHeight - document.querySelector<HTMLElement>(".echo-shell__rail")!.offsetHeight);
    expect(await page.locator(".bp__board").evaluate((el) => el.offsetHeight), `${width} × ${height}`).toBeLessThanOrEqual(room);
  }
  // Each way's line at 14px at least, at full strength (at 12px and dimmed, its thin chalk didn't read).
  const says = await page.locator(".bp__list .bp__say").evaluateAll((els) => els.map((el) => [parseFloat(getComputedStyle(el).fontSize), getComputedStyle(el).opacity]));
  expect(says.every(([size, opacity]) => (size as number) >= 14 && opacity === "1"), JSON.stringify(says)).toBe(true);
});

test("on a phone, a section's sentence is set ragged, not justified", { tag: "@mobile" }, async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const aligns = await page.locator(".big-title__lede, .hero4__lede").evaluateAll((els) => [...new Set(els.map((el) => getComputedStyle(el).textAlign))]);
  expect(aligns).toEqual(["start"]);
});

/**
 * A later rule at the same width put the foot's links back in one column, three screens of them.
 * Since the footer's redesign a phone has them as an accordion, a row a group, the panel within a screen.
 */
test("on a phone, the foot's links don't run down the page: a row a group, the panel within a screen", { tag: "@mobile" }, async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const menu = page.locator(".foot__menu");
  await expect(menu.locator(".echo-accordion__trigger")).toHaveText(["Echo", "Build with AI", "Works with", "Tools", "Project"]);
  await expect(page.locator(".foot__nav")).toBeHidden();
  expect(await page.locator(".foot__panel").evaluate((el) => el.getBoundingClientRect().height)).toBeLessThanOrEqual(844 - 56);
  // A group opens to its links.
  await menu.getByRole("button", { name: "Project" }).click();
  await expect(menu.getByRole("link", { name: "Supporters", exact: true })).toBeVisible();
});

/** The panel's top, where Echo lands in its heap, was above the window or under the bar at the end of the page. */
test("at the end of the page Echo lands in its heap, on a laptop and on a phone", { tag: "@mobile" }, async ({ page }) => {
  for (const [width, height] of [
    [1280, 720],
    [390, 844],
  ] as const) {
    await page.setViewportSize({ width, height });
    await page.goto("/");
    const canvas = await stage(page);
    // Twice: the page grows as the sections below the fold load.
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(500);
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await expect(canvas, `${width} × ${height}`).toHaveAttribute("data-in-pile", "true", { timeout: 8000 });
  }
});

/** "Made by Noor Mtir" had no colour of its own, so it was the browser's link blue on the dark panel. */
test("the foot row's links are in the panel's own colours", async ({ page }) => {
  await page.goto("/");
  const colours = await page.locator(".foot__legal").evaluate((row) => {
    const text = getComputedStyle(row.closest(".foot__panel")!).color;
    return [...row.querySelectorAll("a, summary")].map((a) => ({ name: a.textContent, colour: getComputedStyle(a).color, text, dim: getComputedStyle(row).color }));
  });
  expect(colours.length).toBeGreaterThan(2);
  for (const c of colours) expect([c.text, c.dim], c.name ?? "").toContain(c.colour);
});

/** A link in a sentence was made 44px wide under a finger, and its sentence opened a gap after it. */
test("under a finger, 'Open Console or Chat in full.' keeps its spacing", { tag: "@touch" }, async ({ page }) => {
  await page.goto("/");
  const wider = await page.locator(".objects__open a").evaluateAll((links) =>
    links.map((a) => {
      const words = document.createRange();
      words.selectNodeContents(a);
      return Math.round(a.getBoundingClientRect().width - words.getBoundingClientRect().width);
    }),
  );
  expect(wider).toEqual([0, 0]);
});

/** The mood board's eight photos were a fixed row, wider than the prompt could be on a phone. */
test("on a phone, the mood board's prompt stays inside the Make card", { tag: "@mobile" }, async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const card = page.locator("#make");
  await card.evaluate((el) => el.scrollIntoView({ block: "start" }));
  const bubble = page.locator("#make .jy-mosaic").locator("xpath=ancestor::*[contains(@class, 'echo-chat__bubble')][1]");
  await expect(bubble).toBeVisible();
  const [c, b] = await Promise.all([card.boundingBox(), bubble.boundingBox()]);
  expect(b!.x).toBeGreaterThanOrEqual(c!.x);
  expect(b!.x + b!.width).toBeLessThanOrEqual(c!.x + c!.width);
});

/**
 * Finished, as reduced motion and the first paint show them, Make's turned sheet swung its corner
 * out of its pane, Build's tick hung off its frame without saying so, and the foot's lockup was wider than
 * its column at 1280. the developers' terminal in the puzzle, its command lines' strip 7px out of
 * each run, at every width.
 */
test("finished, nothing on the homepage pokes out of its box, on a laptop or a phone", { tag: "@mobile" }, async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const [width, height] of [
    [1280, 720],
    [390, 844],
  ] as const) {
    await page.setViewportSize({ width, height });
    await page.goto("/");
    expect(formatOverflow(await findHorizontalOverflow(page)), `${width} × ${height}`).toEqual([]);
  }
});

test("every link in the foot of the page opens a page", async ({ page, request }) => {
  await page.goto("/");
  const hrefs = await page.locator(".foot a[href^='/']").evaluateAll((links) => [...new Set(links.map((a) => a.getAttribute("href")!.split("#")[0]!))]);
  expect(hrefs.length).toBeGreaterThan(10);
  const broken: string[] = [];
  for (const href of hrefs) {
    const res = await request.get(href);
    if (res.status() >= 400) broken.push(`${href} ${res.status()}`);
  }
  expect(broken).toEqual([]);
});

test("on a desktop the homepage never pans sideways, the paper flying from Make to Pick included", async ({ page }) => {
  await page.setViewportSize({ width: 1512, height: 860 });
  await page.goto("/");
  await folded(page);
  const pans = () => page.evaluate(() => [document.documentElement, document.body].map((e) => e.scrollWidth - e.clientWidth));
  // Down the page and through the road, where the paper lands on Try it on and merges into it.
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  const widest = [0, 0];
  for (let y = 0; y < height; y += 400) {
    await page.evaluate((top) => window.scrollTo(0, top), y);
    await page.waitForTimeout(120);
    (await pans()).forEach((p, i) => (widest[i] = Math.max(widest[i]!, p)));
  }
  expect(widest.every((p) => p <= 1), `the page was wider than the window by ${widest.join(" / ")}px`).toBe(true);
});

test("the homepage starts the MCP server the published way, not from a path inside Echo's repo", async ({ page }) => {
  await page.goto("/");
  // textContent, not innerText: the ways and sheets that aren't open count too.
  const text = (await page.locator("main").textContent()) ?? "";
  // For a tool without a terminal, the published way is the hosted server, not a command.
  expect(text).toContain(HOSTED_MCP_URL);
  expect(text).not.toContain("./mcp/bin");
});

/* --- the close: Echo's anatomy on a blueprint ---------------------------------------------------- */

/* --- Echo pulled into ChatGPT ---------------------------------------------------------- */

/** Scrolls so the moment's stop `at` (windows of scroll from where its stage is held) is under the bar. */
const toPull = (page: Page, at: number) =>
  page.evaluate(async (at) => {
    for (let k = 0; k < 2; k++) {
      const bar = document.querySelector<HTMLElement>(".home-shell > .echo-shell__rail")!.offsetHeight;
      const top = document.querySelector<HTMLElement>(".pull__track")!.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top: top - bar + at * (window.innerHeight - bar), behavior: "instant" });
      await new Promise((r) => setTimeout(r, 300));
    }
  }, at);

test("Echo pulled into ChatGPT: a real heading, the lines as text, and the key to the listing", async ({ page }) => {
  await page.goto("/");
  const pull = page.locator("section.pull");
  await expect(pull.getByRole("heading", { level: 2 })).toHaveAccessibleName("Echo UI is now in ChatGPT");
  await expect(page.getByRole("heading", { level: 2, name: "Echo UI is now in ChatGPT" })).toBeAttached();
  await expect(pull).toContainText("Make your style in the chat.");
  await expect(pull).toContainText("Build with it in your code.");
  // Named for where it goes: the road's and the AI panel's "Get the plugin" go to the plugin's docs.
  await expect(pull.getByRole("link", { name: "Get the plugin in ChatGPT" })).toHaveAttribute("href", CHATGPT_LISTING_URL);
  // OpenAI's mark is theirs, flat, in its own black: never turned or lit (their brand rules), and hidden from
  // assistive technology, the word beside it says it.
  await expect(pull.locator(".pull__blossom")).toHaveAttribute("aria-hidden", "true");
});

test("the moment's four stops: Echo caught in the storm, the lines, ChatGPT, the key; its words play at their stop", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await folded(page);
  const webgl = await page.evaluate(() => !!document.createElement("canvas").getContext("webgl2"));
  test.skip(!webgl, "no WebGL here, so the moment is its last stop, still");
  const pull = page.locator("section.pull");
  await expect(pull).toHaveAttribute("data-live", "");
  await expect(pull.locator(".pull__stop[data-snap]")).toHaveCount(4);
  const stage = pull.locator(".pull__stage");
  // Caught: Echo is in the storm, and nothing is written yet; the stage fills the room under the bar, to the pixel.
  await toPull(page, 0);
  await expect(stage).toHaveAttribute("data-called", "");
  await expect(stage).not.toHaveAttribute("data-lines", "");
  await expect(stage).not.toHaveAttribute("data-lockup", "");
  const fit = await stage.evaluate((el) => {
    const bar = document.querySelector<HTMLElement>(".home-shell > .echo-shell__rail")!.getBoundingClientRect().bottom;
    const r = el.getBoundingClientRect();
    return { gap: Math.abs(r.top - bar), foot: Math.abs(r.bottom - window.innerHeight) };
  });
  expect(fit.gap).toBeLessThan(1);
  expect(fit.foot).toBeLessThan(1);
  // The lines: the storm holds Echo while they write themselves on (a stop of their own).
  await toPull(page, 1);
  await expect(stage).toHaveAttribute("data-lines", "");
  await expect(stage).not.toHaveAttribute("data-lockup", "");
  // ChatGPT: the lockup's words have played.
  await toPull(page, 2);
  await expect(stage).toHaveAttribute("data-lockup", "");
  // The key: Echo has landed on it and the page's ground under the moment has gone white.
  await toPull(page, 3);
  await expect(page.locator(".home-lit")).toHaveAttribute("data-white-run", "");
  await expect(page.locator(".white-run")).toHaveAttribute("data-on", "");
  // Scroll back above the storm: the lines go again.
  await toPull(page, -0.6);
  await expect(stage).not.toHaveAttribute("data-lines", "");
});

test("the white goes on through the close, and the page is dark again by the letter's title", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await folded(page);
  const webgl = await page.evaluate(() => !!document.createElement("canvas").getContext("webgl2"));
  test.skip(!webgl, "no WebGL here, so the moment is still and the close paints its own white");
  const run = page.locator(".white-run");
  await toPull(page, 3);
  await expect(run).toHaveAttribute("data-on", "");
  await page.locator(".bp__board").evaluate((el) => window.scrollBy({ top: el.getBoundingClientRect().top - 90, behavior: "instant" }));
  await expect(run).toHaveAttribute("data-on", "");
  const title = page.getByRole("heading", { level: 2, name: "30 products before I turn 30" });
  await title.evaluate((el) => window.scrollBy({ top: el.getBoundingClientRect().top - window.innerHeight * 0.4, behavior: "instant" }));
  await expect(run).not.toHaveAttribute("data-on", "");
  // The turn is played, so the page never rests on a grey half-way: once it's over, it's all the way off.
  await expect.poll(() => run.evaluate((el) => getComputedStyle(el).opacity)).toBe("0");
});

test("under reduced motion the moment is its last stop, still: the lines, the lockup and the key on the white", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await folded(page);
  const pull = page.locator("section.pull");
  await expect(pull).not.toHaveAttribute("data-live", "");
  await expect(pull.locator(".pull__stop")).toHaveCount(0);
  await pull.scrollIntoViewIfNeeded();
  await expect(pull.locator(".pull__line--left")).toBeVisible();
  await expect(pull.locator(".pull__end")).toBeVisible();
  await expect(pull.getByRole("link", { name: "Get the plugin in ChatGPT" })).toBeVisible();
});

const WAYS_IN = [
  ["ChatGPT plugin", "make your style in the chat"],
  ["Claude plugin", "install it from the docs"],
  ["Skills", "Design Eye, Style Fit, Echo UI"],
  ["MCP server", "any tool that connects"],
  ["CLI", "npx echo-ui-cli init"],
  ["The check", "hands back what drifts"],
] as const;

test("the close: Echo's anatomy on a blueprint, the six ways in, and the CLI's key", async ({ page }) => {
  await page.addInitScript(recordCopies);
  await page.goto("/");
  const close = page.locator("section.bp");
  await expect(close.getByRole("heading", { level: 2 })).toHaveText("Wherever your agent builds.");
  // Each way in, said whole for a screen reader while its letters write themselves on.
  const text = (await close.textContent()) ?? "";
  for (const [name, say] of WAYS_IN) {
    expect(text).toContain(name);
    expect(text).toContain(say);
  }
  // The ChatGPT key is the moment's, one screen above (pulled-in/): the close carries the CLI's.
  await expect(close.getByRole("link", { name: "Add to ChatGPT" })).toHaveCount(0);
  const cmd = close.getByRole("button", { name: "Copy the command: npx echo-ui-cli init" });
  await hydrated(cmd);
  await cmd.click();
  await expect.poll(() => lastCopy(page)).toBe("npx echo-ui-cli init");
  // The title is a stop of its own, and the sheet two more, held between them (the push draws it); Echo on it
  // is a drawing, filled white (no 3D model: the only 3D is the paper, where WebGL is).
  await expect(close.locator(".bp__title-at[data-snap]")).toHaveCount(1);
  await expect(close.locator(".bp__hold > .bp__at[data-snap]")).toHaveCount(2);
  await expect(close.locator(".bp__fill")).toHaveCount(1);
  await expect(close.locator("canvas:not(.bp__paper canvas)")).toHaveCount(0);
});

test("the scroll draws the close: Echo's scribble as the paper opens, every word on the push after", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await folded(page);
  const board = page.locator(".bp__board");
  const progress = () => board.evaluate((el) => Number(el.style.getPropertyValue("--p")));
  // Far below, nothing drawn yet.
  await expect.poll(progress).toBe(0);
  // At its first stop, the paper is open and only Echo's scribble is drawn: no way in is written yet.
  const stops = page.locator(".bp__hold > .bp__at");
  const frame = (i: number) =>
    stops.nth(i).evaluate((el) => {
      const bar = document.querySelector<HTMLElement>(".home-shell > .echo-shell__rail")!.getBoundingClientRect().bottom;
      const r = el.getBoundingClientRect();
      window.scrollBy({ top: r.top - bar - (window.innerHeight - bar - r.height) / 2, behavior: "instant" });
    });
  // Framed twice: what loads on the way down can move the page under the first.
  await frame(0);
  await page.waitForTimeout(600);
  await frame(0);
  await expect.poll(progress).toBeCloseTo(0.24, 1);
  expect(await board.locator(".bp__way .bp__ch").first().evaluate((c) => Number(getComputedStyle(c).opacity))).toBe(0);
  // A push on, and it's all written, the sheet where it was.
  const at = (await board.boundingBox())!.y;
  await frame(1);
  await page.waitForTimeout(600);
  await frame(1);
  await expect.poll(progress).toBe(1);
  expect(Math.abs((await board.boundingBox())!.y - at)).toBeLessThan(2);
  const faint = await board.locator(".bp__ch").evaluateAll((cs) => cs.filter((c) => Number(getComputedStyle(c).opacity) < 0.99).length);
  expect(faint).toBe(0);
});

test("the close's title is a stop: read whole over the closed scroll, which opens on the way to the sheet and closes on the way back", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await folded(page);
  const hold = page.locator(".bp__hold");
  const open = () => hold.evaluate((el) => Number(getComputedStyle(el).getPropertyValue("--open") || 0));
  /** Scrolls so a stop of the close is framed, as the page's wheel frames it (snap.ts `frameFor`). */
  const to = (sel: string) =>
    page.locator(sel).first().evaluate(async (el) => {
      for (let k = 0; k < 2; k++) {
        const bar = document.querySelector<HTMLElement>(".home-shell > .echo-shell__rail")!.offsetHeight;
        const r = el.getBoundingClientRect();
        const room = window.innerHeight - bar;
        window.scrollBy({ top: r.top - bar - (r.height <= room ? (room - r.height) / 2 : 12), behavior: "instant" });
        await new Promise((res) => setTimeout(res, 300));
      }
    });
  // The title's stop: the title and its line whole under the bar, the scroll under them still closed.
  await to(".bp__title-at");
  const title = await page.locator("#bp-h").evaluate((h) => {
    const bar = document.querySelector<HTMLElement>(".home-shell > .echo-shell__rail")!.getBoundingClientRect().bottom;
    const lede = h.closest(".big-title")!.getBoundingClientRect();
    return { top: h.getBoundingClientRect().top - bar, foot: window.innerHeight - lede.bottom };
  });
  expect(title.top).toBeGreaterThan(0);
  expect(title.foot).toBeGreaterThan(0);
  await expect.poll(open).toBe(0);
  // One push on, the sheet: the paper has opened on the way.
  await to(".bp__hold > .bp__at");
  await expect.poll(open).toBe(1);
  // And back to the title: it has closed again, the same way.
  await to(".bp__title-at");
  await expect.poll(open).toBe(0);
});

test("landing on the close, the paper shows its blue face without another scroll", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await folded(page);
  const webgl = await page.evaluate(() => !!document.createElement("canvas").getContext("webgl2"));
  test.skip(!webgl, "no WebGL here, so there's no paper: the sheet is the page's own blue");
  const board = page.locator(".bp__board");
  // Straight there, then still: the paper arrives already open, and nothing scrolls after it.
  await board.evaluate((el) => window.scrollBy({ top: el.getBoundingClientRect().top - 90, behavior: "instant" }));
  await expect(page.locator("section.bp[data-paper] .bp__paper canvas")).toBeAttached({ timeout: 20_000 });
  await expect(board).toHaveAttribute("data-open", "");
  // A bare patch of the sheet above Echo: blueprint blue, not the black of a face that came in after the last frame.
  const patch = async () => {
    const box = (await board.boundingBox())!;
    const png = await page.screenshot({ clip: { x: box.x + box.width * 0.45, y: box.y + box.height * 0.1, width: box.width * 0.1, height: box.height * 0.08 } });
    return page.evaluate(async (b64) => {
      const bitmap = await createImageBitmap(await (await fetch(`data:image/png;base64,${b64}`)).blob());
      const ctx = new OffscreenCanvas(bitmap.width, bitmap.height).getContext("2d")!;
      ctx.drawImage(bitmap, 0, 0);
      const d = ctx.getImageData(0, 0, bitmap.width, bitmap.height).data;
      const sum = [0, 0, 0];
      for (let i = 0; i < d.length; i += 4) for (let c = 0; c < 3; c++) sum[c]! += d[i + c]!;
      const [r, g, b] = sum.map((v) => v / (d.length / 4)) as [number, number, number];
      return b > 110 && b > r + 40 && b > g;
    }, png.toString("base64"));
  };
  await expect.poll(patch, { timeout: 8_000 }).toBe(true);
});

test("scrolling on past the close, the sheet stays drawn", async ({ page }) => {
  // On a busy runner the homepage draws a few frames a second, and the push (two frames a step) takes
  // most of the default 30s by itself.
  test.setTimeout(60_000);
  /*
   * Now and then on CI's runner, never here, the page went on past the sheet in the second after the push,
   * so a miss says what moved it: every scroll the page made itself (the test's own are marked and left
   * out), and each frame's scroll position, the sheet's foot and the hold's height.
   */
  await page.addInitScript(() => {
    const w = window as unknown as { __trail: string[]; __mine: boolean; __watch: boolean };
    w.__trail = [];
    w.__mine = false;
    w.__watch = false;
    const t0 = performance.now();
    const at = () => `${Math.round(performance.now() - t0)}ms`;
    const wrap = (proto: object, name: string) => {
      const own = proto as Record<string, (...a: unknown[]) => unknown>;
      const real = own[name]!;
      own[name] = function (this: unknown, ...args: unknown[]) {
        const who = this === window ? "window" : `${(this as Element).tagName.toLowerCase()}.${String((this as Element).className).split(" ")[0]}`;
        if (!w.__mine) w.__trail.push(`${at()} ${who}.${name}(${JSON.stringify(args).slice(0, 80)}) from ${(new Error().stack ?? "").split("\n").slice(2, 5).map((l) => l.trim()).join(" < ")}`);
        return real.apply(this, args);
      };
    };
    wrap(Window.prototype, "scrollTo");
    wrap(Window.prototype, "scrollBy");
    wrap(Element.prototype, "scrollIntoView");
    wrap(Element.prototype, "scrollTo");
    const frame = () => {
      if (w.__watch && w.__trail.length < 400) {
        const b = document.querySelector(".bp__board")?.getBoundingClientRect();
        const hold = document.querySelector<HTMLElement>(".bp__hold");
        w.__trail.push(`${at()} y ${Math.round(scrollY)} foot ${b ? Math.round(b.bottom) : "-"} hold ${hold?.offsetHeight ?? "-"} held ${hold?.hasAttribute("data-held") ? 1 : 0} ${document.documentElement.className.match(/lenis[\w-]*/g)?.join(",") ?? ""}`);
      }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await folded(page);
  const board = page.locator(".bp__board");
  // To the sheet, a moment there, then on through it until its lower half is all that's left in the window.
  await board.evaluate((el) => {
    (window as unknown as { __mine: boolean }).__mine = true;
    window.scrollBy({ top: el.getBoundingClientRect().top - 90, behavior: "instant" });
    (window as unknown as { __mine: boolean }).__mine = false;
  });
  await page.waitForTimeout(5_000);
  await board.evaluate(async (el) => {
    const w = window as unknown as { __mine: boolean; __watch: boolean };
    w.__watch = true;
    for (let i = 0; i < 400 && el.getBoundingClientRect().bottom > window.innerHeight * 0.55; i++) {
      w.__mine = true;
      window.scrollBy({ top: 40, behavior: "instant" });
      w.__mine = false;
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    }
  });
  await page.waitForTimeout(1_000);
  // Still on screen, so still drawn: the last of its words is there.
  const trail = () => page.evaluate(() => (window as unknown as { __trail: string[] }).__trail.slice(-120).join("\n"));
  if (!(await board.evaluate((el) => el.getBoundingClientRect().bottom > 0))) {
    expect(false, `the sheet went off the screen after the push; what the page did:\n${await trail()}`).toBe(true);
  }
  expect(await board.evaluate((el) => getComputedStyle(el).getPropertyValue("--p").trim())).toBe("1.0000");
});

/**
 * Under a heavy load a browser can hold an IntersectionObserver's notices back for seconds: on a busy CI
 * runner the sheet sat on its stop closed and undrawn, the push went by, and it never drew. Its drawing
 * starts from the scroll itself, so it doesn't wait on a notice that may not come.
 */
test("the sheet draws as it's pushed even when the browser holds back its intersection notices", async ({ page }) => {
  // As above: the push alone can take most of 30s on a busy runner.
  test.setTimeout(60_000);
  await silenceObservers(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await folded(page);
  const board = page.locator(".bp__board");
  await board.evaluate((el) => window.scrollBy({ top: el.getBoundingClientRect().top - 90, behavior: "instant" }));
  await board.evaluate(async (el) => {
    for (let i = 0; i < 400 && el.getBoundingClientRect().bottom > window.innerHeight * 0.55; i++) {
      window.scrollBy({ top: 40, behavior: "instant" });
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    }
  });
  await expect.poll(() => board.evaluate((el) => getComputedStyle(el).getPropertyValue("--p").trim()), { timeout: 15_000 }).toBe("1.0000");
});

test("on a phone, every way in on the close is written on the paper, none off its edge", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await folded(page);
  const webgl = await page.evaluate(() => !!document.createElement("canvas").getContext("webgl2"));
  test.skip(!webgl, "no WebGL here, so there's no paper: the sheet is the page's own blue");
  const board = page.locator(".bp__board");
  await board.evaluate((el) => window.scrollBy({ top: el.getBoundingClientRect().top - 70, behavior: "instant" }));
  await expect(page.locator("section.bp[data-paper] .bp__paper canvas")).toBeAttached({ timeout: 20_000 });
  // On through it until the list is written (the scroll draws the sheet), then still.
  await board.evaluate(async (el) => {
    for (let i = 0; i < 400 && el.style.getPropertyValue("--p") !== "1.0000"; i++) {
      window.scrollBy({ top: 20, behavior: "instant" });
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    }
  });
  await page.waitForTimeout(800);
  // Just left of each way's name, halfway down it (clear of its letters and of the sketch over it): the paper's
  // blue, not the page round the paper.
  const spots = await page.locator(".bp__list li .bp__name").evaluateAll((ns) =>
    ns.map((n) => {
      const r = n.getBoundingClientRect();
      return { x: Math.round(r.left - 3), y: Math.round(r.top + r.height / 2) };
    }),
  );
  const png = await page.screenshot();
  const off = await page.evaluate(
    async ({ b64, spots }) => {
      const bitmap = await createImageBitmap(await (await fetch(`data:image/png;base64,${b64}`)).blob());
      const ctx = new OffscreenCanvas(bitmap.width, bitmap.height).getContext("2d")!;
      ctx.drawImage(bitmap, 0, 0);
      const k = bitmap.width / window.innerWidth;
      return spots.filter(({ x, y }) => {
        const [r, g, b] = ctx.getImageData(Math.round(x * k), Math.round(y * k), 1, 1).data;
        return !(b! > 110 && b! > r! + 40 && b! > g!);
      });
    },
    { b64: png.toString("base64"), spots },
  );
  expect(off).toEqual([]);
});

test("on a tablet, every label on the close lies on the paper's flat face, none over its rolls", async ({ page }) => {
  await page.setViewportSize({ width: 820, height: 1180 });
  await page.goto("/");
  await folded(page);
  const webgl = await page.evaluate(() => !!document.createElement("canvas").getContext("webgl2"));
  test.skip(!webgl, "no WebGL here, so there's no paper: the sheet is the page's own blue");
  await page.locator(".bp__board").evaluate((el) => window.scrollBy({ top: el.getBoundingClientRect().top - 200, behavior: "instant" }));
  await expect(page.locator("section.bp[data-paper] .bp__paper canvas")).toBeAttached({ timeout: 20_000 });
  // The face is the paper's flat middle, between its rolls, centred on the section (--bp-face, Blueprint.tsx).
  const past = await page.locator("section.bp").evaluate((bp) => {
    const face = parseFloat(bp.style.getPropertyValue("--bp-face"));
    const s = bp.getBoundingClientRect();
    const left = s.left + (s.width - face) / 2;
    return [...bp.querySelectorAll<HTMLElement>(".bp__label")].flatMap((el) => {
      const r = el.getBoundingClientRect();
      const out = Math.round(Math.max(left - r.left, r.right - (left + face)));
      return out > 0 ? [`${el.textContent!.trim().slice(0, 24)}: ${out}px past the face`] : [];
    });
  });
  expect(past).toEqual([]);
});

/** To the close's drawn sheet (its second stop), framed where the scroll leaves it, and still. */
const toDrawnClose = async (page: Page) => {
  // Framed until it stays framed: what loads on the way down can move the page under a frame, and a sheet
  // measured a little past its stop has scrolled on up the window with the page. Framed for the bar's height,
  // as the sheet is (snap.ts `barHeight`): straight down from the top, the bar has slid away.
  await expect
    .poll(
      () =>
        page.locator(".bp__hold > .bp__at").nth(1).evaluate(async (el) => {
          const bar = document.querySelector<HTMLElement>(".home-shell > .echo-shell__rail")!.offsetHeight;
          const off = () => {
            const r = el.getBoundingClientRect();
            return r.top - bar - (window.innerHeight - bar - r.height) / 2;
          };
          window.scrollBy({ top: off(), behavior: "instant" });
          await new Promise((r) => setTimeout(r, 400));
          return Math.abs(off()) < 1;
        }),
      { timeout: 15_000 },
    )
    .toBe(true);
  // Drawn whole at its stop, in WebKit too, whose scroll lands a fraction of a pixel short.
  await expect.poll(() => page.locator(".bp__board").evaluate((el) => el.style.getPropertyValue("--p"))).toBe("1.0000");
};

/**
 * The drawing on the close sat low on its sheet. Echo was 52px under the sheet's middle, with 191px of
 * bare blue over the six ways in and 65px under the note below Echo (at 1512 × 901), and the arrows on the
 * right stopped 8px from their words where the left's stopped 18px from theirs.
 */
test("the close's drawing is centred on its sheet, its ways in mirrored about Echo", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await folded(page);
  await page.evaluate(() => document.fonts.ready);
  await toDrawnClose(page);
  const m = await page.locator(".bp__board").evaluate((board) => {
    const b = board.getBoundingClientRect();
    const echo = board.querySelector(".bp__fill")!.getBoundingClientRect();
    const axis = echo.left + echo.width / 2;
    // What's drawn: the ink, and each written line's own letters (not the block they're in).
    const boxes = [...board.querySelectorAll(".bp__view .bp__ways-ink, .bp__view .bp__notes-ink, .bp__view .bp__scribble")].map((g) => g.getBoundingClientRect());
    for (const line of board.querySelectorAll(".bp__label p > [aria-hidden]")) {
      const range = document.createRange();
      range.selectNodeContents(line);
      boxes.push(range.getBoundingClientRect());
    }
    // Each way: where its arrow lands (its head's tip, the middle of the head's path) and where its words start,
    // both as distances from Echo's axis, and the height of its words.
    const k = b.width / 1200;
    const labels = [...board.querySelectorAll(".bp__way")].map((el) => el.getBoundingClientRect());
    const ways = [...board.querySelectorAll(".bp__view .bp__ways-ink")].map((g, i) => {
      const [, x, y] = g.querySelectorAll("path")[1]!.getAttribute("d")!.match(/L([\d.]+) ([\d.]+)/)!;
      const label = labels[i]!;
      return { tip: Math.abs(b.left + Number(x) * k - axis), tipY: b.top + Number(y) * k, words: Math.min(Math.abs(label.left - axis), Math.abs(label.right - axis)), wordsY: label.top };
    });
    return {
      echo: { dx: axis - (b.left + b.width / 2), dy: echo.top + echo.height / 2 - (b.top + b.height / 2) },
      above: Math.min(...boxes.map((r) => r.top)) - b.top,
      below: b.bottom - Math.max(...boxes.map((r) => r.bottom)),
      ways,
    };
  });
  // Echo in the sheet's middle, and as much bare sheet over the drawing as under it.
  expect(Math.abs(m.echo.dx), JSON.stringify(m.echo)).toBeLessThanOrEqual(1.5);
  expect(Math.abs(m.echo.dy), JSON.stringify(m.echo)).toBeLessThanOrEqual(1.5);
  expect(Math.abs(m.above - m.below), `${Math.round(m.above)}px over, ${Math.round(m.below)}px under`).toBeLessThanOrEqual(6);
  // Each way on Echo's left is the mirror of the one across from it: ChatGPT and MCP, Claude and the CLI, the skills and the check.
  for (const i of [0, 1, 2]) {
    const [left, right] = [m.ways[i]!, m.ways[i + 3]!];
    expect(Math.abs(left.tip - right.tip), `way ${i}'s arrow`).toBeLessThanOrEqual(1.5);
    expect(Math.abs(left.tipY - right.tipY), `way ${i}'s arrow`).toBeLessThanOrEqual(1.5);
    expect(Math.abs(left.words - right.words), `way ${i}'s words`).toBeLessThanOrEqual(1.5);
    expect(Math.abs(left.wordsY - right.wordsY), `way ${i}'s words`).toBeLessThanOrEqual(1.5);
  }
});

/**
 * The close's sheet was sized to the room under the bar, but its paper reaches 28px past the drawing
 * above and below, so on a laptop the paper ran under the bar and off the window's foot, and Echo, perched on
 * its top edge, stood under the bar with only its feet showing.
 */
test("on a laptop, the close's paper and Echo perched on it are whole under the bar", async ({ page }) => {
  for (const [width, height] of [
    [1512, 901],
    [1440, 900],
    [1280, 720],
  ] as const) {
    await page.setViewportSize({ width, height });
    await page.goto("/");
    await folded(page);
    await toDrawnClose(page);
    const fit = await page.locator(".bp__frame").evaluate((frame) => {
      // The room the sheet is laid out for: under the bar, shown or slid away.
      const bar = document.querySelector<HTMLElement>(".home-shell > .echo-shell__rail")!.offsetHeight;
      const board = frame.querySelector(".bp__board")!.getBoundingClientRect();
      const perch = frame.querySelector(".bp__stop")!.getBoundingClientRect();
      // The paper lies 28px past the drawing above and below it (EXTRA, Blueprint.tsx).
      return { over: Math.round(bar - Math.min(board.top - 28, perch.top)), under: Math.round(board.bottom + 28 - window.innerHeight) };
    });
    expect(fit.over, `${width} × ${height}: px under the bar`).toBeLessThanOrEqual(0);
    expect(fit.under, `${width} × ${height}: px off the window's foot`).toBeLessThanOrEqual(0);
  }
});

test("when the window is resized, the open paper stays open under the drawing", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await folded(page);
  const webgl = await page.evaluate(() => !!document.createElement("canvas").getContext("webgl2"));
  test.skip(!webgl, "no WebGL here, so there's no paper: the sheet is a flat blue");
  const board = page.locator(".bp__board");
  // To the drawn sheet (its second stop), open and still.
  const frame = () =>
    page.locator(".bp__hold > .bp__at").nth(1).evaluate((el) => {
      const bar = document.querySelector<HTMLElement>(".home-shell > .echo-shell__rail")!.getBoundingClientRect().bottom;
      const r = el.getBoundingClientRect();
      window.scrollBy({ top: r.top - bar - (window.innerHeight - bar - r.height) / 2, behavior: "instant" });
    });
  await frame();
  await page.waitForTimeout(600);
  await frame();
  await expect(page.locator("section.bp[data-paper] .bp__paper canvas")).toBeAttached({ timeout: 20_000 });
  await expect.poll(() => board.evaluate((el) => el.style.getPropertyValue("--p"))).toBe("1.0000");
  // A bare patch of the sheet far left of Echo: only an open paper is there.
  const blue = async () => {
    const box = (await board.boundingBox())!;
    const png = await page.screenshot({ clip: { x: box.x + box.width * 0.06, y: box.y + box.height * 0.12, width: box.width * 0.06, height: box.height * 0.06 } });
    return page.evaluate(async (b64) => {
      const bitmap = await createImageBitmap(await (await fetch(`data:image/png;base64,${b64}`)).blob());
      const ctx = new OffscreenCanvas(bitmap.width, bitmap.height).getContext("2d")!;
      ctx.drawImage(bitmap, 0, 0);
      const d = ctx.getImageData(0, 0, bitmap.width, bitmap.height).data;
      const sum = [0, 0, 0];
      for (let i = 0; i < d.length; i += 4) for (let c = 0; c < 3; c++) sum[c]! += d[i + c]!;
      const [r, g, b] = sum.map((v) => v / (d.length / 4)) as [number, number, number];
      return b > 110 && b > r + 40 && b > g;
    }, png.toString("base64"));
  };
  await expect.poll(blue, { timeout: 8_000 }).toBe(true);
  // The window narrows: the sheet's faces are painted again at the new size, and the paper drawn again with them.
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.waitForTimeout(1_200);
  await frame();
  await page.waitForTimeout(400);
  await expect.poll(blue, { timeout: 8_000 }).toBe(true);
});

test("under reduced motion the close is the finished sheet at once", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await folded(page);
  const board = page.locator(".bp__board");
  expect(await board.evaluate((el) => getComputedStyle(el).getPropertyValue("--p").trim())).toBe("1");
  expect(await board.locator(".bp__ch").first().evaluate((c) => getComputedStyle(c).opacity)).toBe("1");
});

/* --- the letter and the ask ------------------------------------------------------------------ */

test("the letter is Noor's, and its P.S. leads into supporting Echo, or sponsoring it", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 2, name: "30 products before I turn 30" })).toBeVisible();
  const letter = page.locator("article.letter");
  await expect(letter).toContainText("Hi, I’m Noor.");
  const ps = letter.locator(".letter__ps");
  await expect(ps).toContainText("P.S.");
  await expect(ps.getByRole("link", { name: "noor@nawwara.studio" })).toHaveAttribute("href", "mailto:noor@nawwara.studio");
  await expect(page.getByRole("heading", { level: 3, name: "Support Echo" })).toBeVisible();
  await expect(page.getByRole("group", { name: "Support Echo" })).toBeAttached();
});

test("the crowd invents nobody: before anyone has joined, it's a drawing and a line saying how to join", async ({ page }) => {
  await page.goto("/");
  const crowd = page.locator(".crowd");
  await expect(crowd.locator(".crowd__pile")).toHaveAttribute("aria-hidden", "true");
  await expect(crowd.getByRole("list", { name: "Supporters" })).toHaveCount(0);
  await expect(crowd).toContainText("Everyone who supports Echo gets an Echo on Echo’s island");
  await expect(crowd.getByRole("link", { name: "Visit the island" })).toHaveAttribute("href", "/supporters");
});

/* --- Echo, in 3D --------------------------------------------------------------------------------- */

test("Echo steps out of the device's screen and travels the page with the scroll", async ({ page }) => {
  await page.goto("/");
  const canvas = await stage(page);
  await expect(canvas).toHaveAttribute("data-perch", "0");
  await expect(device(page)).not.toHaveAttribute("data-away", "");

  // Scroll, and it leaves home: on the way, or already on the next perch. The screen says so.
  await page.locator("#who-h").scrollIntoViewIfNeeded();
  await page.mouse.wheel(0, 300);
  await expect.poll(() => canvas.getAttribute("data-perch")).not.toBe("0");
  await expect(device(page)).toHaveAttribute("data-away", "");

  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(canvas).toHaveAttribute("data-perch", "0", { timeout: 4000 });
  await expect(device(page)).not.toHaveAttribute("data-away", "", { timeout: 4000 });
});

/**
 * Known to fail now and then: in a full run, Echo sometimes doesn't settle back home when the page
 * returns to the top (`data-perch` stayed 1), in Chromium and in WebKit; alone it passes every time. This goes away and back ten times
 * on one page and, on a miss, fails with the timeline of scroll, perch and the device's `data-away`:
 * the evidence a fix needs.
 */
test.fixme("Echo comes home every time the page returns to the top", async ({ page }) => {
  await page.goto("/");
  const canvas = await stage(page);
  const timeline: string[] = [];
  const note = async (what: string) =>
    timeline.push(`${what}: scrollY ${await page.evaluate(() => Math.round(window.scrollY))}, perch ${await canvas.getAttribute("data-perch")}, away ${await device(page).getAttribute("data-away")}`);
  for (let round = 0; round < 10; round++) {
    await page.locator("#who-h").scrollIntoViewIfNeeded();
    await page.mouse.wheel(0, 300);
    await expect.poll(() => canvas.getAttribute("data-perch")).not.toBe("0");
    await note(`round ${round}, away`);
    await page.evaluate(() => window.scrollTo(0, 0));
    const home = await expect(canvas).toHaveAttribute("data-perch", "0", { timeout: 4000 }).then(() => true, () => false);
    await note(`round ${round}, back`);
    expect(home, timeline.join("\n")).toBe(true);
  }
});

/**
 * At the top of the page Echo is at home, drawn on the device's screen, and
 * the 3D stage has nothing to show. It cleared and redrew its empty canvas
 * every frame anyway, and a canvas that changes every frame makes the browser
 * commit the whole page's layers to the compositor every frame: a quarter of
 * the main thread, spent showing nothing, for as long as the page sat there.
 *
 * Only the stage's own canvas is counted: the hero's field of light raises its
 * arch once as the page opens, and in WebKit the stage is ready before the arch
 * is in place.
 */
test("with nothing on the stage, the 3D stage leaves its canvas alone", async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as unknown as { __paints: number };
    w.__paints = 0;
    for (const proto of [WebGL2RenderingContext.prototype, WebGLRenderingContext.prototype]) {
      for (const name of ["clear", "drawElements", "drawArrays", "drawElementsInstanced", "drawArraysInstanced"] as const) {
        const real = (proto as unknown as Record<string, (...a: unknown[]) => unknown>)[name];
        if (!real) continue;
        (proto as unknown as Record<string, unknown>)[name] = function (this: WebGLRenderingContext, ...a: unknown[]) {
          if (this.canvas instanceof HTMLCanvasElement && this.canvas.classList.contains("echo3d")) w.__paints += 1;
          return real.apply(this, a);
        };
      }
    }
  });
  await page.goto("/");
  await stage(page);
  await expect(page.locator("canvas.echo3d")).toHaveAttribute("data-perch", "0");
  await page.waitForTimeout(500);
  const paints = () => page.evaluate(() => (window as unknown as { __paints: number }).__paints);
  const before = await paints();
  await page.waitForTimeout(1000);
  expect(await paints()).toBe(before);

  // And it draws again the moment there's something to show.
  await page.locator("#who-h").scrollIntoViewIfNeeded();
  await page.mouse.wheel(0, 300);
  await expect.poll(paints).toBeGreaterThan(before);
});

test("Echo is decorative: hidden from assistive technology, never in a pointer's way", async ({ page }) => {
  await page.goto("/");
  const canvas = await stage(page);
  await expect(canvas).toHaveAttribute("aria-hidden", "true");
  expect(await canvas.evaluate((el) => getComputedStyle(el).pointerEvents)).toBe("none");
  // Wherever it's drawn, a press there reaches the page under it.
  const g = await drawn(page);
  expect(await page.evaluate(([x, y]) => document.elementFromPoint(x!, y!)?.classList.contains("echo3d"), [g.x, g.y])).toBe(false);
});

test("the keychain: Echo's home hangs in the corner once the hero has gone, and calls Echo home", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await stage(page);
  const call = page.getByRole("button", { name: "Call Echo home" });
  // Not while the device itself is on screen.
  await expect(call).toBeHidden();
  await page.locator("#wins-h").scrollIntoViewIfNeeded();
  await page.mouse.wheel(0, 200);
  await expect(call).toBeVisible();
  // It swings, so it's pressed from the keyboard, as the one steady way to reach it.
  await hydrated(call);
  await call.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Send Echo out" })).toBeVisible();
  await expect(page.locator(".keychain")).toHaveAttribute("data-docked", "", { timeout: 6000 });

  // At the foot of the page it goes, and Echo joins its crowd.
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(500);
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect(page.locator(".keychain")).toHaveAttribute("data-away", "");
  await expect(page.locator(".keychain__button")).toBeHidden();
});

test("at the foot of the page Echo drops into a heap with its crowd, and the drawing of them makes way", async ({ page }) => {
  await page.goto("/");
  const canvas = await stage(page);
  // Twice: the page grows as the sections below the fold load.
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(500);
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect(canvas).toHaveAttribute("data-in-pile", "true", { timeout: 6000 });
  await expect(canvas).not.toHaveAttribute("data-pile", "waiting");
  expect(await page.locator(".foot__flat").evaluate((el) => getComputedStyle(el).visibility)).toBe("hidden");
});

test("without WebGL, the drawing makes the journey instead", async ({ page }) => {
  await page.addInitScript(withoutWebGL);
  await page.goto("/");
  await expect(page.locator(".guide")).toBeAttached();
  await expect(page.locator("canvas.echo3d")).toHaveCount(0);
  await expect(device(page)).not.toHaveAttribute("data-away", "");

  await page.locator("#who-h").scrollIntoViewIfNeeded();
  await page.mouse.wheel(0, 300);
  await expect(device(page)).toHaveAttribute("data-away", "");
  await expect.poll(async () => (await guide(page)).visible).toBe(true);

  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(device(page)).not.toHaveAttribute("data-away", "", { timeout: 4000 });
  await expect.poll(async () => (await guide(page)).visible).toBe(false);
  // No 3D Echo to fly home, so no keychain; and the heap is the flat one.
  await expect(page.getByRole("button", { name: "Call Echo home" })).toBeHidden();
  expect(await page.locator(".foot__flat").evaluate((el) => getComputedStyle(el).visibility)).toBe("visible");
});

/* --- scrolling and motion -------------------------------------------------------------------------- */

test("the homepage scrolls smoothly, and a key or a script scrolling mid-glide wins", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveClass(/\blenis\b/);
  await page.mouse.move(700, 400);
  const top = () => page.evaluate(() => window.scrollY);

  // A flick of the wheel starts a glide, and Home, pressed while it's still going, takes the page
  // to the top and keeps it there: the glide doesn't pull it back.
  //
  // Where it ends is the claim, not how soon: on a busy main thread (the 3D stage starting up
  // while the suite loads other pages) the key's scroll can land after a second, so wait for the
  // top, then check it stays there.
  await page.mouse.wheel(0, 1500);
  await expect.poll(top).toBeGreaterThan(0);
  await page.keyboard.press("Home");
  await expect.poll(top, { timeout: 5000 }).toBe(0);
  await page.waitForTimeout(600);
  expect(await top()).toBe(0);

  // The same for a script.
  await page.mouse.wheel(0, 1500);
  await expect.poll(top).toBeGreaterThan(0);
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect.poll(top, { timeout: 5000 }).toBe(0);
  await page.waitForTimeout(600);
  expect(await top()).toBe(0);

  // Keys scroll it as ever.
  await page.keyboard.press("End");
  await expect.poll(top).toBeGreaterThan(1000);
});

/**
 * Known to fail now and then: Home pressed while a wheel's glide is under way,
 * on a busy page, can leave the page where the glide stopped instead of at the
 * top (from 86px to 814px short, still there 5s later). The glide does stop at the key (use-smooth-scroll.ts), so what's
 * missing is the key's own scroll. Not reproduced on demand: alone, six
 * pages at once, the frame before the key blocked, the CPU throttled. This
 * runs the glide and the key many times on one page and fails with a
 * timeline of wheel, key and scroll events: what the fix needs.
 */
test.fixme("Home pressed mid-glide on a busy page reaches the top every time", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveClass(/\blenis\b/);
  await page.mouse.move(700, 400);
  await page.evaluate(() => {
    const w = window as unknown as { __timeline: string[] };
    w.__timeline = [];
    const t0 = performance.now();
    const note = (what: string) => w.__timeline.push(`${Math.round(performance.now() - t0)}ms ${what} at ${Math.round(window.scrollY)}`);
    window.addEventListener("wheel", () => note("wheel"), { capture: true, passive: true });
    window.addEventListener("keydown", (e) => note(`keydown ${e.key}`), { capture: true });
    window.addEventListener("scroll", () => note("scroll"), { passive: true });
  });
  const top = () => page.evaluate(() => window.scrollY);
  for (let i = 0; i < 10; i++) {
    await page.mouse.wheel(0, 1500);
    await expect.poll(top).toBeGreaterThan(0);
    await page.keyboard.press("Home");
    const reached = await expect.poll(top, { timeout: 5000 }).toBe(0).then(
      () => true,
      () => false,
    );
    if (!reached) {
      const timeline = await page.evaluate(() => (window as unknown as { __timeline: string[] }).__timeline.slice(-40));
      expect(await top(), timeline.join("\n")).toBe(0);
    }
  }
});

test("under reduced motion nothing waits to be revealed, nothing sweeps or swings, and Echo only ever sits", async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto("/");
  await expect(page.locator('[data-reveal="out"]')).toHaveCount(0);
  // Nothing moves by itself, so there is nothing to pause.
  await expect(page.getByRole("button", { name: /the line$/ })).toHaveCount(0);
  expect(await page.locator(".spin__lift").evaluate((el) => getComputedStyle(el).animationName)).toBe("none");
  expect(await page.locator(".keychain__button").evaluate((el) => getComputedStyle(el).animationName)).toBe("none");
  // No smoothing on the scroll.
  await expect(page.locator("html")).not.toHaveClass(/\blenis\b/);

  // Echo never travels: wherever the page is, it's on a perch.
  const canvas = await stage(page);
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < height; y += Math.round(height / 9)) {
    await page.evaluate((y) => window.scrollTo(0, y), y);
    await page.waitForTimeout(120);
    expect(await canvas.getAttribute("data-perch"), `at ${y}px`).toMatch(/^\d+$/);
  }
  await context.close();
});

/**
 * No-JS. The hero has to say what Echo is and show the device before
 * hydration, which is also what a crawler and a slow connection see; and
 * everything that opens on a press is simply there.
 */
test("the page renders with JavaScript disabled, Echo at home and nothing hidden", async ({ baseURL }) => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  const page = await context.newPage();
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Echo: The design system your AI agent builds with");
  await expect(page.locator(".hero4").getByRole("button", { name: "Pause", exact: true })).toBeVisible();
  await expect(page.locator(".hero4 .brand-device__home")).toBeVisible();
  await expect(page.locator("canvas.echo3d")).not.toHaveAttribute("data-echo", "ready");
  await expect(page.locator('[data-reveal="out"]')).toHaveCount(0);
  // Every sheet of the puzzle, one under the other; every card on the road shows its end.
  for (const id of ["#for-developers", "#for-designers", "#for-ai"]) await expect(page.locator(id)).toBeVisible();
  await expect(page.locator("#build")).toContainText("Built Pocket with real Echo UI components in Ink Instrument.");
  await expect(page.locator("#check")).toContainText("No problems: nothing here goes against Echo's rules.");
  // The ChatGPT moment is its last stop, still: the heading, the lines and the key.
  await expect(page.getByRole("heading", { level: 2, name: "Echo UI is now in ChatGPT" })).toBeVisible();
  await expect(page.locator("section.pull").getByRole("link", { name: "Get the plugin in ChatGPT" })).toBeVisible();
  // The close is the finished sheet: every way in written, nothing waiting to be drawn.
  await expect(page.getByRole("heading", { level: 2, name: "Wherever your agent builds." })).toBeVisible();
  await expect(page.locator(".bp__name").first()).toBeVisible();
  expect(await page.locator(".bp__ch").first().evaluate((c) => getComputedStyle(c).opacity)).toBe("1");
  await expect(page.getByRole("heading", { name: "Dials, tiles and flip boards" })).toBeAttached();
  // The heap at the foot is drawn flat.
  await expect(page.locator(".foot__flat .echo-creature").first()).toBeVisible();

  await context.close();
  await browser.close();
});

/**
 * A paragraph holds text and inline things only. The chats' "Used Echo UI" line
 * was a <p> with the brand's flower in it, and the flower is a <div>: in
 * development React reported it as a hydration error, and a browser parsing the
 * server's HTML would have closed the paragraph early.
 */
test("nothing block-level sits inside a paragraph on the homepage", async ({ page }) => {
  await page.goto("/");
  // Down the whole page, so every demo that loads as it comes near has mounted.
  await page.evaluate(async () => {
    for (let y = 0; y < document.documentElement.scrollHeight; y += 500) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 40));
    }
  });
  await page.waitForTimeout(1000);
  const nested = await page.evaluate(() =>
    [...document.querySelectorAll("p :is(div, p, ul, ol, figure, section, article, header, footer, blockquote, table)")].map(
      (el) => `${el.closest("p")!.className || "p"} > ${el.tagName.toLowerCase()}.${String(el.className).split(" ")[0]}`,
    ),
  );
  expect(nested).toEqual([]);
});

/*
 * A screen shown whole (FitScreen) was scaled down to its box but
 * never laid out wider than the width it was designed at, so in a box wider
 * than that it stopped short and left an empty strip down the box's right
 * side: Pocket in the road's Build card on a laptop, the templates in the
 * Objects frame on a wide window. (Pocket has since left the page; the
 * Objects frame at 1920 still lays a screen out wider than its own width.)
 */
test("every screen shown whole fills its box", async ({ page }) => {
  for (const [width, height] of [
    [1512, 860],
    [1920, 1080],
  ] as const) {
    await page.setViewportSize({ width, height });
    await page.goto("/");
    // Down the whole page, so every screen that loads as it comes near has mounted.
    await page.evaluate(async () => {
      for (let y = 0; y < document.documentElement.scrollHeight; y += 500) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 40));
      }
    });
    await page.waitForTimeout(1000);
    const short = await page.evaluate(() =>
      [...document.querySelectorAll(".fit")]
        .map((f) => ({ box: f.getBoundingClientRect().width, screen: f.querySelector(".fit__screen")!.getBoundingClientRect().width, name: f.className }))
        .filter((f) => f.screen < f.box - 1)
        .map((f) => `${f.name}: ${Math.round(f.screen)} of ${Math.round(f.box)}px`),
    );
    expect(short, `at ${width}×${height}`).toEqual([]);
  }
});
