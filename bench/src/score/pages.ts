/**
 * Every page the app has, opened in a browser: axe against WCAG 2.2 AA, a
 * full-page screenshot, whatever the console complained about, and for an
 * Echo app whether the page kept the look the project wears (look.ts).
 *
 * Kept per page and per rule, so the failure list can say which accessibility
 * mistakes agents make, not only how many.
 */
import { spawn } from "node:child_process";
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

import { judgeLook, readLook, type LookScore, type WornLook } from "./look";

/** WCAG 2.2 AA: every A and AA rule axe tags, up to 2.2. */
export const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

export interface PageResult {
  route: string;
  status: number | null;
  /** Violated rules, with how many elements each one caught. */
  axe: Record<string, { impact: string | null; nodes: number; help: string }>;
  consoleErrors: string[];
  /** Against the look the project wears; absent for an app that isn't Echo's. */
  look?: LookScore;
  screenshot: string;
}

/**
 * The app's static routes, from `app/**\/page.*`: route groups dropped, and
 * dynamic segments skipped, since there's nothing to fill them with.
 */
export async function staticRoutes(root: string, dir = "app", prefix = ""): Promise<string[]> {
  const routes: string[] = [];
  let entries;
  try {
    entries = await readdir(join(root, dir), { withFileTypes: true });
  } catch {
    return routes;
  }
  if (entries.some((e) => e.isFile() && /^page\.(tsx|jsx|ts|js|mdx)$/.test(e.name))) routes.push(prefix || "/");
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith("_") || entry.name.startsWith("@")) continue;
    if (entry.name.includes("[")) continue;
    const segment = /^\(.*\)$/.test(entry.name) ? "" : `/${entry.name}`;
    routes.push(...(await staticRoutes(root, `${dir}/${entry.name}`, `${prefix}${segment}`)));
  }
  return [...new Set(routes)].sort();
}

async function waitFor(url: string, ms = 60_000): Promise<void> {
  const deadline = Date.now() + ms;
  for (;;) {
    try {
      await fetch(url);
      return;
    } catch {
      if (Date.now() > deadline) throw new Error(`${url} never answered`);
      await new Promise((r) => setTimeout(r, 500));
    }
  }
}

export const slug = (route: string) => (route === "/" ? "home" : route.slice(1).replace(/\//g, "__"));

/** Serves the built app and visits every route. `shotsDir` receives one PNG per page. */
export async function scorePages(root: string, port: number, shotsDir: string, worn: WornLook | null = null): Promise<PageResult[]> {
  const routes = await staticRoutes(root);
  const server = spawn("npx", ["next", "start", "-p", String(port)], {
    cwd: root,
    stdio: "ignore",
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
    detached: true,
  });
  const base = `http://localhost:${port}`;
  const results: PageResult[] = [];
  const browser = await chromium.launch();
  try {
    await waitFor(base);
    for (const route of routes) {
      const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
      const consoleErrors: string[] = [];
      page.on("console", (m) => m.type() === "error" && consoleErrors.push(m.text()));
      page.on("pageerror", (e) => consoleErrors.push(String(e)));
      let status: number | null = null;
      try {
        const response = await page.goto(base + route, { waitUntil: "networkidle", timeout: 30_000 });
        status = response?.status() ?? null;
      } catch (error) {
        consoleErrors.push(`navigation: ${(error as Error).message}`);
      }
      const axe: PageResult["axe"] = {};
      try {
        const report = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
        for (const v of report.violations) axe[v.id] = { impact: v.impact ?? null, nodes: v.nodes.length, help: v.help };
      } catch (error) {
        consoleErrors.push(`axe: ${(error as Error).message}`);
      }
      let look: LookScore | undefined;
      if (worn) {
        try {
          look = judgeLook(worn, await readLook(page));
        } catch (error) {
          consoleErrors.push(`look: ${(error as Error).message}`);
        }
      }
      const screenshot = join(shotsDir, `${slug(route)}.png`);
      await page.screenshot({ path: screenshot, fullPage: true }).catch(() => undefined);
      results.push({ route, status, axe, consoleErrors, ...(look ? { look } : {}), screenshot });
      await page.close();
    }
  } finally {
    await browser.close();
    // The server and everything it started: it was launched as its own group.
    try {
      process.kill(-server.pid!, "SIGTERM");
    } catch {
      server.kill("SIGTERM");
    }
  }
  return results;
}
