import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import {
  searchComponents,
  getComponent,
  getTokens,
  getExamples,
  CATALOG_VERSION,
  type RegistryCatalog,
} from "./catalog";

/** The built catalog, read once and in one step: none when it hasn't been built (a read, not a look and then a read). */
async function builtCatalog(): Promise<RegistryCatalog | undefined> {
  const text = await readFile(resolve(__dirname, "../../../apps/www/public/r/catalog.json"), "utf8").catch(() => undefined);
  return text === undefined ? undefined : (JSON.parse(text) as RegistryCatalog);
}

const __dirname = dirname(fileURLToPath(import.meta.url));

const sample: RegistryCatalog = {
  name: "echo-ui",
  homepage: "https://echo-ui.com",
  components: [
    {
      name: "echo-hardware-button",
      title: "HardwareButton",
      description: "A molded tactile button with press travel and sound.",
      type: "registry:component",
      dependencies: ["gsap"],
      registryDependencies: ["@echo/echo-theme", "@echo/use-tactile"],
      install: "npx echo-ui-cli add hardware-button",
      props: [{ name: "variant", type: '"primary" | "neutral"', required: false, defaultValue: '"neutral"' }],
      examples: [{ title: "Primary", description: "The accent cap.", code: "<HardwareButton variant=\"primary\" />" }],
      antiPatterns: ["Never ship an icon-only button without an aria-label."],
    },
    {
      name: "echo-modal",
      title: "Modal",
      description: "Base UI Dialog skinned as an Echo device panel.",
      type: "registry:component",
      dependencies: ["gsap", "@base-ui/react"],
      registryDependencies: [],
      install: "npx echo-ui-cli add modal",
      props: [],
      examples: [],
      antiPatterns: [],
    },
  ],
  tokens: { colorRoles: ["--echo-surface"], sound: ["press"], motion: ["summon"] },
};

test("searchComponents matches name/title/description and returns all on empty", () => {
  assert.equal(searchComponents(sample, "").length, 2);
  assert.equal(searchComponents(sample, "button")[0]?.name, "echo-hardware-button");
  assert.equal(searchComponents(sample, "dialog")[0]?.name, "echo-modal");
  assert.equal(searchComponents(sample, "nonexistent").length, 0);
});

test("search is anchored at word starts, not any substring", () => {
  // "led" inside "labelled" or "peeled" is a coincidence, not a match; this
  // was returning Breadcrumb and Tag for a search that means LEDs.
  const noise: RegistryCatalog = {
    ...sample,
    components: [
      { ...sample.components[0]!, name: "echo-status-dot", title: "StatusDot", description: "A tiny LED, lit or dead." },
      { ...sample.components[1]!, name: "echo-breadcrumb", title: "Breadcrumb", description: "A labelled nav around an ordered list." },
    ],
  };
  assert.deepEqual(
    searchComponents(noise, "led").map((c) => c.name),
    ["echo-status-dot"],
  );
});

test("search ranks the component you named above one that merely mentions it", () => {
  const catalog: RegistryCatalog = {
    ...sample,
    components: [
      { ...sample.components[1]!, name: "echo-tooltip", title: "Tooltip", description: "Anchored to a button." },
      { ...sample.components[0]!, name: "echo-hardware-button", title: "HardwareButton", description: "A molded cap." },
    ],
  };
  // The component whose NAME matches has to come first even though the other
  // one is earlier in the registry.
  assert.equal(searchComponents(catalog, "button")[0]?.name, "echo-hardware-button");
  // camelCase titles are searchable by their parts.
  assert.equal(searchComponents(catalog, "hardware")[0]?.title, "HardwareButton");
});

/*
 * The whole query was matched as one phrase, so a search in words an
 * agent would use ("radio tuning scale") found nothing unless the component's
 * text held those words in that order. Every word counts on its own now.
 */
test("a search in several words finds the component those words describe", async (t) => {
  const catalog = await builtCatalog();
  if (!catalog) {
    t.skip("catalog not built — run `pnpm build:registry`");
    return;
  }
  assert.equal(searchComponents(catalog, "radio tuning scale")[0]?.name, "echo-tuner");
  assert.equal(searchComponents(catalog, "payment terminal keys")[0]?.name, "echo-keypad");
  assert.equal(searchComponents(catalog, "keyboard shortcuts sheet")[0]?.name, "echo-shortcut-map");
  assert.equal(searchComponents(catalog, "button")[0]?.name, "echo-hardware-button", "one word still works as before");
  assert.equal(searchComponents(catalog, "zzz qqq").length, 0, "words nothing uses still find nothing");
});

test("getComponent / getExamples / getTokens", () => {
  assert.equal(getComponent(sample, "echo-modal")?.title, "Modal");
  assert.equal(getComponent(sample, "missing"), null);
  assert.equal(getExamples(sample, "echo-hardware-button").length, 1);
  assert.equal(getExamples(sample, "echo-modal").length, 0);
  assert.deepEqual(getTokens(sample).sound, ["press"]);
});

test("built catalog.json is well-formed (skips if not built)", async (t) => {
  const catalog = await builtCatalog();
  if (!catalog) {
    t.skip("catalog not built — run `pnpm build:registry`");
    return;
  }
  assert.ok(catalog.components.length >= 5);
  assert.ok(catalog.tokens.colorRoles.length > 0);
  assert.ok(getComponent(catalog, "echo-hardware-button"));
});

/**
 * The catalog is cached by the CLI and read by the MCP server, so its format
 * carries a version, and each item carries the `/e/` version the check
 * compares with what a project installed. Both have to be what the `/e/` build
 * recorded, or the check would hold a project to the wrong version's props.
 */
test("the built catalog says its format, and each item's version is the one /e/ recorded", async (t) => {
  const catalog = await builtCatalog();
  if (!catalog) {
    t.skip("catalog not built — run `pnpm build:registry`");
    return;
  }
  const recorded = JSON.parse(await readFile(resolve(__dirname, "../../item-versions.json"), "utf8")) as {
    items: Record<string, { version: string }>;
  };
  assert.equal(catalog.catalogVersion, CATALOG_VERSION);
  // The first key, so a reader finds it before anything it might misread.
  assert.equal(Object.keys(catalog)[0], "catalogVersion");

  const wrong: string[] = [];
  for (const c of catalog.components) {
    const expected = recorded.items[c.name]?.version;
    if (c.version !== expected) wrong.push(`${c.name}: ${c.version} ≠ ${expected}`);
  }
  assert.deepEqual(wrong, [], "catalog versions that differ from item-versions.json");
  // Every /e/ item has one; only the npm-installed core modules go without.
  assert.ok(catalog.components.filter((c) => c.version).length === Object.keys(recorded.items).length);
});
