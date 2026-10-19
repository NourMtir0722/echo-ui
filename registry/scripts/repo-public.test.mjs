/**
 * The site links Echo's repository once `REPO_PUBLIC` says so, and a private
 * repository is a 404 to every visitor. The deploy asks GitHub
 * first: with the switch on, it goes out only when the repository opens.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { readRepoSwitch, repoBlocker } from "../../apps/www/scripts/repo-public.mjs";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const source = (isPublic) => `export const REPO_URL = "https://github.com/someone/echo-ui";\n\nexport const REPO_PUBLIC = ${isPublic};\n`;
const answering = (status) => async () => ({ status });

test("the deploy refuses to link the repository while a visitor gets a 404, and nothing else", async () => {
  assert.match(await repoBlocker(source(true), answering(404)), /answers a visitor with 404/);
  assert.match(
    await repoBlocker(source(true), async () => {
      throw new Error("offline");
    }),
    /couldn't reach/,
  );
  assert.equal(await repoBlocker(source(true), answering(200)), null);
  // Switched off, nothing links the repository, so there is nothing to ask.
  assert.equal(await repoBlocker(source(false), answering(404)), null);
});

test("the check reads the site's own switch, and deploy:site runs it before building", () => {
  const live = readRepoSwitch(readFileSync(resolve(repoRoot, "apps/www/components/site/repo.ts"), "utf8"));
  assert.match(live.url, /^https:\/\/github\.com\//);
  assert.equal(typeof live.isPublic, "boolean");
  const deploy = JSON.parse(readFileSync(resolve(repoRoot, "apps/www/package.json"), "utf8")).scripts["deploy:site"];
  assert.match(deploy, /^node scripts\/repo-public\.mjs && /);
});
