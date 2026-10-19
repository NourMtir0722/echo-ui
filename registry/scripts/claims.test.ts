import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { CLAIMS, CONFORMANCE_OPEN, HEADLINE, PROMISE } from "../src/agent/guidance";

/**
 * What Echo claims is said in one wording, in guidance.ts. The installation
 * page renders it; the README can't import it, so this holds the README to it
 * word for word. When the conformance record changes (a screen-reader pass
 * lands, a limit comes off), the accessibility claim changes with it, and this
 * fails until the README does too.
 */
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const flat = (text: string) => text.replace(/\s+/g, " ");

test("the README says Echo's two sentences and every claim, in the one wording", () => {
  const readme = flat(readFileSync(resolve(repoRoot, "README.md"), "utf8"));
  assert.ok(readme.includes(`> ${HEADLINE} ${PROMISE}`), "the two sentences lead the README");
  for (const claim of CLAIMS) {
    assert.ok(readme.includes(flat(`**${claim.title}** ${claim.text}`)), `the README says: ${claim.title}`);
  }
  for (const limit of CONFORMANCE_OPEN) assert.ok(readme.includes(limit), `the README says what isn't covered: ${limit}`);
});

test("the installation page renders the claims from the source", () => {
  const page = readFileSync(resolve(repoRoot, "apps/www/app/docs/(guides)/installation/content.mdx"), "utf8");
  assert.match(page, /<Claims \/>/);
});
