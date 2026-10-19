import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { CORE_MODULES } from "./core-modules";
import { ALL_METAS, META_DIRS } from "./metas";

const registryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const echoRoot = resolve(registryRoot, "src/echo");

test("every src/echo/*/meta.ts is in ALL_METAS", () => {
  const onDisk = readdirSync(echoRoot).filter((d) => existsSync(resolve(echoRoot, d, "meta.ts")));
  const listed = new Set(Object.values(META_DIRS));
  const missing = onDisk.filter((d) => !listed.has(d));
  assert.deepEqual(missing, [], `meta.ts files not in src/agent/metas.ts: ${missing.join(", ")}`);
});

test("ALL_METAS names exactly the registry.json items plus the echo-ui-core modules", () => {
  const registry = JSON.parse(readFileSync(resolve(registryRoot, "registry.json"), "utf8")) as {
    items: { name: string }[];
  };
  const items = [...registry.items.map((i) => i.name), ...CORE_MODULES.map((m) => m.name)].sort();
  const metas = ALL_METAS.map((m) => m.name).sort();
  assert.deepEqual(metas, items);
});
