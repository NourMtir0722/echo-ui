import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { registryRoot } from "./docs/program";

/**
 * The CI image and the installed Playwright are the same version.
 *
 * Screenshots are compared against baselines taken in a container image
 * (`mcr.microsoft.com/playwright:vX.Y.Z-…`). If the package updates and the
 * image doesn't, the browser that takes the baselines stops being the browser
 * that checks them, and every `visual:` test starts failing for a reason
 * nobody can see in the diff — or worse, passes while proving nothing.
 *
 * Both workflows that mention the image are checked, so the e2e job and the
 * baseline job can never drift apart either.
 */
const repoRoot = resolve(registryRoot, "..");
const read = (file: string) => readFileSync(resolve(repoRoot, file), "utf8");

test("the Playwright container image matches the installed Playwright", () => {
  // The version actually resolved, not the range in package.json.
  const lock = read("pnpm-lock.yaml");
  const resolved = /@playwright\/test@(\d+\.\d+\.\d+)/.exec(lock)?.[1];
  assert.ok(resolved, "could not find @playwright/test in the lockfile");

  const workflows = [".github/workflows/ci.yml", ".github/workflows/visual-baselines.yml"];
  for (const workflow of workflows) {
    const image = /mcr\.microsoft\.com\/playwright:v(\d+\.\d+\.\d+)-/.exec(read(workflow));
    assert.ok(image, `${workflow} has no Playwright container image`);
    assert.equal(
      image[1],
      resolved,
      `${workflow} runs Playwright ${image[1]} in the image, but the lockfile resolves ${resolved}. ` +
        "Screenshots are compared against baselines taken in that image, so the two have to match.",
    );
  }
});
