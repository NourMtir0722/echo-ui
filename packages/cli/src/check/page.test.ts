import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createEchoTheme } from "echo-ui-core/theme";

import { run } from "../index";
import { checkUrl, PageCheckError } from "./page";

/**
 * `check --url` against a page served here: one of each problem the page
 * check looks for, found in this machine's Chrome or the project's own
 * Playwright (this repository's), with the team's rules applied and `--json`
 * keeping the CLI's contract. With neither, it says how to get a browser.
 */
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");

/** Whether this machine's Playwright has a Chromium to run: a unit-test job may not. */
async function chromiumRuns(): Promise<boolean> {
  try {
    const path = createRequire(join(repoRoot, "package.json")).resolve("@playwright/test");
    type Launcher = { launch(): Promise<{ close(): Promise<void> }> };
    // CommonJS, loaded from an ES module: its exports arrive under `default`.
    const mod = (await import(pathToFileURL(path).href)) as { chromium?: Launcher; default?: { chromium?: Launcher } };
    await (await (mod.chromium ?? mod.default!.chromium!).launch()).close();
    return true;
  } catch {
    return false;
  }
}
const browser = (await chromiumRuns()) ? {} : { skip: "no Chromium for Playwright on this machine" };

const themed = "background: var(--echo-cap); color: var(--echo-text); border: 0; padding: 8px";
const PAGE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>A page with problems</title>
<style>${createEchoTheme(undefined, { quiet: true }).css}
body { background: var(--echo-well); color: var(--echo-text); font: 16px system-ui, sans-serif; }</style>
</head>
<body>
<main>
<h1>A page with problems</h1>
<button id="unnamed" type="button" style="${themed}"><svg aria-hidden="true" width="16" height="16"><circle cx="8" cy="8" r="6" fill="currentColor"/></svg></button>
<p id="faint" style="color: var(--echo-seam)">Too faint to read on the well.</p>
<div id="red" style="width: 40px; height: 40px; background: #ff0000"></div>
<input id="invalid" aria-label="Code" aria-invalid="true" style="${themed}">
</main>
</body>
</html>`;

/** What the page's four plants are said as: the rule, then where. */
const PLANTS = [/^name button#unnamed/, /^contrast p#faint/, /^colour div#red/, /^screen input#invalid/];

let server: Server;
let url: string;
before(async () => {
  server = createServer((_, res) => {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(PAGE);
  });
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
  url = `http://127.0.0.1:${(server.address() as { port: number }).port}/`;
});
after(() => new Promise<void>((done) => server.close(() => done())));

test("check --url finds what only the rendered page shows, and nothing else", browser, async () => {
  const { findings } = await checkUrl({ root: repoRoot, url });
  const said = findings.map((f) => `${f.rule} ${f.where ?? ""}`);
  for (const plant of PLANTS) assert.ok(said.some((s) => plant.test(s)), `${plant}\n${said.join("\n")}`);
  assert.equal(findings.length, PLANTS.length, said.join("\n"));
});

test("the team's rules apply to the page: a rule off is gone, one at info is a note", browser, async () => {
  const { findings, notes } = await checkUrl({ root: repoRoot, url, team: { rules: { colour: "off", contrast: "info" } } });
  assert.deepEqual(findings.map((f) => f.rule).sort(), ["name", "screen"]);
  assert.deepEqual(notes.map((n) => n.rule), ["contrast"]);
});

/** The CLI as an agent reads it: the exit code, stdout, and stderr. */
async function capture(args: string[]): Promise<{ code: number; out: string; err: string }> {
  const [log, warn, error] = [console.log, console.warn, console.error];
  let out = "";
  let err = "";
  console.log = (...parts: unknown[]) => void (out += `${parts.join(" ")}\n`);
  console.warn = console.error = (...parts: unknown[]) => void (err += `${parts.join(" ")}\n`);
  try {
    return { code: await run(args), out, err };
  } finally {
    [console.log, console.warn, console.error] = [log, warn, error];
  }
}

test("--json keeps the CLI's contract: findings on stderr with ok: false, and exit 1", browser, async () => {
  const { code, out, err } = await capture(["check", "--url", url, "--cwd", repoRoot, "--json"]);
  assert.equal(code, 1);
  assert.equal(out.trim(), "", "stdout carries results only");
  const result = JSON.parse(err) as { ok: boolean; url: string; findings: { rule: string }[] };
  assert.equal(result.ok, false);
  assert.equal(result.url, url);
  assert.equal(result.findings.length, PLANTS.length);
});

test("a machine with no Chrome and a project with no Playwright are told how to get a browser, and nothing is installed", async () => {
  const empty = await mkdtemp(join(tmpdir(), "echo-check-url-"));
  await writeFile(join(empty, "package.json"), "{}\n");
  const chrome = process.env.ECHO_CHROME;
  process.env.ECHO_CHROME = join(empty, "no-chrome-here");
  try {
    await assert.rejects(checkUrl({ root: empty, url }), (error: unknown) => error instanceof PageCheckError && /npm install -D playwright/.test(error.message));
    const { code, err } = await capture(["check", "--url", url, "--cwd", empty]);
    assert.equal(code, 1);
    assert.match(err, /npx playwright install chromium/);
  } finally {
    if (chrome === undefined) delete process.env.ECHO_CHROME;
    else process.env.ECHO_CHROME = chrome;
    await rm(empty, { recursive: true, force: true });
  }
});
