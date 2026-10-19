/**
 * What the docs site publishes, and what it keeps for Playwright.
 *
 * `/e/` rides inside the docs site's static export, so
 * every route under `apps/www/app` is public product surface by default —
 * including the ones that exist only so a spec has something to drive. The
 * export now drops those. This holds the line in both directions, because both
 * directions are wrong:
 *
 * - a fixture that becomes linked is a published dead link after the prune;
 * - a linked page that gets added to the fixture list is a 404 on a route the
 *   nav still points at.
 *
 * Five route families look like fixtures. `/gallery`, `/audition` and `/tactile` are navigation — the last
 * two are top-level nav items — so they stay, and the test below is what makes
 * that a checked claim rather than a note in a file.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, existsSync, mkdtempSync, mkdirSync, writeFileSync, rmSync, copyFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { EXPORTED_FIXTURES, PUBLISHED_TOOLS } from "../../apps/www/scripts/fixture-routes.mjs";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const appDir = join(repoRoot, "apps/www/app");

test("both lists name routes that exist", () => {
  const missing = [...EXPORTED_FIXTURES, ...PUBLISHED_TOOLS].filter(
    (route) => !existsSync(join(appDir, route)),
  );
  assert.deepEqual(missing, [], "these routes are listed but no longer exist under apps/www/app");
});

test("a route is either published or a fixture, never both", () => {
  const both = EXPORTED_FIXTURES.filter((r) => PUBLISHED_TOOLS.includes(r));
  assert.deepEqual(both, [], "a route in both lists is linked AND deleted from the export");
});

/**
 * Where a reader could be sent from. The fixture pages themselves are excluded
 * — `/checks/forms` linking to `/checks/toast` is two fixtures talking to each
 * other, and neither is published.
 */
function linkingSources() {
  const tracked = execFileSync("git", ["ls-files", "apps/www"], { cwd: repoRoot, encoding: "utf8" })
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  return tracked.filter(
    (f) =>
      /\.(tsx?|mdx)$/.test(f) &&
      !EXPORTED_FIXTURES.some((route) => f.startsWith(`apps/www/app/${route}/`)) &&
      !f.startsWith("apps/www/scripts/"),
  );
}

/** `href="/stress"`, `](/checks/forms)`, `"/gallery/rtl"` — any literal route. */
const linksTo = (content, route) =>
  new RegExp(`["'(]/${route}(?:[/"')#?]|$)`, "m").test(content);

test("nothing published links to a route the export deletes", () => {
  const offenders = [];
  for (const file of linkingSources()) {
    const content = readFileSync(join(repoRoot, file), "utf8");
    for (const route of EXPORTED_FIXTURES) {
      if (linksTo(content, route)) offenders.push(`${file} → /${route}`);
    }
  }
  assert.deepEqual(
    offenders,
    [],
    "the static export removes these routes, so each of these is a published dead link",
  );
});

test("every route kept out of the fixture list is actually reachable", () => {
  const sources = linkingSources();
  const unreachable = PUBLISHED_TOOLS.filter(
    (route) =>
      !sources.some(
        (file) =>
          !file.startsWith(`apps/www/app/${route}/`) &&
          linksTo(readFileSync(join(repoRoot, file), "utf8"), route),
      ),
  );
  assert.deepEqual(
    unreachable,
    [],
    "nothing links to these, so they are fixtures after all — move them to EXPORTED_FIXTURES",
  );
});

/**
 * The prune only happens if the build runs it. Without this, deleting one word
 * from a package script silently republishes every fixture.
 */
test("the static export runs the prune", () => {
  const pkg = JSON.parse(readFileSync(join(repoRoot, "apps/www/package.json"), "utf8"));
  assert.match(
    pkg.scripts["build:static"] ?? "",
    /prune-fixtures/,
    "build:static no longer prunes, so `pnpm deploy:site` would publish the fixture routes",
  );
  assert.match(
    pkg.scripts["deploy:site"] ?? "",
    /build:static/,
    "deploy:site no longer goes through build:static, so it never prunes",
  );
});

/**
 * The prune, copied into a www of its own: a git with nothing in it and an
 * empty `app/`. Before it refuses, the prune asks git what's under `app/`.
 * Run in place, the test's answer was this machine's: a page someone keeps
 * there out of git (as the prune's own comment allows) failed it.
 */
function isolatedWww() {
  const www = mkdtempSync(join(tmpdir(), "echo-www-"));
  mkdirSync(join(www, "app"));
  mkdirSync(join(www, "scripts"));
  for (const file of ["prune-fixtures.mjs", "fixture-routes.mjs"]) {
    copyFileSync(join(repoRoot, "apps/www/scripts", file), join(www, "scripts", file));
  }
  execFileSync("git", ["init", "-q"], { cwd: www });
  return www;
}

/**
 * A verification build sets NEXT_DIST_DIR (so it can't disturb a
 * running dev server), and Next writes the export into that directory, not
 * `out/`. The prune has to follow it: it used to prune whatever stale `out/`
 * was lying around, say "nothing to remove", and leave the fixtures in the
 * export that had just been built.
 */
test("build:static prunes the export it just built, wherever NEXT_DIST_DIR put it (whatever this machine keeps in app/)", () => {
  const dir = mkdtempSync(join(tmpdir(), "echo-export-"));
  const www = isolatedWww();
  try {
    mkdirSync(join(dir, "e"));
    writeFileSync(join(dir, "e", "index.json"), JSON.stringify({ items: [{ name: "button" }] }));
    for (const route of EXPORTED_FIXTURES) {
      mkdirSync(join(dir, route));
      writeFileSync(join(dir, `${route}.html`), "");
    }
    execFileSync("node", [join(www, "scripts/prune-fixtures.mjs")], {
      cwd: www,
      env: { ...process.env, NEXT_DIST_DIR: dir },
      stdio: "pipe",
    });
    const left = EXPORTED_FIXTURES.flatMap((r) => [r, `${r}.html`]).filter((p) => existsSync(join(dir, p)));
    assert.deepEqual(left, [], `the fixtures are still in the export at ${dir}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
    rmSync(www, { recursive: true, force: true });
  }
});
