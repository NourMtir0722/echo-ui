/**
 * The server half of a component page: what is read from
 * disk at build time and handed to the client page as plain data.
 *
 * registry.json and CHANGELOG.md are read here rather than imported by the
 * client so neither ships in the page bundle — the page gets only its own
 * item's slice.
 *
 * Only a server component may import this (it uses node:fs).
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { catalogComponent, type RegistryItem } from "@registry/agent/catalog-entry";
import { CORE_MODULES } from "@registry/agent/core-modules";
import {
  changelogFor,
  parseChangelog,
  stripDirectives,
  type ItemChangelogEntry,
} from "@registry/agent/changelog";
import { renderComponent } from "@registry/agent/render";
import type { RegistryCatalog } from "@registry/agent/catalog";
import { factCard, type FactCard } from "@registry/agent/facts";
import { getDocItem, type DocItem } from "@/components/docs-manifest";

/** apps/www is the working directory for `next dev` and `next build` alike. */
const repoRoot = resolve(process.cwd(), "../..");

let registryItems: Map<string, RegistryItem> | undefined;
function allRegistryItems(): Map<string, RegistryItem> {
  registryItems ??= new Map(
    (
      JSON.parse(readFileSync(resolve(repoRoot, "registry/registry.json"), "utf8")) as {
        items: RegistryItem[];
      }
    ).items.map((i) => [i.name, i]),
  );
  return registryItems;
}
/** A docs page's item: a registry item, or one of the echo-ui-core modules. */
let built: RegistryCatalog | null | undefined;
/**
 * The catalog the registry build wrote, for what only a build can measure (an
 * item's weight). Absent until `pnpm build:registry` has run, and then a page
 * simply has no card.
 */
function builtCatalog(): RegistryCatalog | null {
  if (built === undefined) {
    try {
      built = JSON.parse(readFileSync(resolve(repoRoot, "apps/www/public/r/catalog.json"), "utf8")) as RegistryCatalog;
    } catch {
      built = null;
    }
  }
  return built;
}

const registryItem = (name: string): RegistryItem | undefined =>
  allRegistryItems().get(name) ?? CORE_MODULES.find((m) => m.name === name);

/**
 * Every file `npx echo-ui-cli add <name>` writes, dependencies included, as
 * paths inside the project's Echo folder — read from registry.json, so a guide
 * showing the layout cannot drift from what an install produces.
 *
 * The `echo/` prefix is dropped the same way the `/e/` build drops it: in that
 * format the folder IS the namespace, and where it sits on disk is the user's
 * choice (`dir` in echo.json), not the registry's.
 */
export function installedFiles(name: string): string[] {
  const seen = new Set<string>();
  const visit = (n: string) => {
    if (seen.has(n)) return;
    seen.add(n);
    for (const dep of allRegistryItems().get(n)?.registryDependencies ?? []) visit(dep.replace(/^@echo\//, ""));
  };
  visit(name);
  return [...seen]
    .flatMap((n) => (allRegistryItems().get(n)?.files ?? []).map((f) => (f.target ?? f.path).replace(/^echo\//, "")))
    .sort();
}

/** Item counts by registry type, in registry order, for the guides. */
export function registrySummary() {
  const byTypeItems: Record<string, string[]> = {};
  for (const item of allRegistryItems().values()) (byTypeItems[item.type] ??= []).push(item.name);
  const byType = Object.fromEntries(Object.entries(byTypeItems).map(([t, names]) => [t, names.length]));
  return { total: allRegistryItems().size, byType, byTypeItems };
}

/**
 * CHANGELOG.md as written, for the changelog page — minus the `<!-- bump: … -->`
 * directives, which are markup the build reads rather than anything a reader is
 * meant to see. Markdown hides an HTML comment; this renderer is Echo's own and
 * would print it.
 */
export const changelogSource = () => stripDirectives(changelogRaw());

/**
 * The file as it is on disk, directives included. Parsing needs them — they
 * ARE the attribution — so the two readers are kept apart rather than one
 * being derived from the other and quietly losing its data.
 */
const changelogRaw = () => readFileSync(resolve(repoRoot, "CHANGELOG.md"), "utf8");

/**
 * PRINCIPLES.md as written, minus what is not the public page: any editorial
 * note (a `>` blockquote), and the decisions below the first `---`.
 *
 * Rendering the document rather than restating it is the same rule the
 * changelog page follows. A second copy on the site would be a copy that
 * drifts from the one that was reviewed.
 */
export function principlesSource(): string {
  const source = readFileSync(resolve(repoRoot, "PRINCIPLES.md"), "utf8");
  const body = source
    .split("\n")
    .filter((line) => !line.startsWith(">"))
    .join("\n");
  const [page] = body.split(/\n---\n/);
  if (!page || !page.includes("## One device")) {
    throw new Error("PRINCIPLES.md no longer has a page body above its decision log");
  }
  return page.trimEnd();
}

let releases: ReturnType<typeof parseChangelog> | undefined;
function changelog() {
  releases ??= parseChangelog(changelogRaw());
  return releases;
}

export interface RegistryDependencyLink {
  /** The name you would type: `modal`, as `/e/` addresses it. */
  name: string;
  /** Its docs slug, when it is an Echo item with a page. */
  slug?: string;
}

export interface DocPageData {
  /**
   * The component's full record as markdown — the same text the MCP server's
   * get_component answers with, built by the same two functions.
   */
  agentMarkdown: string;
  /** For the Manual install tab. */
  manual: {
    dependencies: string[];
    registryDependencies: RegistryDependencyLink[];
    /** Where the CLI writes each file, in registry order. */
    files: string[];
  };
  changelog: ItemChangelogEntry[];
  /** The fact card, from the built catalog; absent before the registry is built. */
  facts?: FactCard;
}

export function docPageData(entry: DocItem): DocPageData {
  const item = registryItem(entry.meta.name);
  if (!item) throw new Error(`${entry.meta.name} has a docs page but no registry.json item or core module`);

  return {
    agentMarkdown: renderComponent(catalogComponent(item, entry.meta)),
    manual: {
      dependencies: item.dependencies ?? [],
      registryDependencies: (item.registryDependencies ?? []).map((registryName) => {
        const slug = registryName.replace(/^@echo\//, "").replace(/^echo-/, "");
        // The name a reader would type: `/e/` addresses items without the prefix.
        return getDocItem(slug) ? { name: slug, slug } : { name: slug };
      }),
      files: (item.files ?? []).map((f) => (f.target ?? f.path).replace(/^echo\//, "")),
    },
    changelog: changelogFor(changelog(), entry.meta),
    ...facts(entry.meta.name),
  };
}

function facts(name: string): { facts?: FactCard } {
  const component = builtCatalog()?.components.find((c) => c.name === name);
  return component ? { facts: factCard(component) } : {};
}
