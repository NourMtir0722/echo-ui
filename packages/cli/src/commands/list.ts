/**
 * `echo-ui list`: the catalog, with what this project already
 * has marked. Works without an `echo.json` — browsing shouldn't need a setup.
 */
import { RegistryClient, RegistryError } from "@echo-ui/client";

import { DEFAULT_REGISTRY, readConfig, readLock } from "../project";
import { bold, dim, type Reporter } from "../output";

export interface ListOptions {
  root: string;
  registry?: string;
}

export async function list(options: ListOptions, out: Reporter): Promise<number> {
  const config = await readConfig(options.root);
  const client = new RegistryClient(options.registry ?? config?.registry ?? DEFAULT_REGISTRY);
  let index;
  try {
    index = await client.index();
  } catch (error) {
    out.error(error instanceof RegistryError ? error.message : String(error));
    return 1;
  }
  const lock = await readLock(options.root);

  const rows = index.items.map((item) => {
    const installed = lock?.items[item.name]?.version;
    return {
      name: item.name,
      version: item.version,
      kind: item.kind,
      title: item.title,
      ...(installed ? { installed } : {}),
    };
  });

  const width = Math.max(...rows.map((r) => r.name.length), 4);
  out.line(dim(`${index.items.length} items · registry ${client.registry} · core ${index.core}`));
  out.line();
  for (const row of rows) {
    const state = row.installed
      ? row.installed === row.version
        ? dim("installed")
        : bold(`${row.installed} → ${row.version}`)
      : dim(row.version);
    out.line(`  ${row.name.padEnd(width)}  ${state}  ${dim(row.title)}`);
  }
  out.result({ command: "list", registry: client.registry, core: index.core, items: rows });
  return 0;
}
