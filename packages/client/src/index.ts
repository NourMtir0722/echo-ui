/**
 * The `/e/` registry client: fetching, verifying and
 * resolving items. Bundled into `echo-ui-cli` and `echo-ui-mcp` rather than
 * published, so the two can never disagree about what an item is.
 *
 * Nothing here touches the disk. The CLI decides what to write; this decides
 * what is true. Whoever serves the registry is not trusted with the user's
 * machine: paths are checked, hashes are checked, and only https is fetched.
 */
import { createHash } from "node:crypto";

import { CATALOG_VERSION, type RegistryCatalog } from "@registry/agent/catalog";

export type { RegistryCatalog } from "@registry/agent/catalog";
import { parseStyle, type EchoStyle, type Fingerprint } from "@registry/agent/style-schema";
export { merge3, type Merged, type MergeConflict } from "./merge";

export const SCHEMA_VERSION = 1;

export interface EFile {
  path: string;
  sha256: string;
  content: string;
}

export interface EItem {
  schemaVersion: number;
  name: string;
  version: string;
  kind: "component" | "block" | "module";
  title: string;
  description: string;
  core: string;
  dependencies: Record<string, string>;
  items: string[];
  files: EFile[];
  setup: string[];
  motion: string[];
  sound: string[];
  a11y: { standard: string; tested: string[]; limits: string[] };
  changes: { version: string; flags: string[]; summary: string }[];
}

export interface EIndex {
  schemaVersion: number;
  version: string;
  core: string;
  items: { name: string; version: string; kind: EItem["kind"]; title: string; description: string; items: string[] }[];
}

export class RegistryError extends Error {}

/**
 * `s` without the slashes it ends in. Counted from the end, not /\/+$/: that
 * pattern is quadratic on a long run of slashes that isn't at the end, and an
 * address can come from anyone's echo.json.
 */
export function withoutTrailingSlashes(s: string): string {
  let end = s.length;
  while (end > 0 && s.charCodeAt(end - 1) === 47) end--;
  return s.slice(0, end);
}

/** A style in Echo's library, as the index lists it. */
export interface EStyleSummary {
  name: string;
  title: string;
  essence: string;
  fingerprint: Fingerprint;
}

/** Hashing matches the build and the lock file: LF-normalised, so OS line endings don't matter. */
export function hashContent(content: string): string {
  return createHash("sha256").update(content.replace(/\r\n/g, "\n"), "utf8").digest("hex");
}

/**
 * A path the CLI may write inside the user's Echo folder. Checked again here,
 * not just in the build: a registry could be a mirror, a staging copy, or
 * simply wrong, and none of them get to write outside the folder.
 */
export function isSafeItemPath(path: string): boolean {
  if (path.length === 0 || path.startsWith("/") || path.startsWith("\\")) return false;
  if (/^[a-zA-Z]:/.test(path)) return false;
  if (path.includes("\0")) return false;
  return !path.split(/[/\\]/).some((segment) => segment === ".." || segment === "." || segment === "");
}

/**
 * https only — except a local registry for tests and development, which has to
 * be asked for explicitly with `--registry`. A remote http URL is refused
 * rather than silently downgraded.
 */
export function assertFetchableRegistry(registry: string): void {
  let url: URL;
  try {
    url = new URL(registry);
  } catch {
    throw new RegistryError(`Not a registry URL: ${registry}`);
  }
  if (url.protocol === "https:") return;
  if (url.protocol === "file:") return;
  if (url.protocol === "http:" && (url.hostname === "localhost" || url.hostname === "127.0.0.1")) return;
  throw new RegistryError(`Refusing to read a registry over ${url.protocol} — https only (${registry}).`);
}

export interface Fetcher {
  (url: string): Promise<string>;
}

/**
 * How long one read of the registry may take, the body included. Every
 * document it serves is a few hundred kilobytes at most, so a read past this
 * is a host that has stopped answering, and without a limit of its own it held
 * the CLI and the MCP server for Node's five minutes.
 */
export const FETCH_TIMEOUT_MS = 30_000;

/**
 * How long a read waits before each new try, after a dropped connection or a
 * status in RETRY_STATUSES: each three times the last. One reset connection or
 * one 502 from the edge used to fail a whole `add`; a host that's
 * really down is still said to be, two seconds later. A host that stops
 * answering isn't tried again: the time limit has said so, and three of them
 * would be a minute and a half.
 */
export const RETRY_DELAYS_MS: readonly number[] = [500, 1500];

/** The server's own trouble, or "slow down": worth asking again. Anything else, a 404 included, is an answer. */
const RETRY_STATUSES = new Set([408, 429, 500, 502, 503, 504]);

/** The longest a `Retry-After` is waited for. */
const MAX_RETRY_AFTER_MS = 10_000;

export interface ReadOptions {
  /** For each try, the body included. */
  timeoutMs?: number;
  headers?: Record<string, string>;
  /** The wait before each new try; `[]` tries once. */
  retryDelays?: readonly number[];
  /** Injected in tests; defaults to global fetch. */
  fetchImpl?: typeof fetch;
}

/** What went wrong under Node's bare "fetch failed": its cause's code (`ECONNRESET`), or the cause's message. */
function failure(error: unknown): string {
  const cause = (error as { cause?: { code?: string; message?: string; errors?: { code?: string }[] } }).cause;
  const detail = cause?.code ?? cause?.errors?.[0]?.code ?? cause?.message;
  const said = error instanceof Error ? error.message : String(error);
  return detail && detail !== said ? `${said} (${detail})` : said;
}

/** Seconds in a `Retry-After`, as milliseconds, held to MAX_RETRY_AFTER_MS. A date, or nothing, is undefined. */
function retryAfter(response: Response): number | undefined {
  const seconds = Number(response.headers?.get("retry-after") ?? NaN);
  return Number.isFinite(seconds) && seconds >= 0 ? Math.min(seconds * 1000, MAX_RETRY_AFTER_MS) : undefined;
}

/**
 * One document over http(s), as text: each try within `timeoutMs`, and a
 * dropped connection or a status in RETRY_STATUSES tried again after each of
 * `retryDelays`. Every way it fails is a RegistryError that names the URL.
 */
export async function readUrl(url: string, options: ReadOptions = {}): Promise<string> {
  const { timeoutMs = FETCH_TIMEOUT_MS, headers, retryDelays = RETRY_DELAYS_MS, fetchImpl = fetch } = options;
  for (let tries = 1; ; tries++) {
    const last = tries > retryDelays.length;
    const triedText = tries > 1 ? `, after ${tries} tries` : "";
    const signal = AbortSignal.timeout(timeoutMs);
    let wait = retryDelays[tries - 1] ?? 0;
    try {
      const response = await fetchImpl(url, { headers, signal });
      if (response.ok) return await response.text();
      if (last || !RETRY_STATUSES.has(response.status)) {
        throw new RegistryError(`${response.status} ${response.statusText} for ${url}${triedText}`);
      }
      await response.body?.cancel().catch(() => {});
      wait = retryAfter(response) ?? wait;
    } catch (error) {
      if (error instanceof RegistryError) throw error;
      if (signal.aborted) throw new RegistryError(`${url} didn't answer within ${timeoutMs / 1000} seconds.`);
      if (last) throw new RegistryError(`Could not reach ${url}: ${failure(error)}${triedText}.`);
    }
    await new Promise((done) => setTimeout(done, wait));
  }
}

/** Reads a registry URL with readUrl, or a local file for `file:` (tests, offline work). */
export function createFetcher(timeoutMs = FETCH_TIMEOUT_MS, options: Omit<ReadOptions, "timeoutMs"> = {}): Fetcher {
  return async (url) => {
    if (url.startsWith("file:")) {
      const { readFile } = await import("node:fs/promises");
      const { fileURLToPath } = await import("node:url");
      return readFile(fileURLToPath(url), "utf8");
    }
    return readUrl(url, { ...options, timeoutMs });
  };
}

export const defaultFetcher: Fetcher = createFetcher();

export class RegistryClient {
  readonly registry: string;
  private readonly fetcher: Fetcher;
  private readonly cache = new Map<string, unknown>();

  constructor(registry: string, fetcher: Fetcher = defaultFetcher) {
    assertFetchableRegistry(registry);
    this.registry = withoutTrailingSlashes(registry);
    this.fetcher = fetcher;
  }

  private async json<T>(path: string): Promise<T> {
    const cached = this.cache.get(path);
    if (cached) return cached as T;
    const url = `${this.registry}/${path}`;
    let parsed: unknown;
    try {
      parsed = JSON.parse(await this.fetcher(url));
    } catch (error) {
      if (error instanceof RegistryError) throw error;
      throw new RegistryError(`Could not read ${url}: ${(error as Error).message}`);
    }
    this.cache.set(path, parsed);
    return parsed as T;
  }

  async index(): Promise<EIndex> {
    const index = await this.json<EIndex>("index.json");
    if (index.schemaVersion !== SCHEMA_VERSION) {
      throw new RegistryError(
        `This registry speaks schema ${index.schemaVersion}; this CLI speaks ${SCHEMA_VERSION}. Update echo-ui-cli.`,
      );
    }
    return index;
  }

  /** Echo's own styles, as `style list` shows them. */
  async styles(): Promise<EStyleSummary[]> {
    return (await this.json<{ styles: EStyleSummary[] }>("styles/index.json")).styles;
  }

  /** One of Echo's styles, checked before you see it. */
  async style(name: string): Promise<EchoStyle> {
    // A name is lower case and hyphens: nothing that could climb out of `styles/`.
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name)) throw new RegistryError(`"${name}" isn't a style name.`);
    const read = parseStyle(await this.json<unknown>(`styles/${name}.json`));
    if (!read.style) throw new RegistryError(`${this.registry}/styles/${name}.json isn't a style: ${read.problems.join(" ")}`);
    return read.style;
  }

  /** One item, latest or at an exact version. Its files are verified before you see them. */
  async item(name: string, version?: string): Promise<EItem> {
    // `%40`, not `@`: Cloudflare redirects the one to the other, and only the
    // second is served under the pinned file's immutable rule.
    const item = await this.json<EItem>(version ? `${name}%40${version}.json` : `${name}.json`);
    verifyItem(item);
    return item;
  }
}

/** Every file hashes to what the item says, and lands where it says. */
export function verifyItem(item: EItem): void {
  if (item.schemaVersion !== SCHEMA_VERSION) {
    throw new RegistryError(`${item.name}: schema ${item.schemaVersion}, expected ${SCHEMA_VERSION}`);
  }
  for (const file of item.files) {
    if (!isSafeItemPath(file.path)) {
      throw new RegistryError(`${item.name}: refusing to install ${file.path} — it leaves the Echo folder.`);
    }
    const actual = hashContent(file.content);
    if (actual !== file.sha256) {
      throw new RegistryError(
        `${item.name}: ${file.path} does not match its hash. The registry served something other than what it published.`,
      );
    }
  }
}

/**
 * Every item a request needs, dependencies first, each once.
 *
 * Order matters for what the CLI prints (you install HardwareButton because
 * Auth needs it), and the cycle check is here because a registry that
 * contradicts itself should stop the install, not the user's build.
 */
export async function resolveItems(client: RegistryClient, names: readonly string[]): Promise<EItem[]> {
  const out: EItem[] = [];
  const seen = new Set<string>();
  const visiting = new Set<string>();

  const visit = async (name: string, trail: string[]): Promise<void> => {
    if (seen.has(name)) return;
    if (visiting.has(name)) {
      throw new RegistryError(`The registry has a dependency cycle: ${[...trail, name].join(" → ")}`);
    }
    visiting.add(name);
    const item = await client.item(name);
    for (const dep of item.items) await visit(dep, [...trail, name]);
    visiting.delete(name);
    seen.add(name);
    out.push(item);
  };

  for (const name of names) await visit(name, []);
  return out;
}

/* ------------------------------------------------------------------ semver */

type Version = [number, number, number];

function parseVersion(value: string): Version {
  const match = /^(\d+)\.(\d+)\.(\d+)/.exec(value.trim());
  if (!match) throw new RegistryError(`Not a version: ${value}`);
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

export function compareVersions(a: string, b: string): number {
  const [x, y] = [parseVersion(a), parseVersion(b)];
  for (let i = 0; i < 3; i++) {
    if (x[i]! !== y[i]!) return x[i]! < y[i]! ? -1 : 1;
  }
  return 0;
}

/**
 * Whether a version satisfies a range like `>=0.1.0 <0.2.0`.
 *
 * Deliberately not a semver library: the format only ever emits comparator
 * ranges, and the CLI's only dependency should be Node itself.
 */
export function satisfies(version: string, range: string): boolean {
  const comparators = range.trim().split(/\s+/);
  for (let i = 0; i < comparators.length; i++) {
    const part = comparators[i]!;
    // The operator, then a version that starts as x.y.z: read in one pass, whatever follows.
    const op = /^(?:>=|<=|>|<|=)/.exec(part)?.[0] ?? "=";
    const target = part.slice(op === "=" && !part.startsWith("=") ? 0 : op.length);
    if (!/^\d+\.\d+\.\d+/.test(target)) throw new RegistryError(`Cannot read the range "${range}"`);
    const cmp = compareVersions(version, target);
    const ok =
      op === ">=" ? cmp >= 0 : op === "<=" ? cmp <= 0 : op === ">" ? cmp > 0 : op === "<" ? cmp < 0 : cmp === 0;
    if (!ok) return false;
  }
  return true;
}

/* ----------------------------------------------------------------- catalog */

/**
 * The catalog that describes the items `/e/` serves: their props, examples and
 * anti-patterns, which the CLI's `which`, `docs` and `check` answer from. It
 * sits beside `/e/` as `/r/catalog.json`, on the site and in a local build
 * alike, so a registry setting moves both.
 */
export function catalogUrl(registry: string): string {
  assertFetchableRegistry(registry);
  return new URL("../r/catalog.json", `${withoutTrailingSlashes(registry)}/`).href;
}

/**
 * A catalog read from text, refused if its format is newer than this client
 * knows. A catalog from before the format was versioned reads as 0 and is
 * fine: every field added since is optional.
 */
export function parseCatalog(text: string, source: string): RegistryCatalog {
  let catalog: RegistryCatalog;
  try {
    catalog = JSON.parse(text) as RegistryCatalog;
  } catch (error) {
    throw new RegistryError(`${source} is not a catalog: ${(error as Error).message}`);
  }
  if (!catalog || !Array.isArray(catalog.components)) throw new RegistryError(`${source} is not a catalog: it lists no components.`);
  const format = catalog.catalogVersion ?? 0;
  if (format > CATALOG_VERSION) {
    throw new RegistryError(
      `${source} is catalog format ${format}; this CLI reads up to ${CATALOG_VERSION}. Update echo-ui-cli.`,
    );
  }
  return catalog;
}

/** The catalog for a registry, fetched the way its items are (https, or a file: build). */
export async function fetchCatalog(registry: string, fetcher: Fetcher = defaultFetcher): Promise<RegistryCatalog> {
  const url = catalogUrl(registry);
  let text: string;
  try {
    text = await fetcher(url);
  } catch (error) {
    if (error instanceof RegistryError) throw error;
    throw new RegistryError(`Could not read ${url}: ${(error as Error).message}`);
  }
  return parseCatalog(text, url);
}
