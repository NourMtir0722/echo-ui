/**
 * `echo-ui docs <name> […]`: what an agent needs before it uses an item —
 * its props, the smallest working use, what it needs for accessibility and
 * what not to do — for several items in one answer.
 *
 * Imports are written the way this project resolves them, and an item the
 * project installed at an older version says so: the props shown are the
 * latest, and `diff` shows what moved.
 */
import { RegistryError } from "@echo-ui/client";
import { getComponent, type CatalogComponent } from "@registry/agent/catalog";
import { installName, runCommand } from "@registry/agent/guidance";
import { notFound, resolveName } from "@registry/agent/names";
import { renderBrief } from "@registry/agent/render";

import { loadCatalog } from "../catalog";
import { docsImport } from "../import-path";
import { DEFAULT_REGISTRY, readConfig, readLock } from "../project";
import type { Reporter } from "../output";

export interface DocsOptions {
  root: string;
  names: string[];
  registry?: string;
  refresh?: boolean;
}

export async function docs(options: DocsOptions, out: Reporter): Promise<number> {
  if (options.names.length === 0) {
    out.error(`Which items? e.g. \`${runCommand("docs switch field")}\`. Not sure which? \`${runCommand('which "<the job>"')}\``);
    return 2;
  }
  const config = await readConfig(options.root);
  let loaded;
  try {
    loaded = await loadCatalog(options.root, options.registry ?? config?.registry ?? DEFAULT_REGISTRY, { refresh: options.refresh, keep: config !== undefined });
  } catch (error) {
    out.error(error instanceof RegistryError ? error.message : String(error));
    return 1;
  }
  const lock = await readLock(options.root);
  const imports = config ? await docsImport(options.root, config.dir, config.framework) : undefined;
  const importFrom = imports?.from;

  const found: { name: string; text: string; component: CatalogComponent }[] = [];
  const missing: { name: string; message: string }[] = [];
  for (const asked of options.names) {
    const resolved = resolveName(loaded.catalog, asked);
    const component = resolved ? getComponent(loaded.catalog, resolved) : null;
    if (!component) {
      missing.push({ name: asked, message: notFound(loaded.catalog, asked, `\`${runCommand('which "<the job>"')}\` finds the item for a job.`) });
      continue;
    }
    const name = installName(component.name);
    found.push({ name, component, text: renderBrief(component, { importFrom, installed: lock?.items[name]?.version }) });
  }

  if (found.length && imports?.relativeTo) {
    out.line(`Imports are written from a file in ${imports.relativeTo}/: this project has no import alias. From a file in another folder, adjust the path.\n`);
  }
  out.line(found.map((f) => f.text).join("\n\n"));
  for (const m of missing) out.line(`\n${m.message}`);
  if (loaded.from === "stale cache") out.warn("The registry couldn't be reached, so this is the catalog kept from before.");

  out.result({
    command: "docs",
    items: found.map(({ name, component }) => ({
      name,
      title: component.title,
      ...(component.version ? { version: component.version } : {}),
      ...(lock?.items[name] ? { installed: lock.items[name]!.version } : {}),
      install: component.install,
      ...(component.usage ? { usage: component.usage } : {}),
      props: component.props,
      a11y: component.a11y ?? [],
      antiPatterns: component.antiPatterns,
    })),
    ...(importFrom ? { importFrom } : {}),
    ...(imports?.relativeTo ? { importRelativeTo: imports.relativeTo } : {}),
    missing: missing.map((m) => m.name),
  });
  // Something asked for that doesn't exist is a refusal, like any other.
  return missing.length ? 1 : 0;
}
