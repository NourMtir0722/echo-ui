import { appRoutes } from "./helpers/app-routes";
import { gotoDev, visitDev } from "./helpers/dev-server";
import { countIdDivergence } from "./helpers/hydration";
import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * Console cleanliness: SSR discipline, and no noise.
 *
 * A wrong prop name on a Base UI wrapper is invisible to TypeScript (the
 * wrapper's own prop type can declare it), to axe, and to behavior tests
 * (Base UI's default often matches what the demo intended). It surfaces only
 * as a React console error — `openMultiple` leaked onto Accordion's <div>
 * that way and shipped for two waves.
 *
 * These run against the DEV server, not the prod one every other spec uses:
 * React's unknown-prop and hydration warnings are development-only, and a
 * production build silently strips the bad prop with no attribute and no
 * warning. Driving `next start` here would pass with the bug present.
 */
/** Every static route in the app, read from the filesystem (helpers/app-routes.ts). */
const APP_DIR = fileURLToPath(new URL("../apps/www/app", import.meta.url));
const ROUTES = appRoutes(APP_DIR);
/**
 * A route whose console is what it's for: /checks/page-check plants problems for
 * `<EchoCheck />` to report there, and page-check.spec.ts checks every line.
 */
const OWN_CONSOLE = new Set(["/checks/page-check"]);
const PAGES = ROUTES.static.filter((path) => !OWN_CONSOLE.has(path));

/**
 * Where each dynamic route's concrete pages are linked from. /docs/[slug] has
 * its own sweep below. A dynamic route missing here fails at load, so a new
 * one cannot go unchecked.
 */
const DYNAMIC_INDEX: Record<string, string> = {
  "/brand/[slug]": "/docs", // the sidebar lists every brand page
  "/templates/[slug]": "/templates",
};
for (const route of ROUTES.dynamic) {
  if (route !== "/docs/[slug]" && !(route in DYNAMIC_INDEX)) {
    throw new Error(`console.spec: no index page named for dynamic route ${route} — add it to DYNAMIC_INDEX`);
  }
}

/**
 * Dev-server noise that says nothing about the components.
 *
 * `GL Driver Message` is the browser's own GL performance telemetry (headless
 * Chromium stalls on ReadPixels when it screenshots a live WebGL canvas). It
 * is emitted by the driver, not by anything ShaderField controls. Note the
 * pattern is deliberately narrow: ShaderField's own failures are logged as
 * "ShaderField: ..." and must still fail this test.
 *
 * `preloaded using link preload but not used` is Chromium's resource-timing
 * hint, and it is the same load artefact the warm-up pass below exists for,
 * arriving through a different door. The site mounts five `next/font` faces on
 * <html>, so Next preloads five woff2 files; the warning fires when the text
 * using them has not painted "within a few seconds from the window's load
 * event". On a dev server compiling routes while six workers hammer it, that
 * deadline passes for reasons no component controls — and the giveaway is that
 * ALL FIVE warn together, which is a slow page, not five wrong fonts.
 *
 * It is safe to drop here specifically because these faces are site-only: the
 * registry's font roles are system stacks (`type-contract.test.ts` — a
 * consumer's install must need no network), so nothing a user installs can be
 * affected by how this docs site preloads its own typefaces. A genuine font
 * regression surfaces in the `visual:` screenshots, which compare what was
 * actually painted rather than what was hinted.
 */
const IGNORED =
  /React DevTools|Fast Refresh|\[HMR\]|webpack-hmr|Warning: Next\.js inferred|GL Driver Message|preloaded using link preload but not used/;

// The dev server compiles each route on first hit.
test.describe.configure({ timeout: 90_000 });

for (const path of PAGES) {
  test(`renders with a clean console: ${path}`, async ({ page }, testInfo) => {
    const devBaseURL = testInfo.config.metadata.devBaseURL as string;
    const problems: string[] = [];

    page.on("console", (m) => {
      const text = m.text();
      if ((m.type() === "error" || m.type() === "warning") && !IGNORED.test(text)) {
        problems.push(`[${m.type()}] ${text}`);
      }
    });
    page.on("pageerror", (e) => problems.push(`[pageerror] ${e.message}`));

    await visitDev(page, `${devBaseURL}${path}`, problems);
    await expect(problems).toEqual([]);
  });
}

/**
 * Every doc page in one test, with the route list scraped from the index
 * rather than hardcoded — the previews are real component usages, and an
 * unknown prop in one of them would otherwise only ever show up here.
 */
/**
 * Visit `paths` twice and assert the second visit is clean.
 *
 * Measurement is off during the warm-up pass. This drives a DEV server that
 * compiles each route on first hit while six other workers hammer the same
 * process. Under that load Next's first render of a route can emit
 * hydration-mismatch warnings that have nothing to do with the components —
 * the same page visited directly is clean, and the whole suite passes on a
 * re-run. That made the sweep intermittently red for a reason no component
 * change could fix.
 *
 * Compiling every route first, then measuring the second visit, removes the
 * race without weakening what is asserted: the IGNORED list is untouched, so
 * a real unknown-prop or hydration bug still fails. Suppressing the warnings
 * instead would have deleted the only signal this spec exists to carry.
 */
async function sweep(page: Page, devBaseURL: string, paths: readonly string[]): Promise<string[]> {
  const problems: string[] = [];
  let measuring = false;

  page.on("console", (m) => {
    if (!measuring) return;
    const text = m.text();
    if ((m.type() === "error" || m.type() === "warning") && !IGNORED.test(text)) {
      problems.push(`[${m.type()}] ${page.url()} ${text}`);
    }
  });
  page.on("pageerror", (e) => {
    if (!measuring) return;
    problems.push(`[pageerror] ${page.url()} ${e.message}`);
  });

  // Pass 1 — compile every route, measuring nothing. A cold compile on Next
  // 16's dev server can reload the page mid-navigation (ERR_ABORTED), so this
  // pass retries once; pass 2, which asserts, runs on built routes.
  for (const path of paths) {
    await gotoDev(page, `${devBaseURL}${path}`).catch(() => gotoDev(page, `${devBaseURL}${path}`));
  }

  // Pass 2 — the real sweep, against routes that are already built.
  measuring = true;
  for (const path of paths) {
    await visitDev(page, `${devBaseURL}${path}`, problems);
  }
  return problems;
}

async function linksUnder(page: Page, devBaseURL: string, from: string, prefix: string): Promise<string[]> {
  await gotoDev(page, `${devBaseURL}${from}`);
  const hrefs = await page.locator(`a[href^="${prefix}/"]`).evaluateAll((els) =>
    els.map((el) => (el as HTMLAnchorElement).getAttribute("href") ?? ""),
  );
  return [...new Set(hrefs)].filter(Boolean);
}

/**
 * Every doc page in one test, with the route list scraped from the index
 * rather than hardcoded — the previews are real component usages, and an
 * unknown prop in one of them would otherwise only ever show up here.
 */
test("renders every doc page with a clean console", async ({ page }, testInfo) => {
  const devBaseURL = testInfo.config.metadata.devBaseURL as string;
  const paths = await linksUnder(page, devBaseURL, "/docs", "/docs");
  expect(paths.length).toBeGreaterThan(20);
  // Two passes over every route, each compiled on demand by the dev server.
  // A flat budget (test.slow(), 270s) fit 53 routes; the docs grew past 75 and
  // CI is several times slower than a laptop, so it ran out there.
  // Budget per route and pass instead, so the page count can't fail it.
  test.setTimeout(60_000 + paths.length * 2 * 6_000);
  expect(await sweep(page, devBaseURL, paths)).toEqual([]);
});

for (const [route, index] of Object.entries(DYNAMIC_INDEX)) {
  // Links under the route's static part, kept only if they have its shape.
  const prefix = route.slice(0, route.indexOf("/["));
  const shape = new RegExp(`^${route.replace(/\[[^\]]+\]/g, "[^/]+")}$`);
  test(`renders every ${route} page with a clean console`, async ({ page }, testInfo) => {
    const devBaseURL = testInfo.config.metadata.devBaseURL as string;
    const paths = (await linksUnder(page, devBaseURL, index, prefix)).filter((p) => shape.test(p));
    expect(paths.length, `no ${prefix}/… links found on ${index}`).toBeGreaterThan(0);
    test.setTimeout(60_000 + paths.length * 2 * 6_000); // per route and pass, as above
    expect(await sweep(page, devBaseURL, paths)).toEqual([]);
  });
}

/*
 * Next's dev server adds each dynamic route to prerender-manifest.json
 * with an unlocked read-modify-write the first time that route's static params
 * resolve. Two routes resolving at once (these sweeps run in parallel workers)
 * can interleave the writes and leave invalid JSON, after which every page
 * answers 500. global-setup.ts loads each dynamic route once, in turn, before
 * any worker starts; once the manifest holds them all, Next never writes it
 * again, so there is nothing left to race.
 *
 * What's checked is the manifest as global-setup left it
 * (primed-routes.json), not as it is when this test runs. On CI's runner
 * `next dev` restarts itself near its memory limit, and the restarted server's
 * manifest starts empty again, so reading it later failed though every route
 * had been primed.
 */
test("every dynamic route was in the dev manifest before the sweeps ran", () => {
  const file = fileURLToPath(new URL("../apps/www/.next-dev/primed-routes.json", import.meta.url));
  const primed = JSON.parse(readFileSync(file, "utf8")) as string[];
  expect([...primed].sort()).toEqual([...ROUTES.dynamic].sort());
});

/*
 * In development, an element passed from a server component arrives
 * as a lazy reference, which `isValidElement` rejects. Modal, AlertDialog,
 * Popover and Tooltip then wrapped their `trigger` in a second button: nested
 * buttons and a hydration error, for exactly the usage their docs show.
 * Production resolves the element first, so only the dev server shows it.
 */
test("a trigger element from a server component becomes the trigger", async ({ page }, testInfo) => {
  const devBaseURL = testInfo.config.metadata.devBaseURL as string;
  await gotoDev(page, `${devBaseURL}/checks/server-triggers`);
  expect(await page.locator("button button").count(), "buttons nested in buttons").toBe(0);
  for (const id of ["modal-trigger", "alert-trigger", "popover-trigger"]) {
    // The HardwareButton's own button carries the trigger's wiring.
    await expect(page.getByTestId(id)).toHaveAttribute("data-base-ui-click-trigger", "");
  }
});

/*
 * Page content passed through AppShell (a client component) sometimes
 * hydrated with React-generated ids that differ from the server's, whenever
 * its code chunk arrived after the shell hydrated. Tabs then pointed at panel
 * ids that didn't exist. Checked in production by comparing each id in the
 * DOM (the server's) with the id React's client props hold. Before the fix,
 * about 15% of loads diverged (14 of 96); 36 clean loads rule that out.
 */
// Failed on Next 15.5 (React 19.2 canary); fixed by the Next 16 upgrade.
test("docs pages hydrate with the server's ids", async ({ browser }) => {
  test.setTimeout(180_000);
  const baseURL = test.info().project.use.baseURL!;
  expect(await countIdDivergence(browser, `${baseURL}/docs/tabs`), "loads whose DOM ids differ from React's client ids").toBe(0);
});

/**
 * A returning visitor's colour is put back before the page paints: the boot
 * script marks <html> with `data-seed-chosen` (so the homepage's opening
 * colour stands down) before React hydrates. React saw an attribute the
 * server never rendered and logged a hydration mismatch on every page, for
 * anyone who had ever picked a colour.
 */
test("a saved colour hydrates with a clean console", async ({ page }, testInfo) => {
  const devBaseURL = testInfo.config.metadata.devBaseURL as string;
  await page.addInitScript(() => {
    const seed = { accent: "#DE3B74", chassis: "#26222B", paper: "#F5EDE0" };
    window.localStorage.setItem("echo-site-theme", JSON.stringify({ seed, css: "" }));
  });
  const problems: string[] = [];
  page.on("console", (m) => {
    const text = m.text();
    if ((m.type() === "error" || m.type() === "warning") && !IGNORED.test(text)) problems.push(`[${m.type()}] ${text}`);
  });
  page.on("pageerror", (e) => problems.push(`[pageerror] ${e.message}`));
  // Once to compile, once to measure (see sweep()).
  await gotoDev(page, `${devBaseURL}/`);
  problems.length = 0;
  await gotoDev(page, `${devBaseURL}/`);
  expect(await page.evaluate(() => document.documentElement.hasAttribute("data-seed-chosen"))).toBe(true);
  expect(problems.filter((p) => /hydrat/i.test(p))).toEqual([]);
});
