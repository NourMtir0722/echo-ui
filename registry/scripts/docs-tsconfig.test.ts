import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Nothing the docs app needs lives in a file a build tool rewrites.
 *
 * `next dev` and `next build` both write to `apps/www/tsconfig.json` and
 * `next-env.d.ts`, rewriting the latter to point at whichever `NEXT_DIST_DIR`
 * that run used. While the app's real settings lived in the file Next owns,
 * every Playwright run left the tree dirty and the working rules ended with
 * "restore it by hand" — a manual step standing in for a configuration
 * problem, and one that is skipped exactly when someone is in a hurry.
 *
 * So the settings moved to `tsconfig.base.json`, which Next has no reason to
 * touch, and `next-env.d.ts` is generated and untracked. This keeps it that
 * way: a future Next version that starts writing `compilerOptions` back into
 * the thin file would otherwise take ownership of them silently.
 */
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const read = (p: string) => readFileSync(resolve(repoRoot, p), "utf8");
const json = (p: string) => JSON.parse(read(p));

test("the Next-managed tsconfig carries no settings of its own", () => {
  const thin = json("apps/www/tsconfig.json");
  assert.equal(thin.extends, "./tsconfig.base.json");
  assert.equal(
    thin.compilerOptions,
    undefined,
    "a compilerOptions block here is one Next can rewrite — it belongs in tsconfig.base.json",
  );
  assert.deepEqual(Object.keys(thin).sort(), ["exclude", "extends", "include"]);
});

test("the settings that matter are in the file Next does not write", () => {
  const base = json("apps/www/tsconfig.base.json");
  assert.equal(base.extends, "../../tsconfig.base.json", "the workspace base is still the root of it");
  const options = base.compilerOptions;
  assert.ok(options.paths["@/*"], "the app alias");
  assert.ok(options.paths["@registry/*"], "the alias every docs page imports components through");
  assert.deepEqual(options.types, ["node", "mdx"]);
  assert.equal(options.jsx, "preserve");
});

test("next-env.d.ts is generated, and what it provides is hand-authored elsewhere", () => {
  const tracked = execFileSync("git", ["ls-files", "apps/www/next-env.d.ts"], {
    cwd: repoRoot,
    encoding: "utf8",
  }).trim();
  assert.equal(tracked, "", "next-env.d.ts is rewritten by every build; tracking it is what made the tree dirty");

  assert.ok(existsSync(resolve(repoRoot, "apps/www/echo-env.d.ts")), "echo-env.d.ts is what replaces it");
  const hand = read("apps/www/echo-env.d.ts");
  // The two references a fresh clone needs before anything has ever been
  // built. Without them `tsc --noEmit` is the first command a contributor runs
  // and the first one that fails.
  assert.match(hand, /reference types="next"/);
  assert.match(hand, /reference types="next\/image-types\/global"/);
});
