import { test, expect } from "@playwright/test";
import { budgetPages } from "./helpers/budget";
import { axe } from "./axe";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { CORE_MODULES } from "../registry/src/agent/core-modules";
import { CLI_RELEASED, PRERELEASE_HEADLINE } from "../registry/src/agent/guidance";

/** Doc slugs of the echo-ui-core modules: installed from npm, not the registry. */
const CORE_SLUGS = new Set(CORE_MODULES.map((m) => m.name.replace(/^echo-/, "")));

/**
 * Docs coverage. Every registry item gets a page, and
 * every page has to actually render its component.
 *
 * The route list is SCRAPED from the docs index rather than hardcoded here:
 * both the index and the routes come from one manifest, so a new item shows
 * up in this suite automatically. A hand-maintained list is exactly how the
 * METAS array and console.spec's PAGES list each went stale.
 */
async function docSlugs(page: import("@playwright/test").Page): Promise<string[]> {
  await page.goto("/docs/components");
  const hrefs = await page.getByTestId("component-index").locator('a[href^="/docs/"]').evaluateAll((els) =>
    els.map((el) => (el as HTMLAnchorElement).getAttribute("href") ?? ""),
  );
  const slugs = [...new Set(hrefs.map((h) => h.replace("/docs/", "")).filter(Boolean))];
  expect(slugs.length).toBeGreaterThan(20); // the index is not silently empty
  return slugs;
}

/**
 * The guide routes, read from the directory that defines them — so a guide
 * page that exists is swept even if nothing links to it yet.
 */
const GUIDES_DIR = fileURLToPath(new URL("../apps/www/app/docs/(guides)", import.meta.url));
const GUIDE_PATHS = [
  "/docs",
  ...readdirSync(GUIDES_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory() && existsSync(join(GUIDES_DIR, e.name, "content.mdx")))
    .map((e) => `/docs/${e.name}`),
].sort();

/**
 * The home, generator, tactile, audition, support and supporters pages are the
 * ones no gallery spec drives, and that is how #857B70 (4.45:1 on the #16121A
 * ground — under AA) survived on all four after being fixed across the docs
 * surface.
 */
for (const path of ["/", "/generator", "/tactile", "/audition", "/support", "/supporters", "/supporters/welcome"]) {
  test(`is axe-clean: ${path}`, { tag: "@mobile" }, async ({ page }) => {
    await page.goto(path);
    // The island writes its plot labels once it has drawn: check them too, every time, not only when it's quick.
    if (path === "/supporters") await expect(page.locator(".sw-island")).toHaveAttribute("data-state", /ready|failed/, { timeout: 30_000 });
    const results = await axe(page).analyze();
    expect(results.violations).toEqual([]);
  });
}

test("the component index links every documented item exactly once", async ({ page }) => {
  await page.goto("/docs/components");
  const hrefs = await page.getByTestId("component-index").locator('a[href^="/docs/"]').evaluateAll((els) =>
    els.map((el) => (el as HTMLAnchorElement).getAttribute("href") ?? ""),
  );
  expect(hrefs.length).toBe(new Set(hrefs).size);
});

test("every doc page renders its component and install line", async ({ page }) => {
  const slugs = await docSlugs(page);
  budgetPages(slugs.length);
  const broken: string[] = [];

  for (const slug of slugs) {
    await page.goto(`/docs/${slug}`);

    const heading = page.locator("h1");
    if ((await heading.count()) !== 1 || !(await heading.first().innerText())) {
      broken.push(`${slug}: no title`);
      continue;
    }

    // A preview that rendered nothing is the failure this suite exists to catch.
    const previewChildren = await page.getByTestId("preview").locator("> *").count();
    if (previewChildren === 0) broken.push(`${slug}: empty preview`);

    // Core modules ship in the echo-ui-core package; everything else is copied
    // from the registry (this expected a registry line on every page).
    const install = await page.getByTestId("install").locator("pre").innerText();
    const expected = CORE_SLUGS.has(slug) ? "npm install echo-ui-core" : `npx echo-ui-cli add ${slug}`;
    if (!install.includes(expected)) broken.push(`${slug}: install line should contain "${expected}"`);
  }

  expect(broken).toEqual([]);
});

/**
 * The site advertises `npx echo-ui-cli`, and that name on npm is a
 * reservation stub with no `bin`. `release-state.test.ts` proves the sources
 * carry the notice; this proves a reader actually meets it, on every surface
 * that shows a command — which is the part that was wrong in production.
 *
 * Driven off the same scraped slug list as the rest of this file, so a new
 * component page cannot quietly ship a command with no caveat on it.
 */
test("every surface that shows an install command shows the pre-release notice", async ({ page }) => {
  // Inside the test, not at file scope: a file-scope skip takes the whole
  // suite with it, and the day Echo ships is not the day to stop checking
  // that every doc page renders its component.
  test.skip(CLI_RELEASED, "Echo has shipped; there is no pre-release notice to find");
  const slugs = await docSlugs(page);
  const surfaces = ["/", "/docs/installation", "/docs/cli", ...slugs.map((s) => `/docs/${s}`)];
  budgetPages(surfaces.length);
  const silent: string[] = [];

  for (const path of surfaces) {
    await page.goto(path);
    const note = page.getByRole("note", { name: PRERELEASE_HEADLINE });
    if ((await note.count()) === 0 || !(await note.first().isVisible())) silent.push(path);
  }

  expect(silent, "these show a command that cannot work, with nothing saying so").toEqual([]);
});

test("every doc page is axe-clean", { tag: "@mobile" }, async ({ page }) => {
  const slugs = await docSlugs(page);
  const violations: string[] = [];

  // The guides are part of the docs surface, so sweep them too.
  const paths = [...GUIDE_PATHS, ...slugs.map((s) => `/docs/${s}`)];

  // One axe pass per page, and the page count only grows: a flat 30s budget is
  // what timed this sweep out on CI once the docs passed ~55 items. Budget per
  // page instead, so adding a component can never fail this test by itself.
  // Every page it visits counts, guides included, and at CI's pace: about 2s
  // a page there against 0.5s locally, so 1.5s a page ran out.
  test.setTimeout(30_000 + paths.length * 4_000);

  for (const path of paths) {
    const slug = path.replace("/docs/", "") || "index";
    await page.goto(path);
    const results = await axe(page).analyze();
    for (const v of results.violations) violations.push(`${slug}: ${v.id} (${v.nodes.length})`);
  }

  expect(violations).toEqual([]);
});

/**
 * Prop tables.
 *
 * The table is walked out of each meta's zod schema by the same function that
 * builds the agent catalog, so these assertions are really about one thing:
 * a component whose schema goes missing must fail here rather than quietly
 * render a doc page with no API on it — which is the state all 43 items were
 * in before, and 9 of them still were until the schemas were written.
 */
test("every doc page documents its props", async ({ page }) => {
  const slugs = await docSlugs(page);
  budgetPages(slugs.length);

  // The only two components whose props belong to Base UI rather than to Echo.
  // Tabulating a passthrough would restate Base UI's docs and go stale against
  // them, so these carry prose instead — and this list is the assertion that
  // no THIRD component quietly joins them by losing its schema.
  const PASSTHROUGH = ["tabs", "accordion"];
  const missing: string[] = [];
  const noTable: string[] = [];

  for (const slug of slugs) {
    await page.goto(`/docs/${slug}`);

    if ((await page.getByRole("heading", { name: "Props", exact: true }).count()) !== 1) {
      missing.push(slug);
      continue;
    }
    // One table per page, named by its caption — the row count is the schema's.
    const rows = await page.locator("table.echo-table tbody tr").count();
    if (rows === 0) noTable.push(slug);
  }

  expect(missing).toEqual([]);
  expect(noTable.sort()).toEqual([...PASSTHROUGH].sort());
});

test("a prop table carries the type, the default and the required mark", async ({ page }) => {
  await page.goto("/docs/hardware-button");

  // Named by the caption, so this asserts the accessible name too.
  const table = page.getByRole("table", { name: "HardwareButton props" });
  await expect(table).toBeVisible();

  const variant = table.locator("tbody tr").filter({ hasText: "variant" }).first();
  await expect(variant).toContainText('"primary" | "neutral" | "ghost"');
  await expect(variant).toContainText('"neutral"');

  // A required prop announces the word, not the decorative asterisk.
  await page.goto("/docs/lcd-chip");
  const value = page
    .getByRole("table", { name: "LcdChip props" })
    .locator("tbody tr")
    .filter({ hasText: "value" })
    .first();
  await expect(value).toContainText("required");
});

/**
 * A prop's description is the meta's own words, and its code is in
 * backticks there, as everywhere else on the page. The table printed them
 * literally ("Used only when `label` is omitted"), the one place the docs read
 * as source rather than prose.
 */
test("a prop's description shows its code as code, not backticks", async ({ page }) => {
  await page.goto("/docs/field");
  const table = page.getByRole("table", { name: "Field props" });
  const about = table.locator("tbody tr").filter({ has: page.locator("code.doc-prop__name", { hasText: /^aria-label$/ }) }).locator(".doc-prop__about");
  await expect(about).toHaveText("Used only when label is omitted; a visible label wins.");
  await expect(about.locator("code")).toHaveText("label");
  expect(await table.locator(".doc-prop__about").allInnerTexts()).not.toContainEqual(expect.stringContaining("`"));
});

test("a passthrough component says why it has no table", async ({ page }) => {
  await page.goto("/docs/tabs");
  await expect(page.locator("table.echo-table")).toHaveCount(0);
  await expect(page.getByText(/Compound API with one prop of its own/)).toBeVisible();
});

/**
 * The component page template. Tabs is the first item
 * with every docs field written, so it is the page that shows all sections.
 */
test("a fully documented page has every section, in the template's order", async ({ page }) => {
  await page.goto("/docs/tabs");
  const headings = await page.locator("article h2:not(.doc-sr-only)").allInnerTexts();
  expect(headings.map((h) => h.toLowerCase())).toEqual([
    "installation",
    "at a glance",
    "usage",
    "composition",
    "examples",
    "accessibility",
    "motion & sound",
    "props",
    "anti-patterns",
    // Tabs is named in CHANGELOG.md, so its entries follow.
    "changelog",
  ]);
  await expect(page.getByText(/^Feel/)).toBeVisible();
});

/**
 * The fact card: what an item weighs and needs, and its keys, before anyone
 * reads further. Weight is measured when the registry is built, so the card
 * is the built catalog's.
 */
test("a component page opens with its fact card: weight, what it needs, its keys", async ({ page }) => {
  await page.goto("/docs/switch");
  const card = page.getByRole("region", { name: "At a glance" });
  await expect(card.getByRole("definition").filter({ hasText: /KB/ }).first()).toContainText(/\d+(\.\d)? KB with what it imports/);
  await expect(card.getByText("Needs", { exact: true })).toBeVisible();
  await expect(card.getByText("@base-ui/react", { exact: false })).toBeVisible();
  await expect(card.getByText("Keyboard", { exact: true })).toBeVisible();
  await expect(card.getByText("Space toggles it", { exact: false })).toBeVisible();
});

test("a section whose meta field is unset is left out, not shown empty", async ({ page }) => {
  // Divider has no motion and no sound fields.
  await page.goto("/docs/divider");
  await expect(page.getByRole("heading", { name: "Usage", exact: true })).toHaveCount(1);
  await expect(page.getByRole("heading", { name: "Motion & sound", exact: true })).toHaveCount(0);
});

/**
 * Changelog used to be the second half of the test above, on the strength of
 * "Divider has no CHANGELOG entry naming it". That stopped being true of any
 * item when entries began declaring what they change: an entry that says
 * `items: all` — the reflow pass, the token migration — now lands on every
 * component page, where before it landed on none, because attribution was
 * "does the prose mention this name in backticks" and a library-wide entry
 * mentions nobody.
 *
 * Showing it is the point. A change that reached Divider belongs on Divider's
 * page, and a reader should not have to infer it from the library changelog.
 */
test("a library-wide changelog entry reaches every component's page", async ({ page }) => {
  await page.goto("/docs/divider");
  await expect(page.getByRole("heading", { name: "Changelog", exact: true })).toHaveCount(1);
  await expect(page.getByText(/reflows into a 320px screen/)).toBeVisible();
});

test("Preview / Code switches without losing the preview", async ({ page }) => {
  await page.goto("/docs/tabs");
  const preview = page.getByTestId("preview");
  await preview.getByRole("tab", { name: "Log" }).click();
  await page.getByRole("tab", { name: "Code" }).click();
  await expect(page.getByRole("tabpanel").filter({ hasText: 'import { Tabs } from "@/echo/tabs";' })).toBeVisible();
  await page.getByRole("tab", { name: "Preview", exact: true }).click();
  // Kept mounted: the tab picked inside the preview is still the open one.
  await expect(preview.getByRole("tab", { name: "Log" })).toHaveAttribute("aria-selected", "true");
});

test("Copy for AI agent copies the get_component record", async ({ page, context, browserName }) => {
  test.skip(browserName !== "chromium", "clipboard permissions are Chromium-only in Playwright");
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/docs/tabs");
  await page.getByRole("button", { name: "Copy for AI agent" }).click();
  await expect(page.getByRole("status").filter({ hasText: "copied as markdown" })).toBeAttached();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  // The same renderer as the MCP server: heading, install, then the page's sections.
  expect(copied).toContain("## Tabs (`echo-tabs`)");
  expect(copied).toContain("- Install: `npx echo-ui-cli add tabs`");
  expect(copied).toContain("### Usage");
  expect(copied).toContain("### Accessibility");
});

test("Manual install lists the dependencies and shows each file's source", async ({ page }) => {
  await page.goto("/docs/tabs");
  await page.getByRole("tab", { name: "Manual" }).click();
  const panel = page.getByRole("tabpanel").filter({ hasText: "npm install" });
  // The theme comes from the echo-ui-core package now, not as copied files
  // with a link to their page.
  // gsap too: the lit rail is a part that travels (the liquid engine).
  await expect(panel).toContainText("npm install @base-ui/react gsap echo-ui-core");
  await expect(panel.getByRole("link", { name: "echo-theme" })).toHaveCount(0);
  // The source comes from /e/tabs.json — byte for byte what the CLI writes,
  // at the path it writes it to inside the project's Echo folder.
  await expect(panel.getByText("tabs/tabs.tsx", { exact: true })).toBeVisible();
  await expect(panel.locator("pre").filter({ hasText: "BaseTabs.Root" })).toBeVisible();
});

/**
 * Known to fail now and then: in a full run, a docs page in WebKit sometimes
 * never reaches `load` (/docs/checkbox-group, /docs/field, /docs/content),
 * though each loads in under a second on its own. This loads
 * every docs page with the network watched and, on a stall, names what is
 * still pending: the evidence a fix needs. It only shows under the whole
 * suite's load, so it stays marked until that evidence is in.
 */
test.fixme("every docs page reaches load in WebKit, and a stall names what it waits on", async ({ page }) => {
  const slugs = await docSlugs(page);
  budgetPages(slugs.length);
  const pending = new Map<string, number>();
  page.on("request", (r) => pending.set(r.url(), Date.now()));
  page.on("requestfinished", (r) => pending.delete(r.url()));
  page.on("requestfailed", (r) => pending.delete(r.url()));
  const stalls: string[] = [];
  for (const slug of slugs) {
    pending.clear();
    try {
      await page.goto(`/docs/${slug}`, { timeout: 15_000 });
    } catch {
      stalls.push(`${slug}: ${[...pending].map(([url, at]) => `${new URL(url).pathname} (${Date.now() - at}ms)`).join(", ") || "nothing pending"}`);
    }
  }
  expect(stalls).toEqual([]);
});

/**
 * A markdown table on a guide page is a focusable scroll box. Every
 * one was a landmark called "Table", so a page with two had two landmarks with
 * the same name. They are named groups now, not landmarks.
 */
test("a table in prose is a named group, not another page landmark", async ({ page }) => {
  const boxesOn = async (slug: string) => {
    await page.goto(`/docs/${slug}`);
    return page.locator(".guide__table").evaluateAll((els) =>
      els.map((el) => ({ role: el.getAttribute("role"), name: el.getAttribute("aria-label") ?? "" })),
    );
  };

  // The two pages written with several markdown tables. The CLI page is where
  // this was found: three of its four tables have the same headers, so naming
  // them by their headers could never have made them unique landmarks.
  for (const slug of ["cli", "content"]) {
    const boxes = await boxesOn(slug);
    const prose = boxes.filter((b) => b.role === "group");
    expect(prose.length, `${slug}: markdown tables are landmarks again`).toBeGreaterThan(1);
    expect(prose.filter((b) => !b.name || b.name === "Table"), `${slug}: an unnamed table`).toEqual([]);
  }

  // The hand-labelled data tables that ARE landmarks still need distinct names.
  for (const slug of ["cli", "content", "motion-and-sound", "theming"]) {
    const names = (await boxesOn(slug)).filter((b) => b.role === "region").map((b) => b.name);
    expect(names.filter((n) => !n), `${slug}: an unnamed table landmark`).toEqual([]);
    expect(new Set(names).size, `${slug}: two table landmarks share a name`).toBe(names.length);
  }
});

/**
 * The five echo-ui-core modules kept a Manual tab after they left
 * `/r/`. It fetched `/r/echo-theme.json`, got a 404, and offered the
 * reader a link to it — instructions for copying files that are not copied.
 */
test("a core module offers no manual copy of files it does not ship", async ({ page }) => {
  budgetPages(CORE_SLUGS.size);
  for (const slug of CORE_SLUGS) {
    await page.goto(`/docs/${slug}`);
    const install = page.locator("#installation").locator("xpath=..");
    await expect(install.getByRole("tab", { name: "Manual" }), slug).toHaveCount(0);
    await expect(install, slug).toContainText("echo-ui-core");
    await expect(install, slug).not.toContainText("/r/");
  }
});

/**
 * This looked for "Unreleased", true only until the first release; after 0.3.0 the entries
 * are labelled with the release they're in. Each is labelled with one or the other.
 */
test("a page lists the CHANGELOG entries that name its item, each under its release", async ({ page }) => {
  await page.goto("/docs/chat");
  const section = page.locator("section").filter({ has: page.getByRole("heading", { name: "Changelog" }) });
  await expect(section).toContainText("echo-chat");
  await expect(section).toContainText(/v\d+\.\d+\.\d+ · \d{4}-\d{2}-\d{2}|Unreleased/);
});

/* ----------------------------------------------------------- guide pages --- */

test("the sidebar lists every guide page, and nothing else that is not a component", async ({ page }) => {
  const slugs = await docSlugs(page);
  await page.goto("/docs");
  const sidebar = page.getByRole("navigation", { name: "Components" }).first();
  const docLinks = await sidebar.locator('a[href^="/docs"]').evaluateAll((els) =>
    els.map((el) => (el as HTMLAnchorElement).getAttribute("href") ?? ""),
  );
  const components = new Set(slugs.map((s) => `/docs/${s}`));
  // What is left once the components are removed has to be exactly the guide directories.
  expect(docLinks.filter((h) => !components.has(h)).sort()).toEqual(GUIDE_PATHS);
});

test("every guide page renders with a title and a way on", async ({ page }) => {
  budgetPages(GUIDE_PATHS.length);
  const broken: string[] = [];
  for (const path of GUIDE_PATHS) {
    const response = await page.goto(path);
    if (response?.status() !== 200) broken.push(`${path}: HTTP ${response?.status()}`);
    if ((await page.locator("article h1").count()) !== 1) broken.push(`${path}: not one h1`);
    if ((await page.getByRole("navigation", { name: "Guides" }).locator("a").count()) === 0) {
      broken.push(`${path}: no pager`);
    }
  }
  expect(broken).toEqual([]);
});

// A fenced code block in the changelog showed its backticks.
test("the changelog page is CHANGELOG.md, with no markdown left showing", async ({ page }) => {
  await page.goto("/docs/changelog");
  const text = await page.locator("article").innerText();
  expect(text).toMatch(/Unreleased/i);
  // Brackets from link references, literal asterisks and backticks are the
  // renderer failing to cover something the changelog now uses.
  expect(text).not.toMatch(/\[Unreleased\]|\*\*|(^|\s)\*\w|`/m);
});

test("the guides print live values, not copies", async ({ page }) => {
  // The MCP page's tool table comes from the server's own TOOL_DEFINITIONS.
  await page.goto("/docs/mcp");
  const tools = page.getByRole("region", { name: "MCP tools" });
  for (const tool of ["search_components", "get_component", "get_tokens", "get_examples"]) {
    await expect(tools).toContainText(tool);
  }
  // The theming page has one swatch per colour role.
  await page.goto("/docs/theming");
  expect(await page.locator(".guide-swatch").count()).toBeGreaterThan(15);
  // Installation's echo.json is built from the registry's own homepage, so the
  // registry URL on the page is the one the CLI actually defaults to.
  await page.goto("/docs/installation");
  const config = page.locator("pre").filter({ hasText: '"registry":' });
  await expect(config).toHaveCount(1);
  await expect(config).toContainText("/e");
});

test("a component page links its install note to the setup section", async ({ page }) => {
  await page.goto("/docs/tabs");
  await page.getByRole("link", { name: "it sets the project up" }).click();
  await expect(page).toHaveURL(/\/docs\/installation#set-the-project-up$/);
  await expect(page.locator("#set-the-project-up")).toBeVisible();
});

/**
 * With no icon named in the page, a browser asks for /favicon.ico, gets a 404
 * and logs it as an error, on every page.
 */
test("every page names an icon the browser can load", async ({ page, request }) => {
  for (const path of ["/", "/docs"]) {
    await page.goto(path);
    const icon = page.locator('head link[rel~="icon"]');
    await expect(icon, `${path} names no icon`).not.toHaveCount(0);
    const res = await request.get((await icon.first().getAttribute("href"))!);
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toMatch(/^image\//);
  }
});

/**
 * A link to a section of a docs page lands on that section. The theming guide
 * sent readers to /docs/installation#inject-the-theme after the section had
 * been renamed "Import the theme": the page opened at its top, and the reader
 * was left to find it. Read from the server's HTML, where every heading's id
 * already is, over every page the docs sidebar lists.
 */
test("every link to a section of a docs page lands on a section that exists", async ({ request }) => {
  const index = await (await request.get("/docs")).text();
  const pages = [...new Set([...index.matchAll(/href="(\/docs(?:\/[\w-]+)?)"/g)].map((m) => m[1]!))];
  expect(pages.length).toBeGreaterThan(100);
  const html = new Map<string, string>();
  const load = async (path: string) => {
    if (!html.has(path)) html.set(path, await (await request.get(path)).text());
    return html.get(path)!;
  };
  const broken: string[] = [];
  for (const page of pages) {
    for (const [, target, id] of (await load(page)).matchAll(/href="(\/docs(?:\/[\w-]+)?)?#([^"]+)"/g)) {
      const path = target ?? page;
      if (!(await load(path)).includes(` id="${id}"`)) broken.push(`${page} → ${path}#${id}`);
    }
  }
  expect([...new Set(broken)]).toEqual([]);
});
