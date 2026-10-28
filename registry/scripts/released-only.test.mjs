/**
 * Every site deploy rebuilt `/e/` from source, so a component changed
 * since the last release went out at the pending version, public, and the
 * next deploy could rewrite it before any release froze it: that's how 80 of
 * 0.2.0's public files changed under the people who'd installed them. The
 * deploy now refuses while an item it would serve is at a version no release
 * has frozen in `registry/e-released/`.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { unreleasedItems } from "../../apps/www/scripts/released-only.mjs";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

test("the deploy refuses an item at a version no release froze, and nothing else", async () => {
  const root = mkdtempSync(join(tmpdir(), "echo-released-only-"));
  try {
    const out = join(root, "out");
    const released = join(root, "e-released");
    mkdirSync(join(out, "e"), { recursive: true });
    mkdirSync(released);
    writeFileSync(join(out, "e", "index.json"), JSON.stringify({ version: "0.3.1", items: [{ name: "badge", version: "0.3.0" }, { name: "modal", version: "0.3.1" }] }));
    writeFileSync(join(released, "badge@0.3.0.json"), "{}");
    writeFileSync(join(released, "modal@0.3.0.json"), "{}");
    assert.deepEqual(await unreleasedItems(out, released), ["modal@0.3.1"]);
    writeFileSync(join(released, "modal@0.3.1.json"), "{}");
    assert.deepEqual(await unreleasedItems(out, released), []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("the site deploys only through the guard, after the export is built", () => {
  const scripts = JSON.parse(readFileSync(join(repoRoot, "apps/www/package.json"), "utf8")).scripts;
  // The repository check (repo-public.mjs) goes first: it needs no build, so a refusal costs nothing.
  // Then the registry, from this commit, the export, the guard, and the deploy.
  assert.match(
    scripts["deploy:site"],
    /^node scripts\/repo-public\.mjs && pnpm --filter @echo-ui\/registry build && NEXT_DIST_DIR=out pnpm build:static && node scripts\/released-only\.mjs out && wrangler deploy$/,
  );
});

/**
 * `deploy:site` exported whatever registry `apps/www/public/e` held
 * from the last build: in the copy it deploys from, that was the previous
 * deploy's 0.3.1, while the commit it deployed had cut 0.3.2. Every file of it
 * was released, so the guard above let it through, and production served an
 * older registry than its own code until the smoke check caught it. The deploy
 * builds the registry itself now, before the export.
 */
test("deploy:site builds the registry from the commit it deploys, before the export", () => {
  const scripts = JSON.parse(readFileSync(join(repoRoot, "apps/www/package.json"), "utf8")).scripts;
  const steps = scripts["deploy:site"].split("&&").map((s) => s.trim());
  const registry = steps.findIndex((s) => /@echo-ui\/registry build$/.test(s));
  const exported = steps.findIndex((s) => s.endsWith("pnpm build:static"));
  assert.ok(registry >= 0, `deploy:site doesn't build the registry: ${scripts["deploy:site"]}`);
  assert.ok(registry < exported, "the registry is built before the export that copies it");
});

/**
 * A static export goes where the build's NEXT_DIST_DIR points. With it set in the shell, as for a
 * verification build, the deploy exported into that folder while `wrangler` sent `out`, and stopped
 * with nothing to send. The deploy and the preview name the folder themselves: the one wrangler serves.
 */
test("deploy:site and preview build the export into the folder wrangler serves, whatever NEXT_DIST_DIR the shell holds", () => {
  const scripts = JSON.parse(readFileSync(join(repoRoot, "apps/www/package.json"), "utf8")).scripts;
  const served = /"directory":\s*"\.\/([^"]+)"/.exec(readFileSync(join(repoRoot, "apps/www/wrangler.jsonc"), "utf8"))?.[1];
  assert.ok(served, "wrangler.jsonc names no assets directory");
  for (const name of ["deploy:site", "preview"]) {
    const steps = scripts[name].split("&&").map((s) => s.trim());
    assert.ok(steps.includes(`NEXT_DIST_DIR=${served} pnpm build:static`), `${name} builds the export wherever the shell says: ${scripts[name]}`);
  }
  // The guard reads the same folder, not the shell's.
  assert.ok(scripts["deploy:site"].includes(`node scripts/released-only.mjs ${served} && wrangler deploy`), scripts["deploy:site"]);
});
