/**
 * The `/e/` registry, read through the same client the CLI uses.
 *
 * The catalog (`/r/catalog.json`) is what a component *is* — its props, its
 * examples, its anti-patterns. This is what a component *ships as*: the version
 * a user would install, the `echo-ui-core` range it needs, the packages it
 * pulls in, the setup it requires and what its accessibility was tested
 * against. An agent needs both, and they come from different documents.
 *
 * Reading it with `@echo-ui/client` rather than a second fetcher is the whole
 * point: the MCP cannot tell an agent something the CLI would then contradict,
 * because the two parse, verify and resolve with one piece of code. Hashes are
 * checked here too — an answer built from a file that isn't what was published
 * is worse than no answer.
 */
import { RegistryClient, RegistryError, type EIndex, type EItem, type EStyleSummary, type Fetcher } from "@echo-ui/client";

import { REGISTRY_HOMEPAGE } from "@registry/agent/guidance";
import type { EchoStyle } from "@registry/agent/style-schema";

/**
 * Where `npx echo-ui-cli` reads from by default, and so where this does too.
 * `packages/cli/src/project.ts` declares the same URL for the CLI; they are
 * kept in step by `identity.test.ts`, which is why neither spells the host.
 */
export const DEFAULT_REGISTRY = `${REGISTRY_HOMEPAGE}/e`;

/** How long the index is trusted before it is read again. */
export const REGISTRY_TTL_MS = 5 * 60 * 1000;

/**
 * How long a copy that has only aged out keeps answering, once a fresh read
 * has failed, before it's tried again. Echo's documents change only with a
 * release, so a copy from minutes ago is still right, and answering with it
 * beats every tool failing while the site can't be reached. Not every call
 * pays a timeout meanwhile: it's tried once a minute.
 */
export const STALE_RETRY_MS = 60 * 1000;

export interface RegistrySourceOptions {
  /** Overrides ECHO_REGISTRY and the default. A `file:` URL runs against a local build. */
  registry?: string;
  /** Injected in tests; defaults to the client's own https/file fetcher. */
  registryFetcher?: Fetcher;
  now?: () => number;
}

export function resolveRegistry(options: RegistrySourceOptions = {}): string {
  return options.registry ?? process.env.ECHO_REGISTRY ?? DEFAULT_REGISTRY;
}

/**
 * The index, cached for a TTL, and items cached for the life of the process.
 *
 * An item at a given version is immutable by the format's own rule, and the
 * only mutable documents are the index and each `{name}.json`, which points at
 * the latest. So items are read at the version the index names, and the index
 * is the only thing with an expiry. The client keeps everything it has read,
 * so each index read gets a client of its own.
 */
export function createRegistrySource(options: RegistrySourceOptions = {}) {
  const registry = resolveRegistry(options);
  const now = options.now ?? Date.now;
  const client = () => new RegistryClient(registry, options.registryFetcher);

  let index: EIndex | undefined;
  let loadedAt = 0;
  let inFlight: Promise<EIndex> | undefined;
  const items = new Map<string, Promise<EItem>>();
  // Echo's styles change only with a release, like the index, and are read again after the same time.
  let styleList: { at: number; styles: EStyleSummary[] } | undefined;
  const styleFiles = new Map<string, { at: number; style: Promise<EchoStyle> }>();

  const source = {
    registry,
    async index(): Promise<EIndex> {
      if (index && now() - loadedAt < REGISTRY_TTL_MS) return index;
      inFlight ??= client()
        .index()
        .then((loaded) => {
          index = loaded;
          loadedAt = now();
          return loaded;
        })
        .catch((error: unknown) => {
          if (!index) throw error;
          loadedAt = now() - REGISTRY_TTL_MS + STALE_RETRY_MS;
          return index;
        })
        .finally(() => {
          inFlight = undefined;
        });
      return inFlight;
    },
    /** One item at the version the index names, verified. Undefined when the registry doesn't serve it. */
    async item(name: string): Promise<EItem | undefined> {
      let version: string | undefined;
      try {
        version = (await source.index()).items.find((i) => i.name === name)?.version;
      } catch {
        return undefined;
      }
      if (!version) return undefined;
      const key = `${name}@${version}`;
      const pending = items.get(key) ?? client().item(name, version);
      items.set(key, pending);
      try {
        return await pending;
      } catch (error: unknown) {
        // A name that isn't there is an answer, not a failure. A file that
        // doesn't match its hash is a failure, and has to be said out loud.
        items.delete(key);
        if (error instanceof RegistryError && /does not match its hash|refusing to install/.test(error.message)) {
          throw error;
        }
        return undefined;
      }
    },
    /** Echo's published styles, as `style list` shows them. */
    async styles(): Promise<EStyleSummary[]> {
      if (styleList && now() - styleList.at < REGISTRY_TTL_MS) return styleList.styles;
      try {
        const styles = await client().styles();
        styleList = { at: now(), styles };
        return styles;
      } catch (error) {
        if (!styleList) throw error;
        styleList.at = now() - REGISTRY_TTL_MS + STALE_RETRY_MS;
        return styleList.styles;
      }
    },
    /** One of Echo's styles, checked as `style use` checks it. A name Echo doesn't publish throws. */
    async style(name: string): Promise<EchoStyle> {
      const cached = styleFiles.get(name);
      if (cached && now() - cached.at < REGISTRY_TTL_MS) return cached.style;
      const style = client().style(name);
      styleFiles.set(name, { at: now(), style });
      try {
        return await style;
      } catch (error) {
        // A style that read before keeps answering for now; one that never did is an answer of its own.
        const kept = cached && (await cached.style.then(() => true, () => false));
        if (!kept) {
          styleFiles.delete(name);
          throw error;
        }
        styleFiles.set(name, { at: now() - REGISTRY_TTL_MS + STALE_RETRY_MS, style: cached.style });
        return cached.style;
      }
    },
  };
  return source;
}

export type RegistrySource = ReturnType<typeof createRegistrySource>;
