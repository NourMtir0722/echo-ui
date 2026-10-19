import { test } from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * `<EchoCheck />` stays in an app's root layout for good, so a production
 * build must get nothing from it: `echo-ui-core/check` points the
 * `development` condition at the page check and every other build at a component
 * that renders nothing. Bundled both ways here, the way a bundler resolves
 * the package: only the development bundle may carry the page check's code.
 */
const here = dirname(fileURLToPath(import.meta.url));

async function bundle(conditions: string[]): Promise<string> {
  const result = await build({
    stdin: { contents: 'export { EchoCheck } from "echo-ui-core/check";', resolveDir: here, loader: "ts" },
    bundle: true,
    write: false,
    format: "esm",
    platform: "browser",
    conditions,
    external: ["react", "react-dom"],
    jsx: "automatic",
    logLevel: "silent",
  });
  return result.outputFiles[0]!.text;
}

/** Strings only the page check's own code holds. */
const CHECK_CODE = ["Echo check", "MutationObserver", "--echo-accent"];

test("a production build of echo-ui-core/check holds none of the page check", async () => {
  const shipped = await bundle(["production"]);
  for (const marker of CHECK_CODE) assert.ok(!shipped.includes(marker), `"${marker}" reached a production bundle`);
  assert.ok(shipped.length < 1000, `the production entry is ${shipped.length} bytes`);
  // A bundler that names neither condition gets the production entry too.
  assert.equal(await bundle([]), shipped);
});

test("a development build of echo-ui-core/check is the page check", async () => {
  const dev = await bundle(["development"]);
  for (const marker of CHECK_CODE) assert.ok(dev.includes(marker), `"${marker}" is missing from the development bundle`);
});
