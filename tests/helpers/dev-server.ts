import type { Page } from "@playwright/test";

type GotoOptions = Parameters<Page["goto"]>[1];

/** Nothing answered: the server is down. Chromium's words, then WebKit's. */
const REFUSED = /ERR_CONNECTION_REFUSED|Could not connect to the server/;

/**
 * A visit to the dev server that waits out its restart. Next's dev
 * server exits and starts again when its heap passes 80% of its limit, which
 * is half the machine's memory; on CI's runner, a sweep that compiles every
 * docs route crosses it. A visit in the seconds between is refused, which
 * says nothing about the page, so this waits for the server and visits again.
 * Anything else (an abort, an error page, a timeout) still fails the test.
 */
export async function gotoDev(page: Page, url: string, options: GotoOptions = { waitUntil: "networkidle" }) {
  try {
    return await page.goto(url, options);
  } catch (error) {
    if (!REFUSED.test(String(error))) throw error;
    await answering(url);
    return page.goto(url, options);
  }
}

/** Resolves once the server answers `url` at all, whatever it says. */
async function answering(url: string, within = 60_000): Promise<void> {
  const until = Date.now() + within;
  for (;;) {
    try {
      await fetch(url, { method: "HEAD" });
      return;
    } catch {
      if (Date.now() > until) throw new Error(`Nothing answered ${url} for ${within / 1000}s after it refused a visit`);
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
}

/** A page's own requests, cut off by the server going away. Chromium's words, then WebKit's. */
const CUT = /net::ERR_CONNECTION_(?:REFUSED|RESET)|Could not connect to the server/;

/**
 * A measured visit to the dev server: `said` collects what the console says
 * meanwhile. When the restart lands after the page has come but while it is
 * still loading its own files, the browser says "Failed to load resource" for
 * each one it cut off, and a sweep counted that as the page's fault.
 * Such a visit is dropped, with what it said, and made again once the server
 * answers.
 */
export async function visitDev(page: Page, url: string, said: string[]) {
  const from = said.length;
  await gotoDev(page, url);
  if (!said.slice(from).some((line) => CUT.test(line))) return;
  said.length = from;
  await answering(url);
  await gotoDev(page, url);
}
