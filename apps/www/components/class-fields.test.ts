import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Next hands SWC `useDefineForClassFields` from the tsconfig it reads through
 * `tsc --showConfig`. TypeScript 5 listed there the value the target implies
 * (true, for ES2022); TypeScript 6 lists only what a tsconfig sets. Left unset,
 * Next read false and compiled every class field on the site as an assignment
 * in the constructor, Base UI's scroll lock included: not the semantics
 * TypeScript checks the code against, nor what the browsers run natively.
 */
const www = join(dirname(fileURLToPath(import.meta.url)), "..");
const nextRequire = createRequire(join(www, "package.json"));

interface JsConfig {
  jsConfig?: { compilerOptions?: { useDefineForClassFields?: boolean } };
}

test("Next compiles class fields the way TypeScript checks them", async () => {
  const { PHASE_PRODUCTION_BUILD } = nextRequire("next/constants") as { PHASE_PRODUCTION_BUILD: string };
  const loadConfig = (nextRequire("next/dist/server/config") as { default: (...args: unknown[]) => Promise<unknown> })
    .default;
  const loadJsConfig = (
    nextRequire("next/dist/build/load-jsconfig") as { default: (dir: string, config: unknown) => Promise<JsConfig> }
  ).default;

  const config = await loadConfig(PHASE_PRODUCTION_BUILD, www, { silent: true });
  const { jsConfig } = await loadJsConfig(www, config);
  assert.equal(
    jsConfig?.compilerOptions?.useDefineForClassFields,
    true,
    "Next would compile class fields as constructor assignments: set useDefineForClassFields in tsconfig.base.json",
  );
});
