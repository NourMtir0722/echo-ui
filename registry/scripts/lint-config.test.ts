/**
 * The workspace ESLint config loads and applies Next's rules to the docs site.
 *
 * The Next 16 upgrade moved `@next/eslint-plugin-next` to 16.x, which dropped
 * `flatConfig`; eslint.config.js still read `next.flatConfig.coreWebVitals`, so
 * `pnpm lint` crashed before linting anything.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { ESLint } from "eslint";

import { registryRoot } from "./docs/program";

const root = resolve(registryRoot, "..");

test("eslint.config.js loads and applies Next's core-web-vitals rules to apps/www", async () => {
  const eslint = new ESLint({ cwd: root });
  const config = await eslint.calculateConfigForFile(resolve(root, "apps/www/app/layout.tsx"));
  const rules = Object.keys(config.rules ?? {});
  // One recommended rule and one core-web-vitals-only rule.
  assert.ok(rules.includes("@next/next/no-img-element"), "Next's recommended rules are missing");
  assert.ok(rules.includes("@next/next/no-sync-scripts"), "Next's core-web-vitals rules are missing");
});

/**
 * The build output eslint must not read.
 *
 * `.gitignore` and the eslint ignore list are separate files that happen to
 * describe overlapping sets, and `apps/www/out/` — the static export
 * Cloudflare serves — was in one and not the other. It stayed hidden because
 * the directory only exists after a deploy build, so a checkout that had never
 * deployed could not reach it; the first one that did got 7,500 errors in
 * minified bundles.
 */
test("the static export and the Next dist dirs are ignored", async () => {
  const eslint = new ESLint({ cwd: root });
  for (const path of [
    "apps/www/out/_next/static/chunks/main.js",
    "apps/www/.next/static/chunks/main.js",
    "apps/www/.next-build/static/chunks/main.js",
  ]) {
    assert.equal(
      await eslint.isPathIgnored(resolve(root, path)),
      true,
      `${path} is build output — linting it buries real findings under generated-file errors`,
    );
  }
  // And the guard is narrow: source under apps/www is still linted.
  assert.equal(await eslint.isPathIgnored(resolve(root, "apps/www/app/layout.tsx")), false);
});
