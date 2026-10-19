import { test, expect, type BrowserContext } from "@playwright/test";
import { budgetPages } from "./helpers/budget";
import { docRoutes } from "./helpers/layout";

/**
 * Echo under a Content Security Policy.
 *
 * `registry/src/agent/csp.ts` says what Echo needs (style attributes, and two
 * sources for two components), and `csp.test.ts` holds that to the code
 * Echo ships. This is the half only a browser can see: what the pages do
 * once Base UI, GSAP and the rest are running. Each page loads under a
 * report-only policy that grants the docs site what it needs for itself (its
 * inline scripts and styles, and the `data:` and `blob:` images the list
 * already covers) and nothing else, so an `eval`, a worker, a frame or
 * anything fetched from another origin shows up as a violation.
 */
const POLICY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "media-src 'self' blob:",
  "font-src 'self'",
  "connect-src 'self'",
  "worker-src 'none'",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
].join("; ");

async function underPolicy(context: BrowserContext) {
  await context.route("**/*", async (route) => {
    if (route.request().resourceType() !== "document") return route.continue();
    const response = await route.fetch();
    await route.fulfill({ response, headers: { ...response.headers(), "content-security-policy-report-only": POLICY } });
  });
  await context.addInitScript(() => {
    (window as unknown as { __csp: string[] }).__csp = [];
    document.addEventListener("securitypolicyviolation", (e) => {
      (window as unknown as { __csp: string[] }).__csp.push(`${e.effectiveDirective} ${e.blockedURI} ${e.sample}`.trim());
    });
  });
}

test("no page needs more from a Content Security Policy than the docs say", async ({ page, context, browserName }) => {
  test.skip(browserName !== "chromium", "one engine is enough to see what a page asks for");
  const routes = ["/", ...(await docRoutes(page))];
  // networkidle on every page is the slow part: a larger slice each.
  budgetPages(routes.length, 3_000);
  await underPolicy(context);
  const found: string[] = [];
  for (const route of routes) {
    await page.goto(route, { waitUntil: "networkidle" });
    const seen = await page.evaluate(() => (window as unknown as { __csp: string[] }).__csp);
    for (const v of seen) found.push(`${route}: ${v}`);
  }
  expect(found, "a page asked for something a strict policy blocks: see registry/src/agent/csp.ts").toEqual([]);
});
