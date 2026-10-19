import { test, expect, type Page } from "@playwright/test";
import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { pageCheckScript } from "../packages/cli/src/check/page";
import { runPageTests } from "../packages/cli/src/check/page-tests";
import { budgetPages } from "./helpers/budget";

/**
 * Echo's page tests, run the way `test` and the Stop gate run them.
 *
 * The design tests (echo-ui-core/check's design.ts): the page check carried
 * as one script, added to the page before its own. On /checks/design they
 * find each planted problem with its numbers and nothing else; on Echo's own
 * gallery and docs they find nothing, since a test that cries wolf on
 * well-made screens is one agents learn to ignore.
 *
 * axe, through the CLI's own path (`runPageTests`, in the Chrome driver it
 * opens itself): on /checks/axe it finds the eleven of fourteen planted
 * mistakes it can, and on the gallery and docs nothing. Those run once, in
 * the Chromium project: they drive a browser of their own, whichever engine
 * the project is.
 */
const DESIGN = new Set(["alignment", "depth", "corners", "icons"]);

type Found = { rule: string; where?: string; message: string };
let script: string;
test.beforeAll(async () => {
  script = await pageCheckScript();
});

/** What the design tests say on `path`, as `rule where: message`. */
async function designOn(page: Page, path: string): Promise<string[]> {
  await page.goto(path);
  const found = await page.evaluate(async () => {
    await document.fonts?.ready;
    await new Promise((done) => setTimeout(done, 400));
    return (globalThis as unknown as { __echoCheckPage(o: object): Found[] }).__echoCheckPage({});
  });
  return found.filter((f) => DESIGN.has(f.rule)).map((f) => `${f.rule} ${f.where ?? ""}: ${f.message}`);
}

const PLANTS = [
  /^alignment p#plant-cut "Billed monthly[^"]*": "Billed monthly[^"]*" is cut off: it needs \d+px wide and has 160px, so it ends in "…"\. Let it wrap/,
  /^alignment div\.echo-hw "Choose 3": 3 cards side by side have their actions at 3 heights \(\d+px, \d+px, \d+px from the top of the row\)\. Line them up at the bottom of their cards/,
  /^alignment div\.echo-hw "Book it": "Book it" sits \d+px from where the rest of its column starts, and isn't centred in it either\. Start it where the content starts/,
  /^alignment div#plant-empty: this grid puts 2 items in [34] columns, leaving \d+px of the row empty at the end\. Let the items share the row/,
  /^depth button#plant-glow "Glowing": this button glows at rest \(14px of #[0-9a-f]{6} around it\), though nothing about it is lit/,
  /^depth div#plant-stack "Inner panel": a raised surface sits on another raised surface \(div "Inner panel"\) with no well between/,
  /^corners div "Tile": 3 parts of one kind side by side have different corners: this one is 4px and the rest 12px\. Give it the same corner as the others, 12px/,
  /^corners div#plant-nested "Nested": its top-left corner is 20px inside a 20px corner 4px away, so the two curves don't run side by side\. Make it 16px/,
  /^icons svg: the icons in this navigation are different sizes: "Size 3"'s is 24px and the rest 16px\. Make it 16px/,
  /^icons svg: "Stroke 3"'s icon is drawn 2\.3px thick and the rest in this list 1\.3px\./,
  /^icons svg: "Style 3"'s icon is filled and the rest in this list are outlined\. Use the outlined one/,
];

test("the design tests find every planted problem, with its numbers, and nothing on parts used properly", async ({ page }) => {
  await page.addInitScript({ content: script });
  const said = await designOn(page, "/checks/design");
  const all = said.join("\n");
  for (const plant of PLANTS) expect(said.some((s) => plant.test(s)), `${plant}\n\nsaid:\n${all}`).toBe(true);
  expect(said, all).toHaveLength(PLANTS.length);
  // Every one ends by saying what to leave alone.
  for (const s of said) expect(s, s).toMatch(/Change only/);
});

/** Echo's own screens: every gallery page, and every component's docs page. */
const GALLERY = readdirSync(fileURLToPath(new URL("../apps/www/app/gallery", import.meta.url)), { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => `/gallery/${e.name}`);

test("Echo's own gallery and docs pass the design tests", async ({ page }) => {
  await page.goto("/docs/components");
  const hrefs = await page.getByTestId("component-index").locator('a[href^="/docs/"]').evaluateAll((els) => els.map((el) => el.getAttribute("href") ?? ""));
  const paths = [...GALLERY, ...new Set(hrefs.filter((h) => h.length > "/docs/".length))];
  expect(paths.length).toBeGreaterThan(30);
  budgetPages(paths.length, 3_000);
  await page.addInitScript({ content: script });
  const said: string[] = [];
  for (const path of paths) for (const s of await designOn(page, path)) said.push(`${path}  ${s}`);
  expect(said, said.join("\n")).toEqual([]);
});

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
type Ran = Awaited<ReturnType<typeof runPageTests>>[number];
/** A finding as `rule selector`: axe's by their axe rule. */
const named = (r: Ran) => r.findings.map((f) => `${f.rule === "axe" ? f.axe.id : f.rule} ${f.selector ?? f.where}`);

test("axe in the page tests finds the eleven planted mistakes it can, each with its rule, and a control with no name is said once", async ({ baseURL, browserName }) => {
  test.skip(browserName !== "chromium", "drives a browser of its own");
  const [result] = await runPageTests({ root: repoRoot, base: baseURL!, routes: ["/checks/axe"], report: false });
  expect(result!.error).toBeUndefined();
  const said = named(result!).sort();
  const all = said.join("\n");
  const PLANTS: [string, RegExp][] = [
    ["aria-hidden-focus", /^#plant-hidden /],
    ["aria-valid-attr-value", /^#plant-expanded /],
    ["aria-required-parent", /^#plant-tab /],
    ["list", /^#plant-list /],
    ["target-size", /^#plant-target > button:nth-of-type\(1\)$/],
    ["target-size", /^#plant-target > button:nth-of-type\(2\)$/],
    ["image-alt", /^#plant-img /],
    ["frame-title", /^#plant-frame /],
    ["autocomplete-valid", /^#plant-autocomplete /],
    ["meta-viewport", /^html > head > meta/],
    ["html-has-lang", /^html$/],
    ["document-title", /^html$/],
    // Echo's `name` says it; axe's button-name on the same element is dropped.
    ["name", /^#plant-unnamed > button$/],
  ];
  for (const [rule, at] of PLANTS) expect(said.some((s) => s.startsWith(`${rule} `) && at.test(s.slice(rule.length + 1))), `${rule} ${at}\n\nsaid:\n${all}`).toBe(true);
  expect(said, all).toHaveLength(PLANTS.length);
  expect(new Set(result!.findings.filter((f) => f.rule === "axe").map((f) => (f.rule === "axe" ? f.axe.id : "")))).toHaveProperty("size", 11);
  // The iframe is named for a person to check: axe doesn't look inside it.
  expect(result!.review.map((r) => `${r.kind} ${r.where}`)).toEqual(["frame iframe"]);
});

test("Echo's own gallery and docs pass axe in the page tests", async ({ page, browserName, baseURL }) => {
  test.skip(browserName !== "chromium", "drives a browser of its own");
  await page.goto("/docs/components");
  const hrefs = await page.getByTestId("component-index").locator('a[href^="/docs/"]').evaluateAll((els) => els.map((el) => el.getAttribute("href") ?? ""));
  const paths = [...GALLERY, ...new Set(hrefs.filter((h) => h.length > "/docs/".length))];
  expect(paths.length).toBeGreaterThan(30);
  budgetPages(paths.length, 4_000);
  const results = await runPageTests({ root: repoRoot, base: baseURL!, routes: paths, report: false });
  const said = results.flatMap((r) => [
    ...(r.error ? [`${r.route}  ${r.error}`] : []),
    ...r.findings.filter((f) => f.rule === "axe").map((f) => `${r.route}  ${f.where}: ${f.message}`),
    ...r.review.filter((item) => item.kind === "axe").map((item) => `${r.route}  ${item.message}`),
  ]);
  expect(said, said.join("\n")).toEqual([]);
});
