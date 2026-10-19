import { test, expect, type Page } from "@playwright/test";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { gotoDev } from "./helpers/dev-server";

/**
 * `<EchoCheck />` from echo-ui-core/check, on /checks/page-check: one of each
 * problem it looks for, planted beside Echo parts used properly.
 *
 * The page check only exists in development, so these drive the DEV server, as
 * console.spec.ts does. The last test is the other half: a production build
 * of the same page carries none of it.
 */

/** Every plant on the page, as the console says it. Nothing else may be said. */
const PLANTS = [
  /^Echo check · setup: .*no SoundProvider above them/,
  /^Echo check · name: button#plant-unnamed: this button has no name/,
  /^Echo check · name: input#plant-unlabelled: this textbox has no name/,
  /^Echo check · contrast: p#plant-contrast "Too faint[^"]*": \d\.\d:1 /,
  /^Echo check · contrast: span "Hold": an engraved label, \d\.\d:1 .*Give the cap an icon or a caption/,
  /^Echo check · colour: div#plant-colour: #ff0000 \(background\) isn't one of this theme's colours/,
  /^Echo check · screen: .*"Send": Screen rule 2, one lit cap per decision: this form shows 2 primary caps \("Save", "Send"\)/,
  /^Echo check · screen: .*Screen rule 3, one "you are here": the page lights "you are here" 2 times \("Main" and "Tabs"\)/,
  /^Echo check · screen: input#plant-invalid "Code": Screen rule 9, state is said, not coloured/,
];

function listen(page: Page) {
  const said = { findings: [] as string[], summaries: [] as string[] };
  page.on("console", (m) => {
    const text = m.text();
    if (m.type() === "warning" && text.startsWith("Echo check · ")) said.findings.push(text);
    if (m.type() === "info" && text.startsWith("Echo check: ")) said.summaries.push(text);
  });
  return said;
}

async function open(page: Page, devBaseURL: string) {
  const said = listen(page);
  await gotoDev(page, `${devBaseURL}/checks/page-check`);
  await expect.poll(() => said.summaries.length, { timeout: 20_000 }).toBeGreaterThan(0);
  return said;
}

// The dev server compiles the route on first hit.
test.describe.configure({ timeout: 90_000 });

test("the page check finds every planted problem, and nothing on Echo's own parts", async ({ page }, testInfo) => {
  const said = await open(page, testInfo.config.metadata.devBaseURL as string);
  const all = said.findings.join("\n");
  for (const plant of PLANTS) expect(said.findings.some((f) => plant.test(f)), `${plant}\n\nsaid:\n${all}`).toBe(true);
  expect(said.findings, all).toHaveLength(PLANTS.length);
  expect(said.summaries[0]).toBe(`Echo check: ${PLANTS.length} to fix on this page.`);
});

/**
 * A disabled field's label and help sit beside its control, not in
 * it, so the page check measured them and asked for AA on text WCAG 1.4.3
 * exempts: it's part of an inactive control. What names or describes a
 * disabled control is as inactive as the control.
 */
test("a disabled field's label and help aren't held to AA", async ({ page }, testInfo) => {
  const said = await open(page, testInfo.config.metadata.devBaseURL as string);
  const all = said.findings.join("\n");
  expect(all).not.toContain("Account ID");
  expect(all).not.toContain("Set when the account was made.");
});

test("a fix is noticed: the finding goes, and the console says so", async ({ page }, testInfo) => {
  const said = await open(page, testInfo.config.metadata.devBaseURL as string);
  await page.evaluate(() => {
    document.getElementById("plant-colour")!.style.background = "var(--echo-accent)";
  });
  await expect
    .poll(() => said.summaries.at(-1), { timeout: 10_000 })
    .toBe(`Echo check: ${PLANTS.length - 1} to fix on this page, 1 fixed since the last look.`);
});

test("a page without its theme or its ground is told how to set up", async ({ page }, testInfo) => {
  const said = await open(page, testInfo.config.metadata.devBaseURL as string);
  await page.evaluate(() => {
    document.body.style.background = "transparent";
    document.documentElement.style.setProperty("--echo-surface", "initial");
  });
  await expect.poll(() => said.findings.some((f) => /^Echo check · setup: body: the page has no ground/.test(f)), { timeout: 10_000 }).toBe(true);
  expect(said.findings.some((f) => /^Echo check · setup: Echo's theme isn't on this page/.test(f))).toBe(true);
});

test("the overlay lists the findings, points at each, and closes on Escape", async ({ page }, testInfo) => {
  await open(page, testInfo.config.metadata.devBaseURL as string);
  const pill = page.locator("echo-check-overlay .pill");
  await expect(pill).toHaveText(`Echo check · ${PLANTS.length}`);
  await pill.click();
  await expect(pill).toHaveAttribute("aria-expanded", "true");
  const items = page.locator("echo-check-overlay .item");
  await expect(items).toHaveCount(PLANTS.length);
  await items.filter({ hasText: "#plant-colour" }).focus();
  await expect(page.locator("echo-check-overlay .box")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(pill).toHaveAttribute("aria-expanded", "false");
  await expect(pill).toBeFocused();
});

/**
 * The same page built for production: no page check running, and none of its code
 * in any chunk the build serves. The strings are the page check's own element
 * names, which nothing else on the site uses.
 */
test("a production build has none of the page check", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "one engine is enough to read the build");
  const messages: string[] = [];
  page.on("console", (m) => messages.push(m.text()));
  await page.goto("/checks/page-check", { waitUntil: "networkidle" });
  await expect(page.locator("#plant-colour")).toBeVisible();
  expect(await page.evaluate(() => Symbol.for("echo-ui-core.page-check") in globalThis)).toBe(false);
  expect(await page.locator("echo-check-overlay").count()).toBe(0);
  expect(messages.filter((m) => m.startsWith("Echo check"))).toEqual([]);

  const app = fileURLToPath(new URL("../apps/www", import.meta.url));
  const chunks = join(app, process.env.NEXT_DIST_DIR ?? ".next", "static");
  expect(existsSync(chunks), `no build at ${chunks}`).toBe(true);
  const files = (dir: string): string[] =>
    readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? files(join(dir, f)) : [join(dir, f)]));
  const carrying = files(chunks).filter(
    (f) => f.endsWith(".js") && /echo-check-overlay|echo-check-probe/.test(readFileSync(f, "utf8")),
  );
  expect(carrying).toEqual([]);
});
