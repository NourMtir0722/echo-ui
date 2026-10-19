import { test, expect } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { appRoutes } from "./helpers/app-routes";

/**
 * console.spec.ts visits every route under apps/www/app, read from
 * the filesystem, and so it also visited pages a machine keeps there out of
 * git (the lab pages, in .git/info/exclude): one of them warns about its own
 * seed, and the whole suite failed on that machine, never in CI. The routes
 * are the ones git keeps, or will once they're added; never the ones it
 * ignores.
 *
 * Built in a git of its own, so it fails the same way on every machine, not
 * only on one with lab pages.
 */
test("the routes the specs visit leave out what git ignores", async ({ browserName }) => {
  test.skip(browserName !== "chromium", "reads files, not a page");
  const root = mkdtempSync(join(tmpdir(), "echo-routes-"));
  try {
    execFileSync("git", ["init", "-q"], { cwd: root });
    const page = (dir: string) => {
      mkdirSync(join(root, "app", dir), { recursive: true });
      writeFileSync(join(root, "app", dir, "page.tsx"), "export default function Page() { return null; }\n");
    };
    for (const dir of ["", "kept", "new-and-untracked", "(group)/grouped", "lab/styles", "notes/[slug]"]) page(dir);
    writeFileSync(join(root, ".git/info/exclude"), "app/lab/\napp/notes/\n");
    execFileSync("git", ["add", "app/page.tsx", "app/kept", "app/(group)"], { cwd: root });

    const routes = appRoutes(join(root, "app"));
    expect(routes.static.sort()).toEqual(["/", "/grouped", "/kept", "/new-and-untracked"]);
    expect(routes.dynamic).toEqual([]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
