import { test } from "node:test";
import assert from "node:assert/strict";

import { changelogRecorded, isShipped } from "../../scripts/check-changelog.mjs";

/**
 * The changelog gate covers everything a consumer installs.
 *
 * It was written when the registry was the only thing that shipped. The
 * packages became consumer artifacts of their own — `echo-ui-core` off npm,
 * `echo-ui-cli` through npx — and the list didn't follow them.
 */
test("a change to what a consumer installs needs a changelog line", () => {
  for (const file of [
    "registry/src/echo/segmented/segmented.tsx",
    "registry/registry.json",
    "mcp/src/server.ts",
    "mcp/package.json",
    "packages/core/src/theme.ts",
    "packages/core/package.json",
    "packages/cli/src/commands/add.ts",
    "packages/cli/package.json",
    "packages/client/src/index.ts",
  ]) {
    assert.equal(isShipped(file), true, file);
  }
});

test("tests, docs metadata and the site itself are not what ships", () => {
  for (const file of [
    "packages/cli/src/cli.test.ts",
    "packages/client/src/index.test.ts",
    "registry/src/echo/segmented/meta.ts",
    "registry/scripts/changelog.test.mjs",
    "apps/www/app/page.tsx",
    "PRINCIPLES.md",
  ]) {
    assert.equal(isShipped(file), false, file);
  }
});

/**
 * A release PR moves `[Unreleased]` under a dated heading and leaves
 * it empty, which is the changelog doing its job, and the check read it as
 * "not updated" and failed the release PR (#37) it exists to keep honest.
 */
test("a release cut counts as the changelog being kept; an untouched one still doesn't", () => {
  const log = (unreleased, ...released) =>
    ["# Changelog", "", "## [Unreleased]", "", unreleased, "", ...released.flatMap((v) => [`## [${v}] — 2026-10-12`, "", "### Fixed", "", "- x", ""])].join("\n");
  const before = log("### Fixed\n\n- a fix", "0.2.0");
  // The release: the entries move under 0.3.0's heading.
  assert.equal(changelogRecorded(before, log("", "0.3.0", "0.2.0")), true);
  // An ordinary change with a new line under [Unreleased].
  assert.equal(changelogRecorded(before, log("### Fixed\n\n- a fix\n- another", "0.2.0")), true);
  // Nothing written, or [Unreleased] emptied without a release to show for it.
  assert.equal(changelogRecorded(before, before), false);
  assert.equal(changelogRecorded(before, log("", "0.2.0")), false);
});
