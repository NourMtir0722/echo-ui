import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createServer, type Server } from "node:http";
import { access, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { promisify } from "node:util";
import { createEchoTheme } from "echo-ui-core/theme";

import { run } from "../index";
import { check } from "../commands/check";
import { reporter } from "../output";
import { findChrome, openBrowser } from "./browser";
import { pageCheckScript } from "./page";
import { REPORT_DIR, runPageTests, testPage } from "./page-tests";
import { MAX_ROUNDS, runStop } from "./stop";

/**
 * Echo's tests on pages served here, in this machine's Chrome with
 * nothing installed: `test` finds what's planted and writes the report with a
 * crop of each, and the Stop gate holds an agent for three rounds at most.
 */
const chrome = (await findChrome()) && typeof WebSocket === "function" ? {} : { skip: "no Chrome on this machine" };

const theme = createEchoTheme(undefined, { quiet: true }).css;
const page = (body: string) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Plans</title>
<style>${theme}
body { margin: 0; padding: 32px; background: var(--echo-well); color: var(--echo-text); font: 16px/1.5 system-ui, sans-serif; }
.plans { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; max-width: 900px; }
.plan { display: flex; flex-direction: column; gap: 12px; padding: 20px; background: var(--echo-surface); border-radius: 12px; }
.plan p { margin: 0; }
.plan button { align-self: flex-start; padding: 8px 14px; border: 0; border-radius: 8px; background: var(--echo-cap); color: var(--echo-text); font: inherit; }
.tag { width: 140px; margin: 24px 0 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
</style></head><body><main><h1>Plans</h1>${body}</main></body></html>`;

/** Three plans whose keys sit at three heights, and a line cut off with "…". */
const BAD = page(`<div class="plans">
<div class="plan"><p>Close</p><button type="button">Choose Close</button></div>
<div class="plan"><p>Plan</p><p>A thirteen-week cash forecast, rebuilt every Monday.</p><button type="button">Choose Plan</button></div>
<div class="plan"><p>Raise</p><p>A data room your investors can read.</p><p>Investor updates, every month.</p><button type="button">Choose Raise</button></div>
</div>
<p class="tag">Billed monthly in advance, stop with thirty days' notice</p>`);
const CLEAN = page(`<p>Nothing out of line here.</p>`);
const ICON = (size: number) => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true"><circle cx="12" cy="12" r="8" fill="currentColor"/></svg>`;
const KEYS = `<style>.keys { display: flex; } .keys button, .bare { padding: 0; border: 0; background: var(--echo-cap); color: var(--echo-text); }
.keys button { width: 14px; height: 14px; } .bare { width: 40px; height: 40px; }</style>
<div class="keys"><button type="button" aria-label="Bold">${ICON(10)}</button><button type="button" aria-label="Italic">${ICON(10)}</button></div>`;
/** Two 14px keys side by side: axe's target-size twice, and nothing of Echo's. */
const SMALL = page(KEYS);
/** The same keys, a key with no name (Echo's `name` and axe's `button-name`), and a frame axe doesn't look inside. */
const AXE = page(`${KEYS}<p><button type="button" class="bare">${ICON(24)}</button></p><iframe title="Map" src="about:blank" width="200" height="60"></iframe>`);
/**
 * A page as a dev server serves it: Next's dev tools in a shadow tree of their own, with what axe
 * would flag if it were the app's (a key with no name, a scrolling box no keyboard reaches).
 */
const DEV = page(`<p>Served by a dev server.</p>
<nextjs-portal></nextjs-portal>
<script>document.querySelector("nextjs-portal").attachShadow({ mode: "open" }).innerHTML = '<button type="button"></button><pre style="height: 40px; overflow: auto">' + "at render\\n".repeat(20) + "</pre>";</script>`);
/**
 * A page that threw, as each dev server shows it. Next swaps in a document of its own, with no
 * `lang`, and opens its error dialog; Vite lays its overlay over what rendered.
 */
const NEXT_CRASHED = `<!doctype html><html id="__next_error__"><head><meta charset="utf-8"><title>Plans</title></head>
<body><div><h2>This page couldn't load</h2><p>Reload to try again, or go back.</p></div><nextjs-portal></nextjs-portal>
<script>document.querySelector("nextjs-portal").attachShadow({ mode: "open" }).innerHTML = '<div data-nextjs-dialog role="dialog"><h1>Runtime Error</h1><p id="nextjs__container_errors_desc">The plans couldn&#39;t load.</p></div>';</script>
</body></html>`;
const VITE_CRASHED = page(`<vite-error-overlay></vite-error-overlay>
<script>document.querySelector("vite-error-overlay").attachShadow({ mode: "open" }).innerHTML = '<pre class="message"><span class="message-body">Failed to resolve import "./plans.js" from "main.js". Does the file exist?</span></pre>';</script>`);
/** Text that fades in over two seconds: clean once it has landed, faint on the way. */
const ENTERING = page(`<style>@keyframes enter { from { opacity: 0.1; } } .enter { animation: enter 2s linear both; }</style>
<p class="enter">Every page is checked once it has settled.</p>`);

let server: Server;
let base: string;
before(async () => {
  server = createServer((req, res) => {
    // A page that can't be loaded: the server drops the connection, as a dev server that crashed on it does.
    if (req.url?.startsWith("/gone")) return void req.socket.destroy();
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    const pages: Record<string, string> = { "/clean": CLEAN, "/entering": ENTERING, "/small": SMALL, "/axe": AXE, "/dev": DEV, "/next-crashed": NEXT_CRASHED, "/vite-crashed": VITE_CRASHED };
    res.end(pages[req.url?.split("?")[0] ?? ""] ?? BAD);
  });
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
  base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
});
after(() => new Promise<void>((done) => server.close(() => done())));

/** A project `init` set up, its app at `base`, with a page changed since the last commit. */
async function project(testSettings: Record<string, unknown>): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "echo-design-"));
  await writeFile(
    join(root, "echo.json"),
    JSON.stringify({ dir: "components/echo", framework: "next", packageManager: "npm", registry: "x", test: { url: base, ...testSettings } }),
  );
  await promisify(execFile)("git", ["init", "-q"], { cwd: root });
  await mkdir(join(root, "app"), { recursive: true });
  await writeFile(join(root, "app/page.tsx"), "export default function Page() { return null; }\n");
  return root;
}

/** echo.json rewritten: the app at `base`, with these `test` settings and the rest of the file. */
async function configure(root: string, testSettings: Record<string, unknown>, rest: Record<string, unknown> = {}): Promise<void> {
  await writeFile(join(root, "echo.json"), JSON.stringify({ dir: "c", framework: "next", packageManager: "npm", registry: "x", test: { url: base, ...testSettings }, ...rest }));
}
const git = (root: string, ...args: string[]) => promisify(execFile)("git", ["-c", "user.name=Echo", "-c", "user.email=echo@example.com", ...args], { cwd: root });

/** What the CLI says, as a person or an agent reads it: the exit code, stdout, and stderr. */
async function said(call: () => Promise<number>): Promise<{ code: number; out: string; err: string }> {
  const [log, warn, error] = [console.log, console.warn, console.error];
  let out = "";
  let err = "";
  console.log = (...parts: unknown[]) => void (out += `${parts.join(" ")}\n`);
  console.warn = console.error = (...parts: unknown[]) => void (err += `${parts.join(" ")}\n`);
  try {
    return { code: await call(), out, err };
  } finally {
    [console.log, console.warn, console.error] = [log, warn, error];
  }
}
const capture = (args: string[]) => said(() => run(args));
/** `check --stop` as Claude Code runs it: the hook's JSON on stdin. */
const stopHook = (root: string, input: object) => said(() => check({ root, files: [], stop: true, stdin: JSON.stringify(input) }, reporter(false)));

test("the design tests find what's planted, with the numbers, and only that", chrome, async () => {
  const root = await project({});
  try {
    const [result] = await runPageTests({ root, base, routes: ["/"], report: false });
    const said = result!.findings.map((f) => `${f.rule} ${f.message}`);
    assert.equal(result!.findings.length, 2, said.join("\n"));
    assert.ok(said.some((s) => /^alignment 3 cards side by side have their actions at 3 heights/.test(s)), said.join("\n"));
    assert.ok(said.some((s) => /^alignment "Billed monthly[^"]*" is cut off: it needs \d+px wide and has 140px/.test(s)), said.join("\n"));
    for (const f of result!.findings) assert.match(f.fix!, /Change only/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("the page tests measure a page once what's entering it has landed", chrome, async () => {
  const root = await project({});
  try {
    const [result] = await runPageTests({ root, base, routes: ["/entering"], report: false });
    assert.deepEqual(result!.findings.map((f) => `${f.rule} ${f.message}`), []);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("axe runs inside the page tests: Echo's shape, a control with no name said once, a frame for a person, and a picture of each", chrome, async () => {
  const root = await project({ routes: ["/axe"] });
  try {
    const { code, out } = await capture(["test", "--cwd", root]);
    assert.equal(code, 1, out);
    assert.match(out, /^\/axe {2}axe {2}button "Bold": target-size \(WCAG 2\.5\.8, AA\): this target is 14px by 14px/m);
    assert.match(out, /and 1 thing for a person to check: \.echo\/report\/index\.html/);
    const report = JSON.parse(await readFile(join(root, REPORT_DIR, "report.json"), "utf8")) as {
      pages: { findings: { rule: string; message: string; shot?: string; axe?: { id: string; wcag: string; level: string; help: string } }[]; review: { kind: string; message: string }[] }[];
    };
    const [found] = report.pages;
    // The key with no name is said once, by Echo's `name`: axe's button-name on the same element is dropped.
    assert.deepEqual(found!.findings.map((f) => (f.axe ? `axe:${f.axe.id}` : f.rule)).sort(), ["axe:target-size", "axe:target-size", "name"]);
    const target = found!.findings.find((f) => f.axe)!;
    assert.deepEqual({ ...target.axe, help: undefined }, { id: "target-size", impact: "serious", wcag: "2.5.8", level: "AA", help: undefined });
    assert.match(target.axe!.help, /^https:\/\/dequeuniversity\.com\/rules\/axe\/[\d.]+\/target-size$/);
    for (const f of found!.findings) assert.ok(f.shot, `${f.rule} has its picture`);
    assert.deepEqual(found!.review.map((r) => r.kind), ["frame"]);
    assert.match(found!.review[0]!.message, /^an iframe, "Map": axe doesn't look inside frames/);
    const html = await readFile(join(root, REPORT_DIR, "index.html"), "utf8");
    assert.match(html, /For a person to check/);
    assert.match(html, /<a class="m" href="https:\/\/dequeuniversity\.com\/rules\/axe\/[\d.]+\/target-size">about this rule<\/a>/);
    assert.match(html, /<title>Echo's tests<\/title>/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("a dev server's own overlay isn't the app's markup: axe leaves it out", chrome, async () => {
  const root = await project({});
  try {
    const [result] = await runPageTests({ root, base, routes: ["/dev"], report: false });
    assert.deepEqual(result!.findings.map((f) => `${f.rule} ${f.where}: ${f.message}`), []);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("a page showing the dev server's error overlay is that page's error, never a pass", chrome, async () => {
  const root = await project({ routes: ["/next-crashed", "/vite-crashed"] });
  try {
    const results = await runPageTests({ root, base, routes: ["/next-crashed", "/vite-crashed"], report: false });
    assert.deepEqual(results.map((r) => r.findings.length), [0, 0]);
    assert.match(results[0]!.error ?? "", /\/next-crashed shows Next\.js's error overlay instead of the page: "The plans couldn't load\."/);
    assert.match(results[1]!.error ?? "", /\/vite-crashed shows Vite's error overlay instead of the page: "Failed to resolve import "\.\/plans\.js" from "main\.js"\. Does the file exist\?"/);
    const stopped = await runStop(root, { session_id: "s" });
    assert.doesNotMatch(stopped.message ?? "", /passed/);
    assert.match(stopped.message!, /couldn't check \/next-crashed \(.*Next\.js's error overlay/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("axe's own time limit ends a scan that never finishes, and the page still answers", chrome, async () => {
  const root = await project({});
  const browser = await openBrowser(root);
  try {
    const page = await browser.newPage({ width: 1280, height: 900, init: await pageCheckScript() });
    await page.goto(`${base}/clean`);
    const hung = { script: "globalThis.axe = { run: () => new Promise(() => undefined) };", off: [], limit: 300 };
    const result = await testPage(page, { colours: [], ignore: [], axe: hung, level: () => undefined });
    assert.deepEqual(result.findings, []);
    assert.match(result.review[0]!.message, /^axe couldn't run on this page: it didn't finish within 0\.3s\./);
    assert.equal(await page.evaluate<number>("1 + 1"), 2);
    await page.close();
  } finally {
    await browser.close();
    await rm(root, { recursive: true, force: true });
  }
});

test("the Stop gate blocks on axe's findings, and echo.json's levels reach them: all of axe, or one rule", chrome, async () => {
  const root = await project({ routes: ["/small"] });
  try {
    const blocked = await runStop(root, { session_id: "s" });
    assert.equal(blocked.code, 2);
    assert.match(blocked.block!, /^Echo's tests found 2 things to fix on \/small before this is done:/);
    assert.match(blocked.block!, /^\/small {2}axe {2}button "Italic": target-size \(WCAG 2\.5\.8, AA\)/m);
    assert.match(blocked.block!, /When one is in markup you can't change \(a library's widget, an embed\), say so to the person: never turn its rule off in echo\.json, and never work around it\./);

    // "axe": "info", as Storybook's `todo`: said, not counted.
    await configure(root, { routes: ["/small"] }, { check: { rules: { axe: "info" } } });
    const info = await runStop(root, { session_id: "s" });
    assert.equal(info.code, 0);
    assert.match(info.message!, /^Echo's tests passed on 1 page \(\/small\)\. 2 things echo\.json's rules say without counting are in \.echo\/report\/index\.html\.$/);

    // One axe rule off: gone, and nothing said.
    await configure(root, { routes: ["/small"] }, { check: { rules: { "axe:target-size": "off" } } });
    const off = await runStop(root, { session_id: "s" });
    assert.deepEqual(off, { code: 0, message: "Echo's tests passed on 1 page (/small)." });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("the Stop gate tells the person when echo.json lets more through than at the last commit", chrome, async () => {
  const root = await project({ routes: ["/small"] });
  try {
    await git(root, "add", "-A");
    await git(root, "commit", "-qm", "start");
    await writeFile(join(root, "app/page.tsx"), "export default function Page() { return <main />; }\n");

    // The agent turns the rule that blocks it off, and stops.
    await configure(root, { routes: ["/small"] }, { check: { rules: { "axe:target-size": "off", alignment: "info" } } });
    const muted = await runStop(root, { session_id: "s" });
    assert.equal(muted.code, 0);
    assert.equal(
      muted.message,
      "Echo's tests passed on 1 page (/small). Since the last commit, echo.json lets more through: `axe:target-size` is now `off`, `alignment` is now `info`. If you didn't change that, the agent did: ask it why.",
    );

    // Blocked on something else: the agent hears it too.
    await configure(root, { routes: ["/small"] }, { check: { rules: { contrast: "off" } } });
    const blocked = await runStop(root, { session_id: "s" });
    assert.equal(blocked.code, 2);
    assert.match(blocked.block!, /Since the last commit, echo\.json lets more through: `contrast` is now `off`\./);

    // The gate itself turned off.
    await configure(root, { routes: ["/small"], stop: false });
    assert.deepEqual(await runStop(root, { session_id: "s" }), {
      code: 0,
      message: "Since the last commit, echo.json lets more through: the Stop gate itself is off (`test.stop`). If you didn't change that, the agent did: ask it why.",
    });

    // Committed, it's the person's decision, and nothing more is said.
    await configure(root, { routes: ["/small"] }, { check: { rules: { "axe:target-size": "off" } } });
    await git(root, "commit", "-qam", "the person keeps it");
    await writeFile(join(root, "app/page.tsx"), "export default function Page() { return <main>Again</main>; }\n");
    assert.deepEqual(await runStop(root, { session_id: "s" }), { code: 0, message: "Echo's tests passed on 1 page (/small)." });
    // Tightening is never news.
    await configure(root, { routes: ["/small"] }, { check: { rules: { "axe:target-size": "info" } } });
    assert.doesNotMatch((await runStop(root, { session_id: "s" })).message ?? "", /Since the last commit/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("test exits 1, says each finding, and writes the report with a picture of each; .echo ignores itself", chrome, async () => {
  const root = await project({ routes: ["/", "/clean"] });
  try {
    const { code, out } = await capture(["test", "--cwd", root]);
    assert.equal(code, 1, out);
    assert.match(out, /^\/ {2}alignment /m);
    assert.match(out, /2 to fix on 1 of 2 pages/);
    const report = JSON.parse(await readFile(join(root, REPORT_DIR, "report.json"), "utf8")) as { ok: boolean; pages: { route: string; findings: { shot?: string }[] }[] };
    assert.equal(report.ok, false);
    assert.deepEqual(report.pages.map((p) => [p.route, p.findings.length]), [["/", 2], ["/clean", 0]]);
    for (const f of report.pages[0]!.findings) {
      assert.ok(f.shot, "each finding has its picture");
      const png = await readFile(join(root, REPORT_DIR, f.shot!));
      assert.equal(png.subarray(1, 4).toString(), "PNG");
    }
    assert.match(await readFile(join(root, REPORT_DIR, "index.html"), "utf8"), /2 to fix on 1/);
    assert.equal((await readFile(join(root, ".echo/.gitignore"), "utf8")).trim().split("\n").at(-1), "*");

    // One clean page: exit 0.
    assert.equal((await capture(["test", "/clean", "--cwd", root])).code, 0);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("test says when the app isn't running, and how to point it at the app", async () => {
  const root = await mkdtemp(join(tmpdir(), "echo-design-"));
  try {
    await writeFile(join(root, "echo.json"), JSON.stringify({ dir: "c", framework: "next", packageManager: "npm", registry: "x", test: { url: "http://127.0.0.1:9" } }));
    const { code, err } = await capture(["test", "--cwd", root]);
    assert.equal(code, 1);
    assert.match(err, /isn't running/);
    assert.match(err, /--url/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("the Stop gate holds the agent while the page fails, for three rounds at most, then lets it go and says what's left", chrome, async () => {
  const root = await project({ routes: ["/"] });
  try {
    const first = await runStop(root, { session_id: "s1", stop_hook_active: false });
    assert.equal(first.code, 2);
    assert.match(first.block!, /Echo's tests found 2 things to fix on \//);
    assert.match(first.block!, /round 1 of 3/);
    for (let round = 2; round <= MAX_ROUNDS; round++) {
      const again = await runStop(root, { session_id: "s1", stop_hook_active: true });
      assert.equal(again.code, 2);
      assert.match(again.block!, new RegExp(`round ${round} of 3`));
    }
    const last = await runStop(root, { session_id: "s1", stop_hook_active: true });
    assert.equal(last.code, 0);
    assert.match(last.message!, /still find 2 things to fix after 3 rounds/);
    // A fresh stop starts the count again.
    assert.equal((await runStop(root, { session_id: "s1", stop_hook_active: false })).code, 2);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("the Stop gate lets the agent stop: the pages pass, nothing a person sees changed, the gate is off, or the app isn't running", chrome, async () => {
  const clean = await project({ routes: ["/clean"] });
  const off = await project({ stop: false });
  const down = await project({ url: "http://127.0.0.1:9" });
  const untouched = await project({});
  try {
    const passed = await runStop(clean, { session_id: "s" });
    assert.equal(passed.code, 0);
    assert.match(passed.message!, /passed on 1 page/);
    assert.deepEqual(await runStop(off, {}), { code: 0 });
    const notRunning = await runStop(down, {});
    assert.equal(notRunning.code, 0);
    assert.match(notRunning.message!, /the app isn't running/);
    await rm(join(untouched, "app"), { recursive: true });
    await writeFile(join(untouched, "README.md"), "notes\n");
    assert.deepEqual(await runStop(untouched, {}), { code: 0 });
  } finally {
    for (const root of [clean, off, down, untouched]) await rm(root, { recursive: true, force: true });
  }
});

test("the Stop gate never says the tests passed on a page it couldn't check", chrome, async () => {
  const root = await project({ routes: ["/clean", "/gone"] });
  try {
    const stopped = await runStop(root, { session_id: "s" });
    assert.equal(stopped.code, 0);
    assert.doesNotMatch(stopped.message!, /passed on 2 pages/);
    assert.match(stopped.message!, /passed on 1 page \(\/clean\)/);
    assert.match(stopped.message!, /couldn't check \/gone/);
    // With something to fix, the agent hears which page went unchecked too.
    await writeFile(join(root, "echo.json"), JSON.stringify({ dir: "c", framework: "next", packageManager: "npm", registry: "x", test: { url: base, routes: ["/", "/gone"] } }));
    const blocked = await runStop(root, { session_id: "s" });
    assert.equal(blocked.code, 2);
    assert.match(blocked.block!, /couldn't check \/gone/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

/** The project's Playwright, for a machine with no Chrome; this repository's own, linked into a project. */
// It needs that Playwright's Chromium downloaded, as the Chrome tests need a
// Chrome: CI's build job has Playwright and no browser for it, and the test
// failed there instead of standing aside.
const playwright = await (async () => {
  let dir: string;
  try {
    dir = dirname(createRequire(import.meta.url).resolve("@playwright/test/package.json"));
  } catch {
    return { dir: "", skip: "no Playwright in this repository" };
  }
  const { chromium } = await import("@playwright/test");
  const downloaded = await access(chromium.executablePath()).then(
    () => true,
    () => false,
  );
  return downloaded ? { dir, skip: undefined } : { dir, skip: "this repository's Playwright has no Chromium downloaded" };
})();

test("on the project's Playwright, a page that can't be loaded is that page's error, and the other pages are still tested", playwright, async () => {
  const root = await project({});
  const before = process.env.ECHO_CHROME;
  process.env.ECHO_CHROME = join(root, "no-chrome-here");
  try {
    await writeFile(join(root, "package.json"), "{}\n");
    await mkdir(join(root, "node_modules/@playwright"), { recursive: true });
    await symlink(playwright.dir, join(root, "node_modules/@playwright/test"), "dir");
    const results = await runPageTests({ root, base, routes: ["/gone", "/clean", "/small"], report: false });
    assert.equal(results.length, 3);
    assert.match(results[0]!.error ?? "", /^Couldn't load .*\/gone/);
    assert.equal(results[1]!.error, undefined);
    assert.deepEqual(results[1]!.findings, []);
    // axe runs on the project's Playwright as it does in Chrome.
    assert.deepEqual(results[2]!.findings.map((f) => (f.rule === "axe" ? f.axe.id : f.rule)), ["target-size", "target-size"]);
  } finally {
    if (before === undefined) delete process.env.ECHO_CHROME;
    else process.env.ECHO_CHROME = before;
    await rm(root, { recursive: true, force: true });
  }
});

test("check --stop speaks Claude Code's hook: exit 2 with the findings on stderr, exit 0 with a systemMessage", chrome, async () => {
  const root = await project({ routes: ["/"] });
  try {
    const blocked = await stopHook(root, { session_id: "s", stop_hook_active: false, cwd: root });
    assert.equal(blocked.code, 2);
    assert.match(blocked.err, /Echo's tests found 2 things to fix/);
    assert.equal(blocked.out.trim(), "");
    await writeFile(join(root, "echo.json"), JSON.stringify({ dir: "c", framework: "next", packageManager: "npm", registry: "x", test: { url: base, routes: ["/clean"] } }));
    const passed = await stopHook(root, { session_id: "s", stop_hook_active: false, cwd: root });
    assert.equal(passed.code, 0);
    assert.match(JSON.parse(passed.out).systemMessage, /passed/);
    assert.ok(await access(join(root, ".echo/stop.json")).then(() => true));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
