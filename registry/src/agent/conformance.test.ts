import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { CONFORMANCE_CHECKS } from "./conformance";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

/*
 * `where` exists so a conformance claim can be traced to the suite that runs
 * it. Two of them named `tests/a11y.spec.ts` and `tests/keyboard.spec.ts`,
 * files this repository has never had, so the trace led nowhere.
 */
test("every suite a conformance check names exists", () => {
  const problems: string[] = [];
  for (const check of CONFORMANCE_CHECKS) {
    const paths = check.where.match(/tests\/[\w./-]+\.spec\.ts/g) ?? [];
    if (paths.length === 0) problems.push(`${check.id}: names no spec file`);
    for (const path of paths) {
      if (!existsSync(resolve(repoRoot, path))) problems.push(`${check.id}: ${path} does not exist`);
    }
  }
  assert.deepEqual(problems, []);
});
