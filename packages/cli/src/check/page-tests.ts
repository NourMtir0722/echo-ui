/**
 * Echo's page tests, run on the app's pages: each page loaded headless at
 * each width, the page check run in it (contrast, names, the design tests,
 * the rest), then axe (axe.ts), the team's rules applied, and every finding
 * cropped out of a screenshot of the page, so a person sees what it's about
 * and an agent knows where.
 *
 * `test` runs it over the project's pages; `check --stop` over the pages a
 * change touched; `check --url` over one. It reads the pages and writes only
 * the report, in `.echo/report/`.
 */
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { PNG } from "pngjs";

import { AXE_RULES } from "@registry/agent/axe-rules";
import type { RULE_LEVELS, TeamRules } from "@registry/agent/config-schema";

import { AXE_IN_PAGE, AXE_LIMIT, axeFinding, axeScript, axeWords, type AxeAbout, type AxeFinding, type AxeScan } from "./axe";
import { BrowserError, openBrowser, type CheckBrowser, type CheckPage } from "./browser";
import { pageCheckScript, type EchoFinding, type PageFinding } from "./page";

export const REPORT_DIR = ".echo/report";

/**
 * `.echo/`, made to ignore itself: what the tests write there (the report,
 * the Stop gate's count) is the machine's, never the repository's, and the
 * project's own .gitignore is left alone.
 */
export async function echoFolder(root: string): Promise<string> {
  const dir = join(root, ".echo");
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, ".gitignore"), "# Written by echo-ui: the report and state of Echo's tests, never committed.\n*\n", { flag: "wx" }).catch(() => undefined);
  return dir;
}
const HEIGHT = 900;
/** The page is cropped from one screenshot, no taller than this. */
const MAX_SHOT = 12_000;
/** Crops per page: past this, the findings are listed without one. */
const MAX_CROPS = 40;
const PAD = 24;

type Level = (typeof RULE_LEVELS)[number];

export interface ReportFinding {
  /** The crop, relative to the report's folder. */
  shot?: string;
}
export type ReportedFinding = PageFinding & ReportFinding;

/** For a person to check: never counted, and never said to the agent. */
export interface ReviewItem {
  /** `incomplete`: what axe couldn't decide; `frame`: an iframe axe didn't look inside; `axe`: axe didn't run. */
  kind: "incomplete" | "frame" | "axe";
  message: string;
  where?: string;
  axe?: AxeAbout;
}

export interface PageResult {
  route: string;
  url: string;
  width: number;
  findings: ReportedFinding[];
  /** What the team's rules turned to `info`: said, not counted. */
  notes: PageFinding[];
  /** For a person to check (ReviewItem). */
  review: ReviewItem[];
  /** Why the page couldn't be checked. */
  error?: string;
}

export interface PageTestRun {
  root: string;
  /** Where the app runs, `http://localhost:3000`. */
  base: string;
  routes: readonly string[];
  widths?: readonly number[];
  team?: TeamRules;
  /** Write the report (and its crops) to `<root>/.echo/report`. Default true. */
  report?: boolean;
}

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * In the page: let it settle, run the check, then find each finding's box
 * (and its row's) in page coordinates.
 *
 * Settled is the pause <EchoCheck /> leaves after a change, so entrances have
 * started, and then every animation that ends has ended: text
 * caught halfway through a fade-in is measured at the contrast it has for a
 * frame, as Echo's own axe sweep showed. A spinner or a breathing
 * light never ends, and the wait is never more than 3s. axe runs after this,
 * on the same settled page.
 *
 * A page that threw shows the dev server's error overlay instead of itself:
 * Next swaps in a document of its own and opens its error dialog,
 * Vite lays its overlay over what rendered. Then there's no page to test,
 * and what the overlay says comes back instead of findings.
 */
const IN_PAGE = (colours: readonly string[], ignore: readonly string[]) => `(async () => {
  await document.fonts?.ready;
  await new Promise((done) => setTimeout(done, 400));
  const ending = document.getAnimations().filter((a) => a.playState === "running" && Number.isFinite(Number(a.effect?.getComputedTiming().endTime)));
  const landed = Promise.all(ending.map((a) => a.finished.then(() => undefined, () => undefined)));
  await Promise.race([landed, new Promise((done) => setTimeout(done, 3000))]);
  const firstLine = (text) => (text ?? "").trim().split("\\n")[0].trim().slice(0, 300);
  const vite = document.querySelector("vite-error-overlay");
  if (vite) return { overlay: "Vite", said: firstLine(vite.shadowRoot?.querySelector(".message-body")?.textContent) };
  const next = document.querySelector("nextjs-portal")?.shadowRoot;
  const dialog = next?.querySelector("[data-nextjs-dialog]");
  if (dialog || document.documentElement.id === "__next_error__") {
    return { overlay: "Next.js", said: firstLine(next?.querySelector("#nextjs__container_errors_desc")?.textContent ?? dialog?.textContent) };
  }
  const findings = globalThis.__echoCheckPage({ colours: ${JSON.stringify(colours)}, ignore: ${JSON.stringify(ignore)} });
  const boxOf = (selectors) => {
    const rects = selectors.map((s) => { try { return document.querySelector(s)?.getBoundingClientRect(); } catch { return undefined; } }).filter((r) => r && r.width > 0 && r.height > 0);
    if (!rects.length) return undefined;
    const left = Math.min(...rects.map((r) => r.left)), top = Math.min(...rects.map((r) => r.top));
    const right = Math.max(...rects.map((r) => r.right)), bottom = Math.max(...rects.map((r) => r.bottom));
    return { x: left + scrollX, y: top + scrollY, width: right - left, height: bottom - top };
  };
  return { findings: findings.map((f) => ({ ...f, box: f.selector ? boxOf([f.selector, ...(f.related ?? [])]) : undefined })) };
})()`;

/** The page shows the dev server's error overlay, not itself: that page's error, never a pass. */
export class OverlayError extends BrowserError {}

const slug = (route: string) => (route.replace(/^\/+|\/+$/g, "").replace(/[^a-z0-9]+/gi, "-") || "home").toLowerCase();

/** `box` cut out of the page, padded, with the box ringed so the eye goes to it. */
function crop(page: PNG, box: Box): Buffer | undefined {
  const x = Math.max(0, Math.floor(box.x - PAD));
  const y = Math.max(0, Math.floor(box.y - PAD));
  const right = Math.min(page.width, Math.ceil(box.x + box.width + PAD));
  const bottom = Math.min(page.height, Math.ceil(box.y + box.height + PAD));
  const width = right - x;
  const height = Math.min(bottom - y, 1_200);
  if (width < 4 || height < 4) return undefined;
  const out = new PNG({ width, height });
  PNG.bitblt(page, out, x, y, width, height, 0, 0);
  // A 2px ring in Echo's purple, just outside the box.
  const ring = (px: number, py: number) => {
    if (px < 0 || py < 0 || px >= width || py >= height) return;
    const i = (py * width + px) * 4;
    out.data[i] = 0x8b;
    out.data[i + 1] = 0x6f;
    out.data[i + 2] = 0xe8;
    out.data[i + 3] = 255;
  };
  const [l, t] = [Math.round(box.x - x) - 3, Math.round(box.y - y) - 3];
  const [r, b] = [Math.round(box.x + box.width - x) + 2, Math.round(box.y + box.height - y) + 2];
  for (let d = 0; d < 2; d++) {
    for (let px = l; px <= r; px++) {
      ring(px, t + d);
      ring(px, b - d);
    }
    for (let py = t; py <= b; py++) {
      ring(l + d, py);
      ring(r - d, py);
    }
  }
  return PNG.sync.write(out);
}

/** The team's level for a finding: an axe rule's own (`axe:target-size`), else axe's, else the rule's. */
export function levelOf(team: TeamRules, f: Pick<PageFinding, "rule"> & { axe?: Pick<AxeAbout, "id"> }): Level | undefined {
  if (f.rule === "axe") return team.rules?.[`axe:${f.axe!.id}` as keyof NonNullable<TeamRules["rules"]>] ?? team.rules?.axe;
  return team.rules?.[f.rule];
}

/** The axe rules the team turned off, which axe isn't asked to run. */
export const axeRulesOff = (team: TeamRules): string[] => AXE_RULES.filter((id) => levelOf(team, { rule: "axe", axe: { id } }) === "off");

/** What `testPage` needs besides the page. */
export interface PageStep {
  /** echo.json's `check.colours`. */
  colours: readonly string[];
  /** Echo's page rules the team turned off: not run. */
  ignore: readonly string[];
  /** axe's script and the axe rules turned off; absent when the team turned axe off. */
  axe?: { script: string; off: readonly string[]; limit?: number };
  level: (f: PageFinding) => Level | undefined;
  /** Crop each finding into `dir`, as `<name>-<n>.png`. Absent: no pictures. */
  shots?: { dir: string; name: string };
}

const TIMED_OUT = Symbol("timed out");
/** `work`, or TIMED_OUT once `ms` have passed: whichever comes first. */
async function within<T>(work: Promise<T>, ms: number): Promise<T | typeof TIMED_OUT> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const late = new Promise<typeof TIMED_OUT>((done) => (timer = setTimeout(() => done(TIMED_OUT), ms)));
  // A failure after the time ran out is nobody's to hear.
  work.catch(() => undefined);
  try {
    return await Promise.race([work, late]);
  } finally {
    clearTimeout(timer);
  }
}

/** An error's first line, without the name the page put in front of it. */
const said = (error: unknown) => ((error as Error).message ?? String(error)).split("\n")[0]!.replace(/^(\w*Error: )+/, "");

/**
 * One loaded page, in one pass: settle it, run Echo's check, then axe, then
 * merge the two (a problem said once), apply the team's levels, and crop each
 * finding from one screenshot.
 *
 * Echo's check failing is the page's failure (a BrowserError, as a page that
 * won't load is). axe failing, or running out of time, never is: the page
 * keeps Echo's findings, and a person is told axe didn't run on it. The
 * page's own limit ends a scan that never finishes; half as long again ends
 * the wait for a page that doesn't answer at all.
 */
export async function testPage(page: CheckPage, step: PageStep): Promise<Pick<PageResult, "findings" | "notes" | "review">> {
  const checked = await page.evaluate<{ findings?: (EchoFinding & { box?: Box })[]; overlay?: string; said?: string }>(IN_PAGE(step.colours, step.ignore));
  if (!checked.findings) {
    const said = checked.said ? `: "${/[.!?]$/.test(checked.said) ? checked.said : `${checked.said}.`}"` : ".";
    throw new OverlayError(`shows ${checked.overlay}'s error overlay instead of the page${said} Fix that, and the tests run on the page.`);
  }
  const found: (PageFinding & { box?: Box })[] = checked.findings;
  const review: ReviewItem[] = [];
  let answering = true;
  if (step.axe) {
    const limit = step.axe.limit ?? AXE_LIMIT;
    try {
      const scan = await within(page.evaluate<AxeScan>(`${step.axe.script}\n;${AXE_IN_PAGE(step.axe.off, limit)}`), limit * 1.5);
      if (scan === TIMED_OUT) {
        answering = false;
        throw new Error(`the page didn't answer within ${(limit * 1.5) / 1000}s`);
      }
      found.push(...scan.violations.map(axeFinding));
      for (const raw of scan.incomplete) {
        const { axe, where } = axeFinding(raw);
        if (step.level({ rule: "axe", axe } as AxeFinding) === "off") continue;
        review.push({ kind: "incomplete", where, axe, message: `axe couldn't decide: ${axeWords(raw).message}` });
      }
      for (const frame of scan.frames) {
        const name = frame.title ? `"${frame.title}"` : frame.src ? (frame.src.length > 80 ? `${frame.src.slice(0, 79)}…` : frame.src) : "with no title or src";
        review.push({ kind: "frame", where: frame.where, message: `an iframe, ${name}: axe doesn't look inside frames, so what's in it isn't tested. Check it by hand.` });
      }
    } catch (error) {
      review.push({ kind: "axe", message: `axe couldn't run on this page: ${said(error)}. Echo's own checks ran; axe's didn't, so this page isn't known to pass them.` });
    }
  }

  const kept = found.filter((f) => step.level(f) === undefined);
  const notes = found.filter((f) => step.level(f) === "info").map(({ box: _box, ...f }) => f as PageFinding);
  let shot: PNG | undefined;
  // A page that stopped answering can't be photographed either.
  if (step.shots && answering && kept.some((f) => f.box)) shot = PNG.sync.read(await page.screenshot(MAX_SHOT));
  const findings: ReportedFinding[] = [];
  for (const [i, { box, ...finding }] of kept.entries()) {
    const entry: ReportedFinding = finding as PageFinding;
    if (shot && step.shots && box && i < MAX_CROPS && box.y < shot.height) {
      const png = crop(shot, box);
      if (png) {
        entry.shot = `shots/${step.shots.name}-${i + 1}.png`;
        await writeFile(join(step.shots.dir, entry.shot), png);
      }
    }
    findings.push(entry);
  }
  return { findings, notes, review };
}

/** Every page at every width: what the page check and axe find there, with the team's rules applied. */
export async function runPageTests({ root, base, routes, widths = [1280], team = {}, report = true }: PageTestRun): Promise<PageResult[]> {
  const init = await pageCheckScript();
  const dir = join(root, REPORT_DIR);
  if (report) {
    await echoFolder(root);
    await rm(dir, { recursive: true, force: true });
    await mkdir(join(dir, "shots"), { recursive: true });
  }
  const level = (f: PageFinding) => levelOf(team, f);
  const ignore = Object.entries(team.rules ?? {})
    .filter(([rule, at]) => at === "off" && rule !== "axe" && !rule.startsWith("axe:"))
    .map(([rule]) => rule);
  const off = axeRulesOff(team);
  const axe = off.length < AXE_RULES.length ? { script: await axeScript(), off } : undefined;
  let browser: CheckBrowser | undefined;
  const results: PageResult[] = [];
  try {
    browser = await openBrowser(root);
    for (const route of routes) {
      for (const width of widths) {
        const url = new URL(route, `${base}/`).href;
        const result: PageResult = { route, url, width, findings: [], notes: [], review: [] };
        results.push(result);
        const page = await browser.newPage({ width, height: HEIGHT, init });
        try {
          await page.goto(url);
          Object.assign(result, await testPage(page, { colours: team.colours ?? [], ignore, axe, level, shots: report ? { dir, name: `${slug(route)}-${width}` } : undefined }));
        } catch (error) {
          if (error instanceof OverlayError) result.error = `${url} ${error.message}`;
          else if (error instanceof BrowserError) result.error = `Couldn't load ${url}: ${error.message.split("\n")[0]}`;
          else throw error;
        } finally {
          await page.close();
        }
      }
    }
  } finally {
    await browser?.close();
  }
  if (report) await writeReport(dir, base, results);
  return results;
}

/* ------------------------------------------------------------------ report */

const escape = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
/** `code` in a finding's words, as the console shows it with backticks. */
const words = (s: string) => escape(s).replace(/`([^`]+)`/g, "<code>$1</code>");

/** An axe rule's name, its WCAG criterion, and Deque's page for it. */
const axeTag = (axe: AxeAbout) =>
  `<span class="id">${escape(axe.id)}</span> <span class="m">WCAG ${escape(axe.wcag)} ${axe.level}${axe.impact ? ` · ${axe.impact}` : ""}</span> <a class="m" href="${escape(axe.help)}">about this rule</a>`;

export function reportHtml(base: string, results: readonly PageResult[], at: string): string {
  const total = results.reduce((n, r) => n + r.findings.length, 0);
  const failing = results.filter((r) => r.findings.length || r.error).length;
  const toCheck = results.reduce((n, r) => n + r.review.length, 0);
  const pages = results
    .map((r) => {
      const state = r.error ? "not checked" : r.findings.length ? `${r.findings.length} to fix` : "clean";
      const head = `<h2><a href="${escape(r.url)}">${escape(r.route)}</a> <span class="w">${r.width}px</span> <span class="n">${state}</span></h2>`;
      if (r.error) return `<section>${head}<p class="err">${escape(r.error)}</p></section>`;
      const items = r.findings
        .map(
          (f) => `<li><p><span class="rule">${escape(f.rule)}</span> ${f.rule === "axe" ? `${axeTag(f.axe)} ` : ""}<span class="where">${escape(f.where ?? "")}</span></p>
<p>${words(f.message)}</p>${f.rule !== "axe" && f.measured ? `<p class="m">Measured: ${escape(f.measured)}</p>` : ""}${f.shot ? `<img src="${escape(f.shot)}" alt="${escape(f.where ?? f.rule)}" loading="lazy">` : ""}</li>`,
        )
        .join("\n");
      // Never counted: what echo.json's rules say without counting, and what only a person can decide.
      const notes = r.notes
        .map((f) => `<li><p><span class="rule">${escape(f.rule)}</span> ${f.rule === "axe" ? `${axeTag(f.axe)} ` : ""}<span class="where">${escape(f.where ?? "")}</span></p><p>${words(f.message)}</p></li>`)
        .join("\n");
      const review = r.review
        .map((item) => `<li><p>${item.axe ? `${axeTag(item.axe)} ` : ""}<span class="where">${escape(item.where ?? "")}</span></p><p>${words(item.message)}</p></li>`)
        .join("\n");
      return `<section>${head}${items ? `<ol>${items}</ol>` : ""}${notes ? `<div class="person"><h3>Said, not counted (echo.json's rules)</h3><ul>${notes}</ul></div>` : ""}${review ? `<div class="person"><h3>For a person to check</h3><ul>${review}</ul></div>` : ""}</section>`;
    })
    .join("\n");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Echo's tests</title>
<style>
:root { color-scheme: light dark; --ink: #1d1b22; --dim: #5d5a66; --rule: #dcd8e3; --ground: #f7f6f9; --mark: #6c4fd6; --bad: #a3243b; }
@media (prefers-color-scheme: dark) { :root { --ink: #ecebf0; --dim: #a7a3b2; --rule: #37343f; --ground: #17161b; --mark: #b4a2f5; --bad: #f08ca0; } }
* { box-sizing: border-box; }
body { margin: 0; padding: 32px 16px 64px; background: var(--ground); color: var(--ink); font: 15px/1.55 system-ui, sans-serif; }
main { max-width: 860px; margin: 0 auto; }
h1 { margin: 0 0 4px; font-size: 22px; }
.sum { margin: 0 0 32px; color: var(--dim); }
section { border-top: 1px solid var(--rule); padding: 20px 0; }
h2 { margin: 0 0 12px; font-size: 17px; display: flex; flex-wrap: wrap; gap: 4px 12px; align-items: baseline; }
h2 a { color: inherit; }
.w, .m { color: var(--dim); font-size: 13px; font-weight: 400; }
.n { font-size: 13px; font-weight: 600; color: var(--mark); }
ol { margin: 0; padding-left: 20px; display: grid; gap: 20px; }
li p { margin: 0 0 6px; overflow-wrap: anywhere; }
.rule { font: 600 12px ui-monospace, monospace; text-transform: uppercase; letter-spacing: 0.06em; color: var(--mark); }
.where { font: 13px ui-monospace, monospace; color: var(--dim); }
code { font: 13px ui-monospace, monospace; }
img { display: block; max-width: 100%; height: auto; margin-top: 8px; border: 1px solid var(--rule); border-radius: 6px; }
.err { color: var(--bad); }
.id { font: 600 13px ui-monospace, monospace; }
a.m { color: var(--dim); }
.person { margin-top: 20px; padding: 12px 16px; border: 1px dashed var(--rule); border-radius: 8px; }
h3 { margin: 0 0 8px; font-size: 14px; }
.person ul { margin: 0; padding-left: 20px; display: grid; gap: 10px; }
</style>
</head>
<body>
<main>
<h1>Echo's tests</h1>
<p class="sum">${escape(base)} · ${escape(at)} · ${results.length} page${results.length === 1 ? "" : "s"} · ${total ? `${total} to fix on ${failing}` : "every page clean"}${toCheck ? ` · ${toCheck} for a person to check` : ""}<br>
Echo's design tests, contrast and names, then axe's WCAG 2.2 A and AA rules, on each page.</p>
${pages}
</main>
</body>
</html>
`;
}

async function writeReport(dir: string, base: string, results: readonly PageResult[]): Promise<void> {
  const at = new Date().toISOString();
  const findings = results.reduce((n, r) => n + r.findings.length, 0);
  const json = { ok: findings === 0 && !results.some((r) => r.error), at, base, findings, pages: results };
  await writeFile(join(dir, "report.json"), `${JSON.stringify(json, null, 2)}\n`);
  await writeFile(join(dir, "index.html"), reportHtml(base, results, at));
}
