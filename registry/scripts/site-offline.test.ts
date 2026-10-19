import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { registryRoot } from "./docs/program";

const repoRoot = resolve(registryRoot, "..");

/**
 * The site's fonts came from `next/font/google`, which fetches them
 * from Google at build time: the build failed whenever that host couldn't be
 * reached (on a train, in a CI outage, on 2026-09-24 for an afternoon). The
 * faces are open-licence and on npm, so they're installed and loaded with
 * `next/font/local`, and the build needs no network.
 */
test("the site loads no font from the network at build time", () => {
  const files = execFileSync("git", ["ls-files", "apps/www"], { cwd: repoRoot, encoding: "utf8" })
    .split("\n")
    .filter((f) => /\.(t|j)sx?$|\.mjs$/.test(f));
  const fetching = files.filter((f) => /from\s+["']next\/font\/google["']/.test(readFileSync(resolve(repoRoot, f), "utf8")));
  assert.deepEqual(fetching, [], "use next/font/local with the face's @fontsource package");
});
