import { test } from "node:test";
import assert from "node:assert/strict";
import { appendFile, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { appRoutes, candidateUrls, changedFiles, pageFiles, pagesRouteOf, portOf, readTestSettings, routeOf, TestSettingsError, touchedRoutes } from "./app";

/**
 * How the design tests find the app: its pages from its routes, where it runs
 * from its dev script, and which pages a change touched.
 */
async function project(files: Record<string, string>): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "echo-app-"));
  for (const [path, text] of Object.entries(files)) {
    await mkdir(dirname(join(root, path)), { recursive: true });
    await writeFile(join(root, path), text);
  }
  return root;
}

test("an App Router page's route: groups drop out, and what needs filling in has none", () => {
  assert.equal(routeOf([]), "/");
  assert.equal(routeOf(["pricing"]), "/pricing");
  assert.equal(routeOf(["(marketing)", "about", "team"]), "/about/team");
  assert.equal(routeOf(["blog", "[slug]"]), undefined);
  assert.equal(routeOf(["@modal", "login"]), undefined);
  assert.equal(routeOf(["_drafts", "x"]), undefined);
});

test("a Pages Router file's route: index is its folder, and _app, api and [id] aren't pages to visit", () => {
  assert.equal(pagesRouteOf("index.tsx"), "/");
  assert.equal(pagesRouteOf("pricing.tsx"), "/pricing");
  assert.equal(pagesRouteOf("docs/index.mdx"), "/docs");
  assert.equal(pagesRouteOf("_app.tsx"), undefined);
  assert.equal(pagesRouteOf("api/hello.ts"), undefined);
  assert.equal(pagesRouteOf("users/[id].tsx"), undefined);
});

test("the app's pages come from its routes, and echo.json's list wins", async () => {
  const root = await project({
    "app/page.tsx": "",
    "app/layout.tsx": "",
    "app/(site)/pricing/page.tsx": "",
    "app/blog/[slug]/page.tsx": "",
    "app/components/card.tsx": "",
    "src/app/ignored/page.tsx": "",
  });
  try {
    assert.deepEqual(await appRoutes(root, "next", {}), ["/", "/pricing"]);
    assert.deepEqual((await pageFiles(root, "next")).map((p) => p.file), ["app/page.tsx", "app/(site)/pricing/page.tsx"]);
    assert.deepEqual(await appRoutes(root, "next", { routes: ["/blog/hello"] }), ["/blog/hello"]);
    // A Vite app's routes live in its code: its home is the page.
    assert.deepEqual(await appRoutes(root, "vite", {}), ["/"]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("the app is where its dev script says, else the framework's port", async () => {
  assert.equal(portOf("next dev -p 3300"), 3300);
  assert.equal(portOf("next dev --webpack --port 3502"), 3502);
  assert.equal(portOf("vite --port=5174"), 5174);
  assert.equal(portOf("PORT=4000 node server.js"), 4000);
  assert.equal(portOf("next dev"), undefined);
  const root = await project({ "package.json": JSON.stringify({ scripts: { dev: "next dev -p 3300" } }) });
  try {
    assert.deepEqual(await candidateUrls(root, "next", {}), ["http://localhost:3300", "http://localhost:3000"]);
    assert.deepEqual(await candidateUrls(root, "next", { url: "http://localhost:8080" }), ["http://localhost:8080"]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("a change touches its own page, every page when it's shared, and none when nobody sees it", () => {
  const pages = [
    { file: "app/page.tsx", route: "/" },
    { file: "app/pricing/page.tsx", route: "/pricing" },
  ];
  const all = ["/", "/pricing"];
  assert.deepEqual(touchedRoutes(["app/pricing/page.tsx"], pages, all), ["/pricing"]);
  assert.deepEqual(touchedRoutes(["app/components/card.tsx"], pages, all), all);
  assert.deepEqual(touchedRoutes(["app/globals.css", "app/pricing/page.tsx"], pages, all), all);
  assert.deepEqual(touchedRoutes(["README.md", "package.json", "tests/home.spec.ts", "app/card.test.tsx"], pages, all), []);
});

/**
 * `git status --porcelain` names files from the repository's root,
 * and the app's pages are named from the app's folder. In a monorepo, with the
 * app in `apps/web`, an edit to one page never matched its route: every change
 * read as a shared one, and the Stop gate tested the first pages of the whole
 * app, which needn't include the one that changed.
 */
test("in a monorepo, a change to one page touches that page", async () => {
  const repo = await project({
    "apps/web/package.json": "{}",
    "apps/web/app/page.tsx": "export default () => null;\n",
    "apps/web/app/about/page.tsx": "export default () => null;\n",
    "packages/ui/button.tsx": "export const B = () => null;\n",
  });
  const git = (...args: string[]) => execFileSync("git", ["-c", "user.name=Echo", "-c", "user.email=echo@example.com", ...args], { cwd: repo, stdio: "ignore" });
  try {
    git("init", "-q");
    git("add", "-A");
    git("commit", "-qm", "init");
    const root = join(repo, "apps/web");
    await appendFile(join(root, "app/about/page.tsx"), "// changed\n");
    const changed = await changedFiles(root);
    assert.deepEqual(changed, ["app/about/page.tsx"]);
    const pages = await pageFiles(root, "next");
    assert.deepEqual(touchedRoutes(changed!, pages, ["/", "/about"]), ["/about"]);

    // A change outside the app, in a package it may share, still counts for every page.
    await appendFile(join(repo, "packages/ui/button.tsx"), "// changed\n");
    assert.deepEqual(touchedRoutes((await changedFiles(root))!, pages, ["/", "/about"]), ["/", "/about"]);
  } finally {
    await rm(repo, { recursive: true, force: true });
  }
});

test("echo.json's test is checked, and says what it takes", () => {
  assert.deepEqual(readTestSettings(undefined), {});
  assert.deepEqual(readTestSettings({ url: "http://localhost:3000/", routes: ["/"], widths: [390, 1280], stop: false }), {
    url: "http://localhost:3000",
    routes: ["/"],
    widths: [390, 1280],
    stop: false,
  });
  assert.throws(() => readTestSettings({ routes: ["pricing"] }), TestSettingsError);
  assert.throws(() => readTestSettings({ url: "localhost:3000" }), TestSettingsError);
  assert.throws(() => readTestSettings({ widths: [10] }), TestSettingsError);
  assert.throws(() => readTestSettings({ pages: [] }), /it takes `url`, `routes`, `widths` and `stop`/);
});
