/**
 * The sitemap is read off the static export (`apps/www/scripts/sitemap.mjs`),
 * so what's tested here is the reading: every page the export serves, at the
 * path it's served at, and nothing that isn't a page. And that it's wired in:
 * `build:static` writes it after the prune, and robots.txt names it.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { exportedPages, sitemapXml } from "../../apps/www/scripts/sitemap.mjs";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

test("the sitemap lists every page the export serves, and nothing that isn't one", async () => {
  const out = mkdtempSync(join(tmpdir(), "echo-sitemap-"));
  try {
    const files = ["index.html", "404.html", "_not-found.html", "docs.html", "docs/switch.html", "docs/switch.txt", "gallery/controls.html", "support/index.html", "_next/static/x.html", "e/index.json", "sitemap.xml"];
    for (const file of files) {
      mkdirSync(dirname(join(out, file)), { recursive: true });
      writeFileSync(join(out, file), "");
    }
    assert.deepEqual(await exportedPages(out), ["/", "/docs", "/docs/switch", "/gallery/controls", "/support"]);
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
  const xml = sitemapXml("https://example.test/", ["/", "/docs/a&b"]);
  assert.match(xml, /^<\?xml version="1\.0" encoding="UTF-8"\?>\n<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/);
  assert.match(xml, /<loc>https:\/\/example\.test\/<\/loc>/);
  assert.match(xml, /<loc>https:\/\/example\.test\/docs\/a&amp;b<\/loc>/);
});

test("the static build writes the sitemap after the prune, and robots.txt names it", () => {
  const scripts = JSON.parse(readFileSync(join(repoRoot, "apps/www/package.json"), "utf8")).scripts;
  assert.match(scripts["build:static"], /prune-fixtures\.mjs && node scripts\/sitemap\.mjs/, "after the prune, so no fixture is listed");
  const robots = readFileSync(join(repoRoot, "apps/www/app/robots.ts"), "utf8");
  assert.match(robots, /sitemap: `\$\{REGISTRY_HOMEPAGE\}\/sitemap\.xml`/);
});
