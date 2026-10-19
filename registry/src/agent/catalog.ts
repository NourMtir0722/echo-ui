/**
 * Agent catalog — the data shapes for the MCP server,
 * scaffolded now so llms.txt, the docs, and the future server all read one
 * model. The MCP server is a thin reader over these shapes; it is NOT built
 * here, but its tool contracts (search_components / get_component /
 * get_tokens / get_examples) are the pure functions below.
 */

import type { CatalogProp } from "./props";
import type { MetaDocsFields } from "./meta-types";

export type { CatalogProp } from "./props";

export interface CatalogExample {
  title: string;
  description: string;
  code: string;
}

/**
 * The docs fields (usage, composition, a11y, motion, sound, feel) ride along
 * from meta.ts unchanged. They stay optional here even once every meta fills
 * them: the MCP server reads whatever catalog.json is published, and one built
 * before these fields existed has to render, not crash.
 */
/**
 * One exported component's API, read from its TypeScript types when the
 * registry is built: what a check needs to tell a prop the component takes
 * from one an agent invented, and a named control from an unnamed one, the
 * same way the type checker would.
 */
export interface ComponentApi {
  /**
   * Every prop it takes, apart from `aria-*` and `data-*` (always taken) and,
   * when `html` is set, the standard HTML attributes in the catalog's
   * `htmlAttributes`.
   */
  props: string[];
  /** It also takes the standard HTML attributes. */
  html?: boolean;
  /** Props it can't go without, apart from its name. */
  required?: string[];
  /**
   * It needs a name: at least one of `anyOf`. With `when`, only while that
   * prop is true (an icon-only button).
   */
  name?: { anyOf: string[]; when?: string };
}

export interface CatalogComponent extends MetaDocsFields {
  name: string;
  title: string;
  /**
   * The item's `/e/` version, the one `add` would install today. A reader that
   * checks code against this entry compares it with the version the project
   * installed (`echo-lock.json`), so a prop added in a newer version isn't held
   * against a project that has the older one. Absent for the `echo-ui-core`
   * modules, which install from npm, and in catalogs built before it existed.
   */
  version?: string;
  /** The meta.ts description — the same text the component's docs page shows. */
  description: string;
  /**
   * registry.json's one-line description, for listings (llms.txt, search
   * results) where a paragraph per item is too much. Absent when it would only
   * repeat `description`, and in catalogs built before it existed.
   */
  summary?: string;
  /**
   * The docs group it's listed under ("Motion", "Forms", …), the same as
   * the site's sidebar. Absent in catalogs built before it existed.
   */
  group?: string;
  /** The item's kind: registry:component | registry:lib | registry:hook. */
  type: string;
  dependencies: string[];
  registryDependencies: string[];
  /** Ready-to-run install command. */
  install: string;
  /** The component's props, flattened from its meta's zod schema. */
  props: CatalogProp[];
  examples: CatalogExample[];
  antiPatterns: string[];
  /**
   * Each component the item exports, by the name it's imported as
   * (`Switch`, `Tabs`, and a compound's parts as `Tabs.List`). Absent for
   * items that export no component, and in catalogs built before it existed.
   */
  api?: Record<string, ComponentApi>;
  /**
   * What it costs a page, minified and gzipped, in bytes: its own code (with
   * the Echo items it brings), the same with everything it imports but React,
   * and its CSS. Measured when the registry is built. Absent in catalogs built
   * before it.
   */
  weight?: { js: number; withDependencies: number; css: number; gpu?: boolean };
}

export interface CatalogTokens {
  /** Layer-3 semantic color roles (--echo-*). */
  colorRoles: string[];
  /** Sound token names. */
  sound: string[];
  /** Motion token names. */
  motion: string[];
  /*
   * The rest of the motion vocabulary a component's record can name. Optional
   * because a catalog built before they were listed has to still load.
   */
  /** Spring presets (`springs.<name>`), for createSpring. */
  springs?: string[];
  /** Morph feels (`morphFeels.<name>`): how a Morph's body divides and joins. */
  morphFeels?: string[];
  /** CSS duration steps, `--echo-duration-*`. */
  durations?: string[];
  /** CSS easing steps, `--echo-ease-*`. */
  eases?: string[];
  /**
   * Shadow recipes, `--echo-shadow-*`: the depths Echo's own parts use, for
   * a part of your own. Absent in catalogs built before them.
   */
  shadows?: CatalogShadow[];
}

export interface CatalogShadow {
  /** `--echo-shadow-<name>`. */
  token: string;
  kind: "recessed" | "raised" | "floating" | "focus" | "glow";
  /** What it's for. */
  use: string;
}

/**
 * The catalog's format, for anything that keeps a copy. A reader that meets a
 * format newer than it knows says so, instead of reading fields it would
 * misunderstand. Additions keep the number; a change to what an existing field
 * means moves it. A catalog without one predates versioning and reads as 0.
 */
export const CATALOG_VERSION = 1;

export interface RegistryCatalog {
  /** See CATALOG_VERSION. Absent in catalogs built before it existed. */
  catalogVersion?: number;
  name: string;
  homepage: string;
  components: CatalogComponent[];
  tokens: CatalogTokens;
  /**
   * The standard HTML attribute names, which a component whose `api` says
   * `html` takes on top of its own props. Absent in catalogs built before it.
   */
  htmlAttributes?: string[];
  /**
   * The material recipe classes `echo-ui-core/theme/material.css` ships for
   * anyone to use (`echo-chassis`, `echo-screen-well`), as opposed to the
   * classes that belong to one component. Absent in catalogs built before it.
   */
  materials?: string[];
}

/* ---------------------------------------------- MCP tool contracts (thin) --- */

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** "HardwareButton" -> "Hardware Button", so a camelCase title is searchable by its parts. */
const decamelize = (s: string) => s.replace(/([a-z0-9])([A-Z])/g, "$1 $2");

/**
 * Does `field` contain `query` at the START of a word?
 *
 * A plain `includes` looked reasonable until the server shipped: searching
 * "led" returned Breadcrumb ("labelled") and Tag ("peeled") alongside the six
 * components that actually have LEDs. Anchoring at a word boundary is what
 * separates a match from a coincidence, and decamelize keeps "button" matching
 * "HardwareButton".
 */
function matchesWord(field: string, query: string): boolean {
  const pattern = new RegExp(`(^|[^a-z0-9])${escapeRegExp(query)}`, "i");
  return pattern.test(field) || pattern.test(decamelize(field));
}

/** Words a search is phrased with that say nothing about which component. */
const FILLER = new Set(["a", "an", "the", "for", "with", "of", "to", "and", "or", "in", "on", "that", "my", "i", "component", "components", "ui", "echo"]);

/** A word without its ending, so "tuning" finds "Tuner" and "keys" finds "keypad". */
function stem(word: string): string {
  if (word.length > 5 && word.endsWith("ing")) return word.slice(0, -3);
  if (word.length > 4 && (word.endsWith("ed") || word.endsWith("es"))) return word.slice(0, -2);
  if (word.length > 3 && word.endsWith("s") && !word.endsWith("ss")) return word.slice(0, -1);
  return word;
}

/** One component's place in a search, and how sure the match is. */
export interface RankedComponent {
  component: CatalogComponent;
  score: number;
  /**
   * The match is on what the item is, not on a word its description happens
   * to use: the whole query names it or its group, or every word of the query
   * matches and at least one of them is in its name.
   */
  strong: boolean;
}

/**
 * search_components — word-anchored match over name/title/description,
 * ranked so the component someone named comes first. A query that names a
 * group ("motion") lists that group next, before items that only mention it.
 *
 * A query in several words is also read word by word: agents search
 * in the words they'd describe a thing with ("radio tuning scale"), which
 * rarely sit in a description in that order. An item has to match at least
 * half of them, so one common word doesn't list the whole library; a match
 * on the whole phrase still ranks above any word-by-word one.
 */
export function rankComponents(catalog: RegistryCatalog, query: string): RankedComponent[] {
  const q = query.trim().toLowerCase();
  if (!q) return catalog.components.map((component) => ({ component, score: 0, strong: false }));
  const words = [...new Set(q.split(/[^a-z0-9]+/).filter((w) => w && !FILLER.has(w)).map(stem))];

  const phrase = (c: CatalogComponent, text: string): number => {
    const name = c.name.toLowerCase();
    const title = c.title.toLowerCase();
    if (name === text || title === text || name === `echo-${text}`) return 4;
    if (matchesWord(c.name, text) || matchesWord(c.title, text) || c.group?.toLowerCase() === text) return 3;
    if (matchesWord(c.description, text) || (c.summary && matchesWord(c.summary, text))) return 2;
    return 0;
  };

  const score = (c: CatalogComponent): { score: number; strong: boolean } => {
    const whole = phrase(c, q);
    if (whole > 0) return { score: whole * 10, strong: whole >= 3 };
    if (words.length < 2) return { score: 0, strong: false };
    const per = words.map((w) => phrase(c, w));
    const matched = per.filter((n) => n > 0).length;
    if (matched * 2 < words.length) return { score: 0, strong: false };
    return { score: per.reduce((a, b) => a + b, 0), strong: matched === words.length && per.some((n) => n >= 3) };
  };

  return catalog.components
    .map((component) => ({ component, ...score(component) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || catalog.components.indexOf(a.component) - catalog.components.indexOf(b.component));
}

/** The components a query matches, best first: `rankComponents` without the scores. */
export function searchComponents(catalog: RegistryCatalog, query: string): CatalogComponent[] {
  if (!query.trim()) return catalog.components;
  return rankComponents(catalog, query).map((row) => row.component);
}

/** get_component — a single component by exact name. */
export function getComponent(catalog: RegistryCatalog, name: string): CatalogComponent | null {
  return catalog.components.find((c) => c.name === name) ?? null;
}

/** get_tokens — the token families (color roles, sound, motion and the rest of motion's vocabulary). */
export function getTokens(catalog: RegistryCatalog): CatalogTokens {
  return catalog.tokens;
}

/** get_examples — usage examples for a component. */
export function getExamples(catalog: RegistryCatalog, name: string): CatalogExample[] {
  return getComponent(catalog, name)?.examples ?? [];
}
