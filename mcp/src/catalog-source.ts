/**
 * Where the catalog comes from. The server is a thin READER —
 * it never derives anything the registry build did not already write, so the
 * only real decisions here are where to read catalog.json from and how long to
 * trust what it read.
 *
 * Resolution order:
 *   1. `ECHO_CATALOG` — a URL or a filesystem path. Point it at
 *      `apps/www/public/r/catalog.json` to run against an unpublished registry.
 *   2. The published catalog at DEFAULT_CATALOG_URL.
 */
import { readFile } from "node:fs/promises";

import { FETCH_TIMEOUT_MS, RETRY_DELAYS_MS, readUrl } from "@echo-ui/client";
import type { RegistryCatalog } from "@registry/agent/catalog";

import { STALE_RETRY_MS } from "./registry-source";

export { STALE_RETRY_MS };

/**
 * The published catalog. This mirrors `homepage` in registry.json and a test
 * asserts the two stay in step: the day the domain changes, this constant
 * changes with it.
 */
export const DEFAULT_CATALOG_URL = "https://echo-ui.com/r/catalog.json";

/** How long a fetched catalog is trusted before it is read again. */
export const CATALOG_TTL_MS = 5 * 60 * 1000;

export interface CatalogSourceOptions {
  /** Overrides ECHO_CATALOG and the default URL. */
  source?: string;
  /** Injected in tests; defaults to global fetch. */
  fetchImpl?: typeof fetch;
  /** Injected in tests; defaults to Date.now. */
  now?: () => number;
  /** How long one read may take: the registry client's limit unless a test sets a shorter one. */
  timeoutMs?: number;
  /** The wait before each new try of a read that failed on the way: the registry client's unless a test sets its own. */
  retryDelays?: readonly number[];
}

export class CatalogLoadError extends Error {
  constructor(
    readonly source: string,
    readonly cause_: unknown,
  ) {
    super(`Could not read the Echo UI catalog from ${source}: ${String(cause_)}`);
    this.name = "CatalogLoadError";
  }
}

export function resolveSource(options: CatalogSourceOptions = {}): string {
  return options.source ?? process.env.ECHO_CATALOG ?? DEFAULT_CATALOG_URL;
}

const isUrl = (source: string) => /^https?:\/\//i.test(source);

async function read(source: string, fetchImpl: typeof fetch, timeoutMs: number, retryDelays: readonly number[]): Promise<RegistryCatalog> {
  if (!isUrl(source)) {
    return JSON.parse(await readFile(source, "utf8")) as RegistryCatalog;
  }
  // Read as the registry client reads: a host that stops answering is given up on, and a dropped
  // connection or a server's error is tried again.
  return JSON.parse(await readUrl(source, { headers: { accept: "application/json" }, timeoutMs, retryDelays, fetchImpl })) as RegistryCatalog;
}

/**
 * A catalog that reloads at most once per TTL. Concurrent callers share one
 * in-flight read — an agent fires several tools at once, and three parallel
 * cold starts would otherwise mean three fetches of the same document.
 */
export function createCatalogSource(options: CatalogSourceOptions = {}) {
  const source = resolveSource(options);
  const fetchImpl = options.fetchImpl ?? fetch;
  const now = options.now ?? Date.now;

  let cached: RegistryCatalog | undefined;
  let loadedAt = 0;
  let inFlight: Promise<RegistryCatalog> | undefined;

  return {
    source,
    async get(): Promise<RegistryCatalog> {
      if (cached && now() - loadedAt < CATALOG_TTL_MS) return cached;
      inFlight ??= read(source, fetchImpl, options.timeoutMs ?? FETCH_TIMEOUT_MS, options.retryDelays ?? RETRY_DELAYS_MS)
        .then((catalog) => {
          cached = catalog;
          loadedAt = now();
          return catalog;
        })
        .catch((err) => {
          // A copy that has only aged out still answers, and is tried again a minute on (STALE_RETRY_MS).
          if (!cached) throw new CatalogLoadError(source, err);
          loadedAt = now() - CATALOG_TTL_MS + STALE_RETRY_MS;
          return cached;
        })
        .finally(() => {
          inFlight = undefined;
        });
      return inFlight;
    },
  };
}

export type CatalogSource = ReturnType<typeof createCatalogSource>;
