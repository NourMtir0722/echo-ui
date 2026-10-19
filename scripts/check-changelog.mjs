#!/usr/bin/env node
/**
 * Docs freshness test D: a change to what the registry
 * ships needs a line in CHANGELOG.md's [Unreleased] section.
 *
 * Why it exists: a UI redesign, the new chat template, the host
 * rename and the MCP packaging all landed after 0.1.0 while [Unreleased]
 * still read "Nothing yet". Nobody decided to skip the changelog; nothing
 * asked.
 *
 * Usage: node scripts/check-changelog.mjs [base-ref]   (default: origin/main)
 * CI passes the PR's base. A PR labelled `skip-changelog` skips the step in
 * the workflow — use it for refactors a consumer cannot observe.
 */
import { execFileSync } from "node:child_process";
import { argv } from "node:process";
import { fileURLToPath } from "node:url";

/**
 * What ships to a consumer: registry item source and the manifest, the MCP
 * server, and the three packages — `echo-ui-core` off npm, `echo-ui-cli`
 * through npx, and the registry client the other two bundle. The packages were
 * missing while they became the main things a consumer installs.
 */
export const SHIPPED = [
  /^registry\/src\//,
  /^registry\/registry\.json$/,
  /^mcp\/src\//,
  /^mcp\/package\.json$/,
  /^packages\/(core|cli|client)\/src\//,
  /^packages\/(core|cli|client)\/package\.json$/,
];
/** Tests and docs metadata change nothing a consumer installs. */
export const IGNORED = [/\.test\.(ts|mjs)$/, /\/meta\.ts$/];

/** Whether a changed file is one a consumer will notice. */
export function isShipped(file) {
  return SHIPPED.some((r) => r.test(file)) && !IGNORED.some((r) => r.test(file));
}

/** The body of the [Unreleased] section, or "" if the file or section is missing. */
function unreleased(text) {
  const m = text.match(/^## \[Unreleased\]\s*\n([\s\S]*?)(?=^## \[)/m);
  return m ? m[1].trim() : "";
}

/** The released versions a changelog has headings for. */
const releases = (text) => new Set([...text.matchAll(/^## \[(\d+\.\d+\.\d+)\]/gm)].map((m) => m[1]));

/**
 * Whether this change wrote down what it did: a new line under [Unreleased],
 * or a release cut, which moves those lines under a dated heading and leaves
 * [Unreleased] empty on purpose.
 */
export function changelogRecorded(beforeText, afterText) {
  const before = unreleased(beforeText);
  const after = unreleased(afterText);
  const released = releases(beforeText);
  if ([...releases(afterText)].some((version) => !released.has(version))) return true;
  return !(after === before || after === "" || /^nothing yet\.?$/i.test(after));
}

/* Imported by its test; run only when it is the program. */
if (argv[1] && fileURLToPath(import.meta.url) === argv[1]) {
  main();
}

function main() {
  const base = process.argv[2] ?? process.env.CHANGELOG_BASE ?? "origin/main";
  const git = (...args) => execFileSync("git", args, { encoding: "utf8" });

  let changed;
  try {
    changed = git("diff", "--name-only", `${base}...HEAD`).split("\n").filter(Boolean);
  } catch {
    console.error(`check-changelog: cannot diff against "${base}". Fetch it first (CI needs fetch-depth: 0).`);
    process.exit(2);
  }

  const shipped = changed.filter(isShipped);
  if (shipped.length === 0) {
    console.log("check-changelog: no shipped files changed — nothing to record.");
    process.exit(0);
  }

  const read = (ref) => {
    try {
      return git("show", `${ref}:CHANGELOG.md`);
    } catch {
      return "";
    }
  };

  if (!changelogRecorded(read(base), read("HEAD"))) {
    console.error(
      [
        "check-changelog: this change ships to consumers but CHANGELOG.md's [Unreleased] section was not updated.",
        "",
        "Shipped files changed:",
        ...shipped.map((f) => `  ${f}`),
        "",
        "Add a line under ## [Unreleased] (Added / Changed / Fixed / Removed) saying what a consumer",
        "who re-adds these items will notice. If they will notice nothing, label the PR `skip-changelog`.",
      ].join("\n"),
    );
    process.exit(1);
  }

  console.log(`check-changelog: ${shipped.length} shipped file(s) changed, and CHANGELOG.md records it.`);
}
