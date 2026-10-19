import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { catalogComponent, type RegistryItem } from "./catalog-entry";
import { ALL_METAS } from "./metas";

const item: RegistryItem = {
  name: "echo-kbd",
  type: "registry:component",
  title: "Kbd",
  description: "A molded keycap.",
};

test("the description is the meta's, so the page and get_component agree", () => {
  const c = catalogComponent(item, { description: "A molded keycap for keyboard hints — a tiny cap that never presses." });
  assert.equal(c.description, "A molded keycap for keyboard hints — a tiny cap that never presses.");
  // registry.json's short form survives for listings.
  assert.equal(c.summary, "A molded keycap.");
});

test("no summary when it would only repeat the description, or when there is no meta", () => {
  assert.equal(catalogComponent(item, { description: "A molded keycap." }).summary, undefined);
  const bare = catalogComponent(item, undefined);
  assert.equal(bare.description, "A molded keycap.");
  assert.equal(bare.summary, undefined);
});

test("every real item gets its meta's description", () => {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
  const items = (JSON.parse(readFileSync(resolve(root, "registry.json"), "utf8")) as { items: RegistryItem[] }).items;
  const metas = new Map<string, (typeof ALL_METAS)[number]>(ALL_METAS.map((m) => [m.name, m]));
  for (const i of items) {
    const meta = metas.get(i.name);
    assert.equal(catalogComponent(i, meta).description, meta?.description ?? i.description, i.name);
  }
});
