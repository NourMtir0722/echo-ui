/**
 * The catalog, kept in the project so `which`, `docs` and `check` answer in
 * milliseconds and offline.
 *
 * It lives in `node_modules/.cache/echo-ui/`, where tools keep what they can
 * rebuild: out of the project's own files, out of version control, and gone
 * with `node_modules`, after which the next command fetches it again. `init`,
 * `add` and `update` refresh it, since they are the moments the project's
 * Echo changes.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { RegistryError, catalogUrl, fetchCatalog, parseCatalog, type RegistryCatalog } from "@echo-ui/client";

/** Relative to the project root, with forward slashes. */
export const CATALOG_CACHE = "node_modules/.cache/echo-ui/catalog.json";

interface CacheFile {
  /** Where it was fetched from: a cache from another registry isn't this one's. */
  source: string;
  fetchedAt: string;
  catalog: unknown;
}

async function readCache(root: string): Promise<CacheFile | undefined> {
  try {
    return JSON.parse(await readFile(join(root, CATALOG_CACHE), "utf8")) as CacheFile;
  } catch {
    return undefined;
  }
}

/** Fetches the catalog for `registry` and keeps it. Throws when it can't be read. */
export async function refreshCatalog(root: string, registry: string): Promise<RegistryCatalog> {
  const catalog = await fetchCatalog(registry);
  const path = join(root, CATALOG_CACHE);
  await mkdir(dirname(path), { recursive: true });
  const file: CacheFile = { source: catalogUrl(registry), fetchedAt: new Date().toISOString(), catalog };
  await writeFile(path, JSON.stringify(file));
  return catalog;
}

export interface LoadedCatalog {
  catalog: RegistryCatalog;
  /** Where the answer came from, for a person who wonders why it's out of date. */
  from: "cache" | "registry" | "stale cache";
}

/**
 * The project's catalog: the kept copy when it's this registry's, otherwise a
 * fresh one. `refresh` asks the registry first; if the registry can't be
 * reached, a kept copy still answers, and says it may be old. `keep: false`
 * (a folder that isn't an Echo project) fetches without writing anything.
 */
export async function loadCatalog(root: string, registry: string, { refresh = false, keep = true } = {}): Promise<LoadedCatalog> {
  const url = catalogUrl(registry);
  if (!keep) return { catalog: await fetchCatalog(registry), from: "registry" };
  const cached = await readCache(root);
  if (cached && cached.source === url && !refresh) {
    return { catalog: parseCatalog(JSON.stringify(cached.catalog), join(root, CATALOG_CACHE)), from: "cache" };
  }
  try {
    return { catalog: await refreshCatalog(root, registry), from: "registry" };
  } catch (error) {
    if (cached && cached.source === url) {
      return { catalog: parseCatalog(JSON.stringify(cached.catalog), join(root, CATALOG_CACHE)), from: "stale cache" };
    }
    throw error instanceof RegistryError ? error : new RegistryError(String(error));
  }
}
