import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { AXE_NAME_RULES, AXE_RULES, AXE_TAGS } from "@registry/agent/axe-rules";
import { configSchema } from "@registry/agent/config-schema";
import { readTeamRules, TeamRulesError } from "@registry/agent/check/team";

import { axeFinding, axeFix, axeWords, type AxeRaw } from "./axe";
import { BrowserError, type CheckPage } from "./browser";
import { axeRulesOff, levelOf, testPage, type PageStep } from "./page-tests";

/**
 * axe in the page tests, without a browser: the rules echo.json can name are
 * the ones the pinned axe-core runs, Echo's tests and the repository's own
 * use one axe, its findings are worded Echo's way, the team's levels reach
 * one axe rule or all of them, and axe failing on a page costs that page
 * nothing of Echo's.
 */
const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../../../..");
const require = createRequire(import.meta.url);

test("the axe rules echo.json can name are the ones the CLI's axe-core runs under Echo's tags", () => {
  const axe = require("axe-core") as {
    getRules(tags?: string[]): { ruleId: string; tags: string[] }[];
    _audit: { tagExclude: string[] };
  };
  // What axe.run runs: getRules lists experimental and deprecated rules too, which run leaves out.
  const runs = axe
    .getRules([...AXE_TAGS])
    .filter((r) => !r.tags.some((t) => axe._audit.tagExclude.includes(t)))
    .map((r) => r.ruleId)
    .filter((id) => id !== "color-contrast");
  assert.deepEqual([...AXE_RULES].sort(), runs.sort());
  for (const id of AXE_NAME_RULES) assert.ok(AXE_RULES.includes(id), id);
});

test("one axe: the CLI's pinned axe-core is the version the repository's own axe tests use", async () => {
  const cli = JSON.parse(await readFile(join(here, "../../package.json"), "utf8")) as { dependencies: Record<string, string> };
  // Pinned exactly: a new axe rule shouldn't start blocking agents the day it ships.
  assert.match(cli.dependencies["axe-core"]!, /^\d+\.\d+\.\d+$/);
  const mine = JSON.parse(await readFile(require.resolve("axe-core/package.json"), "utf8")) as { version: string };
  assert.equal(mine.version, cli.dependencies["axe-core"]);
  const playwright = createRequire(join(repoRoot, "package.json")).resolve("@axe-core/playwright");
  const theirs = JSON.parse(await readFile(createRequire(playwright).resolve("axe-core/package.json"), "utf8")) as { version: string };
  assert.equal(theirs.version, mine.version, "tests/axe.ts and the CLI scan with different axe-cores");
  // And the published CLI depends on it, pinned the same way.
  assert.match(await readFile(join(here, "../../build.mjs"), "utf8"), /"axe-core": pkg\.dependencies\["axe-core"\]/);
});

const raw = (over: Partial<AxeRaw>): AxeRaw => ({
  id: "list",
  impact: "serious",
  tags: ["cat.structure", "wcag2a", "wcag131"],
  help: "<ul> and <ol> must only directly contain <li>, <script> or <template> elements",
  helpUrl: "https://dequeuniversity.com/rules/axe/4.13/list?application=axeAPI",
  summary: "Fix all of the following:\n  List element has direct children that are not allowed: div",
  echo: false,
  where: "ul",
  selector: "main > ul",
  ...over,
});

test("an axe finding says its rule, its WCAG criterion and level, and axe's own fix, on one line", () => {
  const f = axeFinding(raw({}));
  assert.equal(f.rule, "axe");
  assert.equal(f.message, "list (WCAG 1.3.1, A): <ul> and <ol> must only directly contain <li>, <script> or <template> elements. List element has direct children that are not allowed: div.");
  assert.deepEqual(f.axe, { id: "list", impact: "serious", wcag: "1.3.1", level: "A", help: "https://dequeuniversity.com/rules/axe/4.13/list" });
  assert.equal(f.key, "axe:list:main > ul");
  assert.equal(f.where, "ul");

  // Two-digit criteria, AA from any WCAG version's tag.
  const spacing = axeWords({ id: "avoid-inline-spacing", tags: ["wcag21aa", "wcag1412"], help: "Inline text spacing must be adjustable", summary: "", echo: false });
  assert.equal(spacing.wcag, "1.4.12");
  assert.equal(spacing.level, "AA");
  assert.equal(axeWords({ id: "meta-viewport", tags: ["wcag2aa", "wcag144"], help: "x", summary: "", echo: false }).level, "AA");

  // "Fix any of the following" keeps its choices; one choice is said alone.
  assert.equal(
    axeFix("Fix any of the following:\n  Element has no title attribute\n  aria-label attribute does not exist or is empty"),
    "Fix any of the following: Element has no title attribute; aria-label attribute does not exist or is empty.",
  );
  assert.equal(axeFix("Fix all of the following:\n  the autocomplete attribute is incorrectly formatted"), "The autocomplete attribute is incorrectly formatted.");
  assert.equal(axeFix(""), "");
});

test("the rules agents hit say Echo's answer: the part, the prop, the size", () => {
  const target = axeWords(
    raw({
      id: "target-size",
      tags: ["wcag22aa", "wcag258"],
      summary:
        "Fix any of the following:\n  Target has insufficient size (14px by 14px, should be at least 24px by 24px)\n  Target has insufficient space to its closest neighbors. Safe clickable space has a diameter of 4px instead of at least 24px.",
    }),
  );
  assert.match(target.message, /^target-size \(WCAG 2\.5\.8, AA\): this target is 14px by 14px with 4px of room around it, where WCAG asks for 24px by 24px/);
  assert.match(target.message, /use the part \(HardwareButton, Toggle, Link\) instead of a raw control/);
  assert.match(axeWords(raw({ id: "target-size", tags: ["wcag22aa", "wcag258"], echo: true, summary: "" })).message, /Echo's parts are 24px and up, so something outside this one made it smaller/);

  assert.match(axeWords(raw({ id: "image-alt", tags: ["wcag2a", "wcag111"] })).message, /^image-alt \(WCAG 1\.1\.1, A\): this image has no `alt`.*`alt=""` when it's decoration\./);
  assert.match(axeWords(raw({ id: "aria-hidden-focus", tags: ["wcag2a", "wcag412"] })).message, /Make it `inert` instead/);
  // button-name: Echo's line on an Echo part; axe's words on the app's own button.
  assert.match(axeWords(raw({ id: "button-name", tags: ["wcag2a", "wcag412"], echo: true })).message, /an `iconOnly` HardwareButton's type asks for one/);
  assert.match(axeWords(raw({ id: "button-name", tags: ["wcag2a", "wcag412"], help: "Buttons must have discernible text", summary: "Fix any of the following:\n  Element has no title attribute" })).message, /^button-name \(WCAG 4\.1\.2, A\): Buttons must have discernible text\. Element has no title attribute\.$/);
});

test("echo.json takes `axe` and `axe:<id>`, and refuses an axe rule Echo doesn't run", () => {
  const team = readTeamRules({ rules: { axe: "info", "axe:target-size": "off" } });
  assert.deepEqual(team.rules, { axe: "info", "axe:target-size": "off" });
  // Misspelt, and one axe has but never runs (experimental): either would turn nothing off.
  assert.throws(() => readTeamRules({ rules: { "axe:targetsize": "off" } }), (e: Error) => e instanceof TeamRulesError && /`axe:targetsize`, which isn't one of the axe rules Echo runs: area-alt/.test(e.message));
  assert.throws(() => readTeamRules({ rules: { "axe:p-as-heading": "off" } }), TeamRulesError);
  assert.throws(() => readTeamRules({ rules: { "axe:color-contrast": "off" } }), TeamRulesError);
  // The schema completes them in an editor.
  const rules = ((configSchema().properties as Record<string, { properties: Record<string, { propertyNames: { enum: string[] } }> }>).check!.properties.rules!.propertyNames.enum);
  assert.ok(rules.includes("axe") && rules.includes("axe:target-size") && !rules.includes("axe:color-contrast"));
});

test("a level for one axe rule comes before axe's, and a rule axe is told not to run is one that's off", () => {
  const team = readTeamRules({ rules: { axe: "info", "axe:target-size": "off", contrast: "info" } });
  assert.equal(levelOf(team, { rule: "axe", axe: { id: "target-size" } }), "off");
  assert.equal(levelOf(team, { rule: "axe", axe: { id: "list" } }), "info");
  assert.equal(levelOf(team, { rule: "contrast" }), "info");
  assert.equal(levelOf({}, { rule: "axe", axe: { id: "list" } }), undefined);
  assert.deepEqual(axeRulesOff(team), ["target-size"]);
  assert.equal(axeRulesOff(readTeamRules({ rules: { axe: "off" } })).length, AXE_RULES.length);
  assert.deepEqual(axeRulesOff(readTeamRules({ rules: { axe: "off", "axe:list": "info" } })), AXE_RULES.filter((id) => id !== "list"));
});

/** A page that answers Echo's check with one finding, and axe however `axe` says. */
function fakePage(axe: (expression: string) => Promise<unknown>): CheckPage & { shots: number } {
  return {
    shots: 0,
    async goto() {},
    async evaluate<T>(expression: string) {
      if (expression.includes("__echoCheckPage")) return { findings: [{ rule: "contrast", message: "2.1:1 (#777777 on #ffffff).", where: "p", selector: "main > p", key: "contrast:main > p:" }] } as T;
      return (await axe(expression)) as T;
    },
    async screenshot() {
      this.shots++;
      return Buffer.alloc(0);
    },
    async close() {},
  };
}
const step = (limit: number): PageStep => ({ colours: [], ignore: [], axe: { script: "/* axe */", off: [], limit }, level: () => undefined });

test("axe failing on a page costs it nothing: Echo's findings are kept, and a person is told axe didn't run", async () => {
  const threw = await testPage(fakePage(() => Promise.reject(new BrowserError("TypeError: Cannot read properties of null (reading 'nodeType')\n    at axe.min.js:12"))), step(10_000));
  assert.deepEqual(threw.findings.map((f) => f.rule), ["contrast"]);
  assert.equal(threw.review.length, 1);
  assert.equal(threw.review[0]!.kind, "axe");
  assert.match(threw.review[0]!.message, /^axe couldn't run on this page: Cannot read properties of null \(reading 'nodeType'\)\. Echo's own checks ran; axe's didn't, so this page isn't known to pass them\.$/);
});

test("a page that never answers axe is let go at the time limit, keeping Echo's findings", async () => {
  const page = fakePage(() => new Promise(() => undefined));
  const started = Date.now();
  const hung = await testPage(page, { ...step(100), shots: { dir: "/nowhere", name: "x" } });
  assert.ok(Date.now() - started < 1_000, `waited ${Date.now() - started}ms`);
  assert.deepEqual(hung.findings.map((f) => f.rule), ["contrast"]);
  assert.match(hung.review[0]!.message, /^axe couldn't run on this page: the page didn't answer within 0\.15s\./);
  // A page that stopped answering isn't photographed either: that would hang too.
  assert.equal(page.shots, 0);
});

test("axe turned off isn't run, and its levels drop or keep each finding", async () => {
  let asked = 0;
  const off = await testPage(
    fakePage(async () => (asked++, { violations: [], incomplete: [], frames: [] })),
    { colours: [], ignore: [], level: () => undefined },
  );
  assert.equal(asked, 0);
  assert.deepEqual(off.review, []);

  const scan = {
    violations: [raw({}), raw({ id: "target-size", tags: ["wcag22aa", "wcag258"], selector: "button" })],
    incomplete: [raw({ id: "aria-valid-attr-value", tags: ["wcag2a", "wcag412"], summary: "Fix all of the following:\n  ARIA attribute element ID does not exist on the page: aria-controls=\"menu\"" })],
    frames: [{ where: "iframe", title: "", src: "https://www.youtube.com/embed/xyz" }],
  };
  const team = readTeamRules({ rules: { "axe:target-size": "off", "axe:list": "info" } });
  const kept = await testPage(fakePage(async () => scan), { ...step(10_000), level: (f) => levelOf(team, f) });
  assert.deepEqual(kept.findings.map((f) => f.rule), ["contrast"]);
  assert.deepEqual(kept.notes.map((f) => (f.rule === "axe" ? f.axe.id : f.rule)), ["list"]);
  assert.deepEqual(kept.review.map((r) => r.kind), ["incomplete", "frame"]);
  assert.match(kept.review[0]!.message, /^axe couldn't decide: aria-valid-attr-value \(WCAG 4\.1\.2, A\): .*aria-controls="menu"/);
  assert.match(kept.review[1]!.message, /^an iframe, https:\/\/www\.youtube\.com\/embed\/xyz: axe doesn't look inside frames/);
});
