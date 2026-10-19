import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Structural rules for the blocks (templates).
 *
 * "No template-only orphan code" is the acceptance criterion that keeps a
 * template honest: a screen is only evidence that the LIBRARY works if every
 * part of it is a shipped item someone else can install. Checking it by reading
 * the registry is the only way it stays true — by eye it survives exactly one
 * refactor.
 */
const registryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

interface Item {
  name: string;
  type: string;
  registryDependencies?: string[];
  files: { path: string; target: string }[];
}

const registry = JSON.parse(
  readFileSync(resolve(registryRoot, "registry.json"), "utf8"),
) as { items: Item[] };

const byName = new Map(registry.items.map((i) => [i.name, i]));
const blocks = registry.items.filter((i) => i.type === "registry:block");

test("the registry ships the template blocks", () => {
  assert.deepEqual(
    blocks.map((b) => b.name).sort(),
    ["echo-chat", "echo-console"],
  );
});

test("every part of every block is itself a shipped registry item", () => {
  const missing: string[] = [];
  for (const block of blocks) {
    for (const dep of block.registryDependencies ?? []) {
      const name = dep.replace(/^@echo\//, "");
      if (!byName.has(name)) missing.push(`${block.name} → ${dep}`);
    }
  }
  assert.deepEqual(missing, [], "a block depends on something the registry does not ship");
});

/**
 * A block's declared dependencies have to match what its source actually
 * imports, or `echo-ui add` installs a screen with pieces missing — the
 * "zero manual fixes" bar, at screen scale.
 */
test("a block declares every sibling component its source imports", () => {
  const problems: string[] = [];

  for (const block of blocks) {
    const source = block.files.find((f) => f.path.endsWith(".tsx"));
    assert.ok(source, `${block.name} has no component file`);
    const code = readFileSync(resolve(registryRoot, source.path), "utf8");

    // Sibling imports are how every Echo item references another: `../table`.
    const imported = [...code.matchAll(/from "\.\.\/([a-z0-9-]+)"/g)].map((m) => m[1]!);
    const declared = new Set(
      (block.registryDependencies ?? []).map((d) => d.replace(/^@echo\/echo-/, "")),
    );

    for (const dir of new Set(imported)) {
      // `sound` is imported as use-sound's provider; both spellings are the
      // theme/sound foundations, declared under their own names.
      const alias = dir === "sound" ? "sound" : dir;
      if (!declared.has(alias)) problems.push(`${block.name} imports ../${dir} but does not declare it`);
    }
  }

  assert.deepEqual(problems, []);
});

test("blocks install alongside components, under the same echo/ tree", () => {
  for (const block of blocks) {
    for (const file of block.files) {
      assert.match(
        file.target,
        /^echo\//,
        `${block.name}: ${file.target} escapes the echo/ tree, so relative imports between items would break`,
      );
    }
  }
});
