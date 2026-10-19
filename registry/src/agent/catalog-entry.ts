/**
 * One registry item + its meta → the catalog entry an agent reads.
 *
 * Shared by the artifact build (catalog.json, llms-full.txt) and the docs
 * site's "Copy for AI agent" button, so what a person copies off a page is the
 * same text the MCP server's get_component answers with — not a second
 * rendering that happens to look alike.
 */
import type { CatalogComponent } from "./catalog";
import type { MetaDocsFields } from "./meta-types";
import { describeProps } from "./props";
import { installCommand } from "./guidance";
import { coreInstallCommand, isCoreModule } from "./core-modules";
import { GROUP_OF } from "./groups";

/** The fields of a registry.json item this needs. */
export interface RegistryItem {
  name: string;
  type: string;
  title: string;
  description: string;
  dependencies?: string[];
  registryDependencies?: string[];
  files?: { path: string; type: string; target?: string }[];
}

/** The slice of a meta.ts this reads. `props` is the zod schema, walked by describeProps. */
export interface EntryMeta extends MetaDocsFields {
  description?: string;
  props?: unknown;
  examples?: readonly { title: string; description: string; code: string }[];
  antiPatterns?: readonly string[];
}

/** The docs fields a meta has set; unset ones are left off rather than written as null. */
function docsFields(meta: EntryMeta): MetaDocsFields {
  const { usage, composition, a11y, motion, sound, feel } = meta;
  return Object.fromEntries(
    Object.entries({ usage, composition, a11y, motion, sound, feel }).filter(([, v]) => v !== undefined),
  );
}

/**
 * `version` is the item's `/e/` version, when it has one: the registry build
 * passes what it recorded in `item-versions.json`.
 */
export function catalogComponent(item: RegistryItem, meta: EntryMeta | undefined, version?: string): CatalogComponent {
  return {
    name: item.name,
    title: item.title,
    ...(version ? { version } : {}),
    // The page and the agent read one description: the meta's. registry.json
    // keeps its short form for listings, and it rides along as `summary`.
    description: meta?.description ?? item.description,
    ...(meta?.description && meta.description !== item.description ? { summary: item.description } : {}),
    ...(item.name in GROUP_OF ? { group: GROUP_OF[item.name as keyof typeof GROUP_OF] } : {}),
    type: item.type,
    dependencies: item.dependencies ?? [],
    registryDependencies: item.registryDependencies ?? [],
    install: isCoreModule(item.name) ? coreInstallCommand() : installCommand(item.name),
    props: describeProps(meta?.props),
    examples: meta?.examples ? [...meta.examples] : [],
    antiPatterns: meta?.antiPatterns ? [...meta.antiPatterns] : [],
    ...(meta ? docsFields(meta) : {}),
  };
}
