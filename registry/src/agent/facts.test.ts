import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import type { CatalogComponent, RegistryCatalog } from "./catalog";
import { KEYS, factCard, kb, weightLine } from "./facts";

const catalogPath = resolve(dirname(fileURLToPath(import.meta.url)), "../../../apps/www/public/r/catalog.json");
const built = existsSync(catalogPath);
const catalog = () => JSON.parse(readFileSync(catalogPath, "utf8")) as RegistryCatalog;

const component = (over: Partial<CatalogComponent>): CatalogComponent => ({
  name: "echo-x",
  title: "X",
  description: "",
  type: "registry:component",
  dependencies: [],
  registryDependencies: [],
  install: "",
  props: [],
  examples: [],
  antiPatterns: [],
  ...over,
});

test("a card is the item's own facts: its keys, what it needs besides core, what reduced motion does", () => {
  const card = factCard(
    component({
      version: "0.3.1",
      dependencies: ["@base-ui/react", "gsap", "echo-ui-core"],
      registryDependencies: ["@echo/echo-size"],
      a11y: ["Base UI Switch: `role=\"switch\"`. Space toggles it.", "Name it with aria-label."],
      motion: { tokens: ["lift"], reducedMotion: "It jumps instead of travelling." },
      sound: ["`tap` each time it toggles."],
      weight: { js: 1273, withDependencies: 35629, css: 814 },
    }),
  );
  assert.deepEqual(card.npm, ["@base-ui/react", "gsap"]);
  assert.deepEqual(card.items, ["size"]);
  assert.deepEqual(card.keyboard, ["Base UI Switch: `role=\"switch\"`. Space toggles it."]);
  assert.equal(card.reducedMotion, "It jumps instead of travelling.");
  assert.equal(weightLine(card.weight!), "1.2 KB; 34.8 KB with what it imports; 814 B of CSS (minified and gzipped, React not counted)");
  assert.equal(kb(1023), "1023 B");
  assert.ok(KEYS.test("← and → throw the top card"), "arrows count as keys");
});

test("every item in the built catalog has a weight", { skip: !built }, () => {
  const missing = catalog().components.filter((c) => !c.weight || c.weight.withDependencies < c.weight.js).map((c) => c.name);
  assert.deepEqual(missing, []);
});

/**
 * A part you can operate says which keys do what. Interactive means it takes
 * a handler: something happens when it's used.
 */
test("every interactive item says which keys do what", { skip: !built }, () => {
  const silent = catalog()
    .components.filter((c) => Object.values(c.api ?? {}).some((api) => api.props.some((p) => /^on[A-Z]/.test(p) && !/^on(Blur|Focus|KeyDown)$/.test(p))))
    .filter((c) => !(c.a11y ?? []).some((line) => KEYS.test(line)))
    .map((c) => c.name);
  assert.deepEqual(silent, [], "add a line to the item's a11y saying which keys do what");
});
