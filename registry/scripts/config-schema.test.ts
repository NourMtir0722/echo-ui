import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * `init` writes `"$schema": "<registry>/schema/config.json"` into every
 * project's echo.json, and editors fetch it to check the file as it's typed.
 * Nothing published it: every echo.json pointed at a 404.
 */
const registryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const published = resolve(registryRoot, "../apps/www/public/e/schema/config.json");

test("the $schema every echo.json points to is published with the registry", () => {
  assert.ok(existsSync(published), "the /e/ build doesn't write schema/config.json");
  const schema = JSON.parse(readFileSync(published, "utf8")) as { type: string; properties: Record<string, unknown>; required: string[] };
  assert.equal(schema.type, "object");
  for (const key of ["$schema", "dir", "framework", "packageManager", "registry"]) assert.ok(key in schema.properties, `no ${key}`);
  assert.deepEqual([...schema.required].sort(), ["dir", "framework", "packageManager", "registry"]);
});
