/**
 * Takes the Playwright fixture routes out of the static export, and refuses to
 * hand over an export with no registry in it.
 *
 * `/e/` — the contract `npx echo-ui-cli` installs from, with "once a URL is
 * public, it stays" attached — is served as a folder inside the docs site's
 * static export. One `wrangler deploy` ships the marketing homepage, the
 * guides, the registry, and whatever else `app/` happens to contain. That
 * coupling is accepted deliberately; this script removes the part of it
 * that was not theoretical.
 *
 * WHAT IS A FIXTURE, AND WHAT ONLY LOOKS LIKE ONE. Five route families look
 * like fixtures. Three of them are product: `/gallery/*` is the group
 * overview every component page links to, and `/audition` and `/tactile` are
 * TOP-LEVEL NAV ITEMS ("Sound", "Tactile") that two guides send readers to.
 * Removing those would have published four dead links to fix an exposure
 * problem they do not have. What is left is genuinely scaffolding: `/checks/*`
 * exists for the RSC conformance specs, and `/stress` says so in its own file
 * — "a test fixture, not documentation: it is `noindex`, it is not in the
 * nav". `fixture-routes.test.ts` holds both halves of that line in place.
 *
 * Playwright is unaffected: it drives `next build` + `next start`, never the
 * static export, so the fixtures are still there for the tests that need them.
 */
import { execFileSync } from "node:child_process";
import { readFile, rm, stat } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { EXPORTED_FIXTURES } from "./fixture-routes.mjs";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/*
 * Only routes the repository tracks are published. A page kept locally and
 * out of git (an experiment, a tool page) is still a route to `next build`,
 * so it would ship with the next deploy from that machine. Refuse instead.
 */
try {
  const stray = execFileSync(
    "git",
    ["status", "--porcelain", "--ignored", "--untracked-files=all", "--", "app"],
    { cwd: appRoot, encoding: "utf8" },
  )
    .split("\n")
    .filter((line) => line.startsWith("??") || line.startsWith("!!"))
    .map((line) => line.slice(3))
    // A dotfile (.DS_Store) is never a route.
    .filter((path) => !path.split("/").at(-1).startsWith("."));
  if (stray.length) {
    console.error(
      `prune-fixtures: files under apps/www/app that git doesn't track would be published:\n  ${stray.join("\n  ")}\n` +
        "Move them out of app/ (or commit them), then build again.",
    );
    process.exit(1);
  }
} catch (error) {
  if (error.status !== undefined) throw error;
  console.warn("prune-fixtures: git isn't available here, so untracked routes can't be checked");
}

/*
 * `out/` is what `wrangler.jsonc` deploys, so it is the default and the only
 * one that matters in production. But a verification build runs with
 * NEXT_DIST_DIR set, and Next writes the export into that directory instead.
 * `build:static` runs this in the build's own environment, so it follows the
 * variable to the export it just built; before, it pruned whatever stale
 * `out/` was lying around and left the fixtures in the new one.
 * An argument still names a directory outright.
 */
const out = resolve(appRoot, process.argv[2] ?? process.env.NEXT_DIST_DIR ?? "out");

const exists = (path) => stat(path).then(() => true, () => false);

if (!(await exists(out))) {
  console.error(`prune-fixtures: ${out} does not exist — run the static export first`);
  process.exit(1);
}

/*
 * In the one place this script can own it: an export whose registry is
 * missing or unparseable must not become a deploy. The check that production
 * is serving it afterwards is the smoke check's (`registry/scripts/smoke.ts`).
 */
const index = join(out, "e", "index.json");
if (!(await exists(index))) {
  console.error(
    "prune-fixtures: the export has no e/index.json — `pnpm build:registry` before building the site",
  );
  process.exit(1);
}
try {
  const parsed = JSON.parse(await readFile(index, "utf8"));
  if (!Array.isArray(parsed.items) || parsed.items.length === 0) {
    throw new Error("index.json lists no items");
  }
} catch (error) {
  console.error(`prune-fixtures: e/index.json is not a usable registry index — ${error.message}`);
  process.exit(1);
}

const removed = [];
for (const route of EXPORTED_FIXTURES) {
  for (const path of [join(out, route), join(out, `${route}.html`), join(out, `${route}.txt`)]) {
    if (await exists(path)) {
      await rm(path, { recursive: true, force: true });
      removed.push(path.slice(out.length + 1));
    }
  }
}

console.log(
  removed.length
    ? `prune-fixtures: removed ${removed.length} fixture path(s) — ${removed.join(", ")}`
    : "prune-fixtures: nothing to remove (the export has no fixture routes)",
);
