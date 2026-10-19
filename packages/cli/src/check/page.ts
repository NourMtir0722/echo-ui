/**
 * `check --url`: the running-page check (`<EchoCheck />`), and axe, on a page
 * loaded headless, for CI or an agent with no browser of its own.
 *
 * It drives the Chrome already on the machine, or the project's own
 * Playwright, and never installs anything (browser.ts). The check is the same
 * code `<EchoCheck />` runs, carried in the CLI as one script and added to the
 * page before the app's own scripts.
 */
import { fileURLToPath } from "node:url";

import type { TeamRules } from "@registry/agent/config-schema";
import type { PageFinding as InPage } from "echo-ui-core/check";

import type { AxeFinding } from "./axe";
import { BrowserError } from "./browser";
import { runPageTests, type ReviewItem } from "./page-tests";

/** Set by the CLI's build: the page check, bundled for a browser. */
declare const __ECHO_PAGE_CHECK__: string | undefined;

/** A finding from the page, as `<EchoCheck />` words it, without the element it stays behind with. */
export type EchoFinding = Omit<InPage, "element">;

/** What the page tests find: Echo's own page check, or axe (which core doesn't run). */
export type PageFinding = EchoFinding | AxeFinding;

export class PageCheckError extends Error {}

/** The page check as a script: built into the CLI, or bundled now when running from this repository's source. */
export async function pageCheckScript(): Promise<string> {
  if (typeof __ECHO_PAGE_CHECK__ === "string") return __ECHO_PAGE_CHECK__;
  const { build } = await import("esbuild");
  const result = await build({
    entryPoints: [fileURLToPath(new URL("../../../core/src/check/browser.ts", import.meta.url))],
    bundle: true,
    format: "iife",
    platform: "browser",
    minify: true,
    write: false,
    logLevel: "silent",
  });
  return result.outputFiles[0]!.text;
}

export interface PageCheckRun {
  root: string;
  url: string;
  team?: TeamRules;
  width?: number;
}

/** Load `url` headless, let it settle, and return what the page tests find, with the team's rules applied. */
export async function checkUrl({ root, url, team = {}, width = 1280 }: PageCheckRun): Promise<{ findings: PageFinding[]; notes: PageFinding[]; review: ReviewItem[] }> {
  const at = new URL(url);
  let result;
  try {
    [result] = await runPageTests({ root, base: at.origin, routes: [`${at.pathname}${at.search}`], widths: [width], team, report: false });
  } catch (error) {
    if (error instanceof BrowserError) throw new PageCheckError(error.message);
    throw error;
  }
  if (result!.error) throw new PageCheckError(`${result!.error}. Is the app running?`);
  return { findings: result!.findings, notes: result!.notes, review: result!.review };
}
