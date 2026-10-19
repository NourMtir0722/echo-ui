import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const registryRoot = resolve(__dirname, "..");

const readJson = async (p) => JSON.parse(await readFile(p, "utf8"));
const exists = async (p) =>
  access(p).then(
    () => true,
    () => false,
  );

test("registry.json is valid and every item resolves its files", async () => {
  const registry = await readJson(resolve(registryRoot, "registry.json"));

  assert.equal(typeof registry.name, "string", "registry needs a name");
  assert.ok(Array.isArray(registry.items) && registry.items.length > 0, "registry needs items");

  for (const item of registry.items) {
    assert.ok(item.name, "item needs a name");
    assert.ok(item.type?.startsWith("registry:"), `item ${item.name} needs a registry: type`);
    assert.ok(Array.isArray(item.files) && item.files.length > 0, `item ${item.name} needs files`);

    for (const file of item.files) {
      const abs = resolve(registryRoot, file.path);
      assert.ok(await exists(abs), `missing source file for ${item.name}: ${file.path}`);
    }
  }
});

/**
 * The same derivation, for SIBLING items.
 *
 * `settings.tsx` imports thirteen other items through `../`, and `chat` and
 * `auth` do the same at smaller scale. That coupling is fine — the CLI
 * resolves item dependencies — but it means one missing entry in
 * `registryDependencies` produces a template that installs into a stranger's
 * repo and does not compile, because a file it imports was never copied.
 *
 * The npm half of this has been derived from source since the beginning. The
 * item half was declared by hand and checked only by the weekly release
 * matrix, which installs from packed tarballs: real coverage, a week late,
 * and never on the pull request that broke it.
 *
 * A sibling import is `../<dir>`, and `<dir>` is the folder the item's own
 * files live in — read from `registry.json` rather than assumed to be the
 * name minus `echo-`, so a folder that stops matching its item is a failure
 * here instead of a silent miss.
 */
test("every sibling an item imports is a declared registry dependency", async () => {
  const registry = await readJson(resolve(registryRoot, "registry.json"));

  const itemByDir = new Map();
  for (const item of registry.items) {
    for (const file of item.files) {
      const dir = /^src\/echo\/([^/]+)\//.exec(file.path)?.[1];
      if (dir) itemByDir.set(dir, item.name);
    }
  }
  assert.ok(itemByDir.size > 40, `expected the whole library, mapped ${itemByDir.size} folders`);

  const problems = [];
  for (const item of registry.items) {
    const declared = new Set(item.registryDependencies ?? []);
    for (const file of item.files) {
      if (!/\.(ts|tsx)$/.test(file.path)) continue;
      const src = await readFile(resolve(registryRoot, file.path), "utf8");
      for (const m of src.matchAll(/(?:from\s+|import\s+)["']\.\.\/([^"'/]+)/g)) {
        const dir = m[1];
        const sibling = itemByDir.get(dir);
        if (!sibling) {
          problems.push(`${item.name}: ${file.path} imports ../${dir}, which is not a registry item`);
          continue;
        }
        if (sibling === item.name) continue;
        if (!declared.has(`@echo/${sibling}`)) {
          problems.push(
            `${item.name}: ${file.path} imports ../${dir}, so @echo/${sibling} belongs in registryDependencies`,
          );
        }
      }
    }
  }
  assert.deepEqual([...new Set(problems)], []);
});

/**
 * Every npm package an item's files import is in its `dependencies`, so an
 * install brings it. `echo-ui-cli` installs exactly what the item declares; an undeclared import builds here, where the
 * workspace has everything, and breaks in a fresh app.
 */
test("every package an item imports is a declared dependency", async () => {
  const registry = await readJson(resolve(registryRoot, "registry.json"));
  // Provided by the app itself, never installed per item.
  const HOST = new Set(["react", "react-dom"]);
  const problems = [];
  for (const item of registry.items) {
    const declared = new Set(item.dependencies ?? []);
    for (const file of item.files) {
      if (!/\.(ts|tsx)$/.test(file.path)) continue;
      const src = await readFile(resolve(registryRoot, file.path), "utf8");
      for (const m of src.matchAll(/^\s*(?:import|export)\s[^'"]*?from\s+["']([^"'.][^"']*)["']|^\s*import\s+["']([^"'.][^"']*)["']/gm)) {
        const spec = m[1] ?? m[2];
        if (m[0].includes("import type") || m[0].includes("export type")) continue;
        const pkg = spec.startsWith("@") ? spec.split("/").slice(0, 2).join("/") : spec.split("/")[0];
        if (HOST.has(pkg) || pkg.startsWith("@/")) continue;
        if (!declared.has(pkg)) problems.push(`${item.name}: ${file.path} imports ${pkg}, not in dependencies`);
      }
    }
  }
  assert.deepEqual([...new Set(problems)], []);
});

/**
 * Every relative import in an item's files lands on a file the item
 * ships (or one shipped by an item it depends on). The package check above
 * skips relative paths, so a component could import a sibling module the
 * registry never copies: it builds here, where the whole tree is on disk, and
 * breaks in the app that installed it.
 */
test("every relative import in an item resolves to a shipped file", async () => {
  const registry = await readJson(resolve(registryRoot, "registry.json"));
  const byName = new Map(registry.items.map((i) => [i.name, i]));
  const problems = [];
  for (const item of registry.items) {
    const shipped = new Set(item.files.map((f) => f.path));
    // Dependencies are namespaced ("@echo/echo-field"); the item is "echo-field".
    for (const dep of item.registryDependencies ?? []) {
      for (const f of byName.get(dep.replace(/^@echo\//, ""))?.files ?? []) shipped.add(f.path);
    }
    for (const file of item.files) {
      if (!/\.(ts|tsx)$/.test(file.path)) continue;
      const src = await readFile(resolve(registryRoot, file.path), "utf8");
      for (const m of src.matchAll(/(?:from\s+|import\s+)["'](\.{1,2}\/[^"']+)["']/g)) {
        const base = join(dirname(file.path), m[1]);
        const candidates = [base, `${base}.ts`, `${base}.tsx`, join(base, "index.ts"), join(base, "index.tsx")];
        if (!candidates.some((c) => shipped.has(c))) {
          problems.push(`${item.name}: ${file.path} imports ${m[1]}, which the item does not ship`);
        }
      }
    }
  }
  assert.deepEqual([...new Set(problems)], []);
});
