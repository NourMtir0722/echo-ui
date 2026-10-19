import { test } from "node:test";
import assert from "node:assert/strict";

import { ciWorkflow, pnpmVersionFor } from "./ci";

/**
 * `init --ci`'s job: the app built and started the way its framework serves
 * it, with the project's own package manager, then `echo-ui test` against it,
 * and the report kept when it fails.
 */
test("the job builds, starts and tests the app with the project's own tools", () => {
  const next = ciWorkflow("next", "npm");
  assert.match(next, /^ {6}- run: npm ci$/m);
  assert.match(next, /^ {6}- run: npm run build$/m);
  assert.match(next, /run: npx next start -p 3000 &/);
  assert.match(next, /run: npx echo-ui test --url http:\/\/localhost:3000/);
  assert.match(next, /cache: npm/);
  assert.doesNotMatch(next, /pnpm/);

  const vite = ciWorkflow("vite", "pnpm");
  assert.match(vite, /uses: pnpm\/action-setup@v6/);
  assert.match(vite, /- run: pnpm install --frozen-lockfile/);
  assert.match(vite, /run: pnpm exec vite preview --port 4173 --strictPort &/);
  assert.match(vite, /pnpm exec echo-ui test --url http:\/\/localhost:4173/);
});

test("the job runs on pull requests, reads only, and keeps the report when it fails", () => {
  const job = ciWorkflow("next", "yarn");
  assert.match(job, /^on:\n {2}pull_request:/m);
  assert.match(job, /^permissions:\n {2}contents: read$/m);
  assert.match(job, /if: failure\(\)\n\s+uses: actions\/upload-artifact@v7\n\s+with:\n\s+name: echo-design-report\n\s+path: \.echo\/report/);
});

/**
 * pnpm/action-setup has to be told which pnpm to install: by its
 * `version` input, or by `packageManager` (or `devEngines.packageManager`) in
 * package.json. Without either it stops with "No pnpm version is specified",
 * and a pnpm app made by create-next-app or create-vite has neither, so the
 * job `init --ci` wrote failed on every pull request before it ran a test.
 */
test("the pnpm job names the pnpm to install unless package.json does", () => {
  assert.match(ciWorkflow("next", "pnpm", { pnpmVersion: "9.15.0" }), /uses: pnpm\/action-setup@v6\n {8}with:\n {10}version: 9\.15\.0\n/);
  assert.doesNotMatch(ciWorkflow("next", "pnpm"), /^ +version: /m, "package.json says it, so the job doesn't");

  // package.json naming it wins; then the pnpm the project runs; then its lockfile's.
  assert.equal(pnpmVersionFor({ packageManager: "pnpm@10.4.1+sha512.abc" }, "10.0.0", "lockfileVersion: '9.0'"), undefined);
  assert.equal(pnpmVersionFor({ devEngines: { packageManager: { name: "pnpm", version: "^10" } } }, "10.0.0", undefined), undefined);
  assert.equal(pnpmVersionFor({}, "10.18.2\n", "lockfileVersion: '9.0'"), "10.18.2");
  assert.equal(pnpmVersionFor({ packageManager: "yarn@4.1.0" }, undefined, "lockfileVersion: '9.0'\n"), "9");
  assert.equal(pnpmVersionFor({}, undefined, "lockfileVersion: '6.0'"), "8");
  assert.equal(pnpmVersionFor({}, "not a version", undefined), "latest");
});
