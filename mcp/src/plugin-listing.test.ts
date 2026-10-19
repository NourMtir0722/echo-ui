/**
 * Echo's plugin went live in ChatGPT's plugin directory, and the
 * plugin page and this package's README still said it wasn't in either
 * directory, sending a ChatGPT user to unzip a download and run Codex
 * commands instead of one click in the app. Where the plugin is listed, the
 * pages say so and link the listing; the downloads stay for everywhere else.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { CHATGPT_LISTING_URL } from "./plugin-downloads";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

const PLUGIN_PAGE = "../../apps/www/app/docs/(guides)/plugin/content.mdx";
const GUIDE_PARTS = "../../apps/www/components/guides/live.tsx";
const README = "../README.md";

test("no page says the plugin isn't in ChatGPT's directory", () => {
  for (const path of [PLUGIN_PAGE, README]) {
    assert.doesNotMatch(read(path), /(isn't|is not|before it's listed)[^.]*(ChatGPT's|either) director/i, path);
  }
});

test("the plugin page and the README link Echo's ChatGPT listing", () => {
  assert.match(CHATGPT_LISTING_URL, /^https:\/\/chatgpt\.com\/plugins\//);
  // The page's install table is PluginInstall, and it carries the listing.
  assert.match(read(PLUGIN_PAGE), /<PluginInstall \/>/);
  assert.match(read(GUIDE_PARTS), /href=\{CHATGPT_LISTING_URL\}/);
  assert.ok(read(README).includes(CHATGPT_LISTING_URL), README);
});
