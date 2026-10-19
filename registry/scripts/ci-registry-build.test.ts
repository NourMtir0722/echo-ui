import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { registryRoot } from "./docs/program";

/**
 * A workflow that builds the docs site has to build the registry
 * first.
 *
 * The docs read files the registry build writes into apps/www/public (the
 * /e/ and /r/ items, llms.txt): the install panel shows each file's source
 * from /e/<name>.json. Those files are gitignored, so a machine that has
 * built the registry once has them and every test passes there. The CI e2e
 * job built only the site, so its install panels were empty and the docs
 * tests failed, in CI alone.
 */
const repoRoot = resolve(registryRoot, "..");
const dir = resolve(repoRoot, ".github/workflows");

const DOCS_BUILD = /pnpm --filter @echo-ui\/www build\b|pnpm --filter @echo-ui\/www build:static\b/;
const REGISTRY_BUILD = /pnpm (?:build:registry|--filter @echo-ui\/registry build)\b/;

test("every workflow that builds the docs builds the registry first", () => {
  const offenders: string[] = [];
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".yml"))) {
    const text = readFileSync(resolve(dir, file), "utf8");
    // Each job on its own: a registry build in another job doesn't help.
    const jobs = text.split(/\n {2}(?=[a-z][\w-]*:\n)/);
    for (const job of jobs) {
      const docs = job.search(DOCS_BUILD);
      if (docs < 0) continue;
      const registry = job.search(REGISTRY_BUILD);
      if (registry < 0 || registry > docs) offenders.push(`${file}: ${job.split("\n")[0]!.trim()}`);
    }
  }
  assert.deepEqual(offenders, [], "these jobs build the docs without building the registry first");
});
