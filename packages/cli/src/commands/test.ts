/**
 * `echo-ui test [<route…>]`: Echo's tests on the app's pages, the way a test
 * suite runs. Each page is loaded headless at each width and measured
 * (contrast, alignment, depth, corners, icons, and the rest of the page
 * check), then scanned by axe for WCAG A and AA, and every finding says what
 * to change.
 *
 * The pages are the ones named, else echo.json's `test.routes`, else every
 * page the app's routes have. The app is where `--url` says, else
 * `test.url`, else the port its dev script runs on. The report, with a crop
 * of each finding and what only a person can check (what axe couldn't
 * decide, the frames it didn't look inside), is written to `.echo/report/`.
 *
 * Exit codes: 0 every page clean, 1 when something's found or a page
 * couldn't be loaded (so CI can use it).
 */
import { readTeamRules, TeamRulesError } from "@registry/agent/check/team";
import { runCommand } from "@registry/agent/guidance";

import { appRoutes, readTestSettings, runningApp, TestSettingsError, type TestSettings } from "../check/app";
import { BrowserError } from "../check/browser";
import { REPORT_DIR, runPageTests, type PageResult } from "../check/page-tests";
import { detectFramework, readConfig } from "../project";
import { bold, dim, type Reporter } from "../output";
import { withoutTrailingSlashes } from "@echo-ui/client";

export interface TestOptions {
  root: string;
  routes: string[];
  url?: string;
  width?: string;
}

/** One finding, as the terminal says it. */
export const resultLine = (route: string, f: PageResult["findings"][number]) => `${route}  ${f.rule}  ${f.where ? `${f.where}: ` : ""}${f.message}`;

export function testSummary(results: readonly PageResult[]): string {
  const found = results.reduce((n, r) => n + r.findings.length, 0);
  const broken = results.filter((r) => r.error).length;
  const pages = `${results.length} page${results.length === 1 ? "" : "s"}`;
  if (!found && !broken) return `${pages}, every one clean.`;
  const failing = new Set(results.filter((r) => r.findings.length).map((r) => r.route)).size;
  const parts = [found ? `${found} to fix on ${failing} of ${pages}` : "", broken ? `${broken} couldn't be loaded` : ""].filter(Boolean);
  return `${parts.join("; ")}. Each line says what to change; change that and nothing else.`;
}

/** Where the app runs (undefined when it isn't) and which pages to test, from the options, echo.json and the app itself. */
export async function testTarget(root: string, options: { url?: string; routes?: readonly string[] }, settings: TestSettings) {
  const framework = (await readConfig(root))?.framework ?? (await detectFramework(root));
  const base = (options.url === undefined ? undefined : withoutTrailingSlashes(options.url)) ?? (await runningApp(root, framework, settings));
  const routes = options.routes?.length ? [...options.routes] : await appRoutes(root, framework, settings);
  return { base, routes };
}

export async function test(options: TestOptions, out: Reporter): Promise<number> {
  let settings: TestSettings;
  let team;
  try {
    const config = await readConfig(options.root);
    settings = readTestSettings((config as { test?: unknown } | undefined)?.test);
    team = readTeamRules(config?.check);
  } catch (error) {
    if (error instanceof TestSettingsError || error instanceof TeamRulesError) {
      out.error(error.message);
      return 1;
    }
    throw error;
  }
  const routes = options.routes.map((r) => (r.startsWith("/") ? r : `/${r}`));
  const { base, routes: pages } = await testTarget(options.root, { url: options.url, routes }, settings);
  if (!base) {
    out.error(
      `The app isn't running, so there's no page to test. Start it (\`npm run dev\`), then run \`${runCommand("test")}\` again, or say where it is: \`--url http://localhost:3000\`, or \`test.url\` in echo.json.`,
    );
    return 1;
  }
  const width = options.width ? Number(options.width) : undefined;
  if (width !== undefined && !(width >= 240 && width <= 3840)) {
    out.error("--width is a width in pixels, from 240 to 3840.");
    return 1;
  }

  let results: PageResult[];
  try {
    results = await runPageTests({ root: options.root, base, routes: pages, widths: width ? [width] : (settings.widths ?? [1280]), team });
  } catch (error) {
    if (error instanceof BrowserError) {
      out.error(error.message);
      return 1;
    }
    throw error;
  }

  const failed = results.some((r) => r.findings.length || r.error);
  const summary = testSummary(results);
  if (out.json && failed) {
    console.error(JSON.stringify({ ok: false, error: summary, command: "test", base, report: `${REPORT_DIR}/report.json`, pages: results }, null, 2));
    return 1;
  }
  out.line(dim(`${base} · ${pages.length} page${pages.length === 1 ? "" : "s"}`));
  for (const r of results) {
    const at = results.filter((x) => x.route === r.route).length > 1 ? `${r.route} @${r.width}` : r.route;
    if (r.error) out.line(`${at}  ${r.error}`);
    for (const f of r.findings) out.line(resultLine(at, f));
    for (const n of r.notes) out.line(dim(`note ${resultLine(at, n)}`));
  }
  if (failed) out.line();
  out.line(failed ? bold(summary) : dim(summary));
  const review = results.reduce((n, r) => n + r.review.length, 0);
  out.line(dim(`The report, with a picture of each${review ? ` and ${review} thing${review === 1 ? "" : "s"} for a person to check` : ""}: ${REPORT_DIR}/index.html`));
  out.result({ command: "test", base, report: `${REPORT_DIR}/report.json`, pages: results });
  return failed ? 1 : 0;
}
