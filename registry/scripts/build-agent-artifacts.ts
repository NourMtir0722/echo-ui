/**
 * Builds the agent layer: a consolidated catalog.json plus
 * llms.txt / llms-full.txt served by the docs site. Reads registry.json and the
 * per-item meta.ts files so there is ONE source of truth for agents, docs, and
 * the future MCP server.
 *
 * Run with tsx: `tsx scripts/build-agent-artifacts.ts`.
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { CATALOG_VERSION, type RegistryCatalog } from "../src/agent/catalog";
import { catalogComponent, type RegistryItem } from "../src/agent/catalog-entry";
import { CORE_MODULES } from "../src/agent/core-modules";
import { renderComponent } from "../src/agent/render";
import { IMPORT_PLACEHOLDER } from "../src/agent/guidance";
import {
  ACCESSIBILITY_INSTRUCTIONS,
  ACCESSIBILITY_RULES,
  BASE_UI_CORRECTION,
  CLI_RELEASED,
  ECHO_PITCH,
  PRERELEASE_AGENT_NOTICE,
  CONFORMANCE,
  OWNERSHIP,
  PROJECT_SETUP,
  THEME_SETUP,
  CLIENT_BOUNDARY,
  installCommand,
  installName,
} from "../src/agent/guidance";
import { ECHO_ROLES, SHADOW_RECIPES } from "echo-ui-core/theme";
import { SOUND_NAMES } from "echo-ui-core/sound";
import { MOTION_VOCABULARY } from "../src/agent/token-usage";
import { ALL_METAS, type AnyMeta } from "../src/agent/metas";
import { componentApis } from "./component-api";
import { itemWeight, type ItemWeight } from "./weight";
import { createRequire } from "node:module";

const __dirname = dirname(fileURLToPath(import.meta.url));
const registryRoot = resolve(__dirname, "..");
const outDir = resolve(registryRoot, "../apps/www/public");

const metaByName = new Map<string, AnyMeta>(ALL_METAS.map((m) => [m.name, m]));

/**
 * Every item's weight, and each echo-ui-core module's, measured from the
 * code as it is (weight.ts). Items from their `index.ts`; core modules from
 * the file their import path resolves to.
 */
async function measureWeights(items: readonly RegistryItem[]): Promise<Map<string, ItemWeight>> {
  const weights = new Map<string, ItemWeight>();
  for (const item of items) {
    const index = item.files?.find((f) => /\/index\.tsx?$/.test(f.path));
    if (index) weights.set(item.name, await itemWeight(resolve(registryRoot, index.path)));
  }
  const require = createRequire(resolve(registryRoot, "package.json"));
  for (const core of CORE_MODULES) weights.set(core.name, await itemWeight(require.resolve(core.entry)));
  return weights;
}

async function buildCatalog(): Promise<RegistryCatalog> {
  const registry = JSON.parse(await readFile(resolve(registryRoot, "registry.json"), "utf8")) as {
    name: string;
    homepage: string;
    items: RegistryItem[];
  };

  /*
   * Each item's `/e/` version, as the `/e/` build just recorded it. That build
   * runs first (see the registry's build script), so an item changed in this
   * working tree is listed at its pending version here too, not at the one
   * the last build left behind.
   */
  const versions = JSON.parse(await readFile(resolve(registryRoot, "item-versions.json"), "utf8")) as {
    items: Record<string, { version: string }>;
  };

  // Install lines are `npx echo-ui-cli add <name>`, built by catalogComponent
  // from the same constant the site's buttons use. The five echo-ui-core
  // modules are listed too: agents look them up by the same names, and their
  // entries carry the npm install line instead.
  // Each component's API, read from its types (see component-api.ts).
  const apis = componentApis();
  const weights = await measureWeights(registry.items);
  const components = [...registry.items, ...CORE_MODULES].map((item) => {
    const entry = catalogComponent(item, metaByName.get(item.name), versions.items[item.name]?.version);
    const api = apis.byItem.get(item.name);
    const weight = weights.get(item.name);
    return { ...entry, ...(api ? { api } : {}), ...(weight ? { weight } : {}) };
  });

  // The recipe classes material.css ships for anyone: `.echo-chassis { … }`.
  const materialCss = await readFile(resolve(registryRoot, "../packages/core/src/theme/material.css"), "utf8");
  const materials = [...new Set([...materialCss.matchAll(/^\.(echo-[\w-]+)/gm)].map((m) => m[1]!))].sort();

  return {
    catalogVersion: CATALOG_VERSION,
    name: registry.name,
    homepage: registry.homepage,
    components,
    tokens: {
      colorRoles: ECHO_ROLES.map((r) => `--echo-${r}`),
      sound: [...SOUND_NAMES],
      ...MOTION_VOCABULARY,
      shadows: Object.entries(SHADOW_RECIPES).map(([name, r]) => ({ token: `--echo-shadow-${name}`, kind: r.kind, use: r.use })),
    },
    htmlAttributes: apis.htmlAttributes,
    materials,
  };
}

function renderLlms(catalog: RegistryCatalog): string {
  const lines = [
    "# Echo UI",
    "",
    `> ${ECHO_PITCH}`,
    "",
    /*
     * Before anything else, because everything under it describes commands
     * that do not run yet. llms.txt composes its own list rather than
     * printing AGENT_INSTRUCTIONS, so the two agent channels have to be told
     * separately — `release-state.test.ts` is what keeps them saying the same
     * thing.
     */
    ...(CLI_RELEASED ? [] : [`> IMPORTANT: ${PRERELEASE_AGENT_NOTICE}`, ""]),
    `> IMPORTANT: ${BASE_UI_CORRECTION}`,
    "",
    // The rules an agent has to follow to keep the AA guarantee. The MCP
    // server serves them in its brief; this is the same thing for a model
    // reading the site.
    "## Accessibility",
    "",
    ACCESSIBILITY_RULES,
    "",
    ACCESSIBILITY_INSTRUCTIONS,
    "",
    "## Components",
    "",
    ...catalog.components.map(
      (c) => `- [${c.title}](${catalog.homepage}/e/${installName(c.name)}.json): ${c.summary ?? c.description}`,
    ),
    "",
    "## Tokens",
    "",
    `- Color roles: ${catalog.tokens.colorRoles.join(", ")}`,
    `- Sound: ${catalog.tokens.sound.join(", ")}`,
    `- Motion: ${catalog.tokens.motion.join(", ")}`,
    `- Springs (\`springs.<name>\`, for createSpring): ${catalog.tokens.springs?.join(", ")}`,
    `- Morph feels (\`morphFeels.<name>\`): ${catalog.tokens.morphFeels?.join(", ")}`,
    `- CSS durations: ${catalog.tokens.durations?.join(", ")}`,
    `- CSS eases: ${catalog.tokens.eases?.join(", ")}`,
    `- Shadows (for a part of your own; never write a box-shadow by hand): ${catalog.tokens.shadows?.map((s) => `${s.token} (${s.use.replace(/\.$/, "")})`).join("; ")}`,
    "",
    "## Setup",
    "",
    ...(CLI_RELEASED ? [] : [PRERELEASE_AGENT_NOTICE, ""]),
    PROJECT_SETUP,
    "",
    "```sh",
    "npx echo-ui-cli init",
    "```",
    "",
    THEME_SETUP,
    "",
    CLIENT_BOUNDARY,
    "",
    "## Install",
    "",
    "```sh",
    installCommand("<component>"),
    "```",
    "",
    OWNERSHIP,
    "",
    "Cross-component dependencies resolve automatically. Consume only Layer-3 semantic vars (`var(--echo-*)`) in your own CSS; theme by passing a seed to `createEchoTheme`.",
    "",
    "## Conformance",
    "",
    CONFORMANCE,
    "",
  ];
  return lines.join("\n");
}

function renderLlmsFull(catalog: RegistryCatalog): string {
  const parts = [
    renderLlms(catalog),
    "---",
    "",
    "# Full component reference",
    "",
    IMPORT_PLACEHOLDER,
    "",
  ];
  for (const c of catalog.components) {
    parts.push(renderComponent(c, 2, { importNote: false }));
  }
  return parts.join("\n");
}

async function main() {
  const catalog = await buildCatalog();
  await mkdir(resolve(outDir, "r"), { recursive: true });
  await writeFile(resolve(outDir, "r/catalog.json"), JSON.stringify(catalog, null, 2) + "\n");
  await writeFile(resolve(outDir, "llms.txt"), renderLlms(catalog));
  await writeFile(resolve(outDir, "llms-full.txt"), renderLlmsFull(catalog));
  console.log(
    `Agent artifacts written: catalog.json (${catalog.components.length} items), llms.txt, llms-full.txt`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
