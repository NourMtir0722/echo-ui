/**
 * The docs fields a meta.ts can carry beyond the core
 * description / props / examples / antiPatterns.
 *
 * They live on the meta, not on the docs site, so the page a person reads,
 * llms-full.txt and the MCP server's get_component all say the same thing.
 * Which fields each item type must fill is enforced by the completeness test
 * (scripts/docs/completeness.test.ts), not by these types — an item mid-way
 * through the docs rewrite is allowed to be partial, and that test tracks it.
 */

/** The smallest working use of an item, as a reader would type it. */
export interface MetaUsage {
  /**
   * The import lines, exactly as they appear in the reader's project
   * (`import { Tabs } from "@/echo/tabs";`). The snippet test compiles these
   * as written, so a wrong path or a renamed export fails the build.
   */
  imports: string;
  /** JSX or statements; the same wrapping rules as examples. */
  code: string;
}

export interface MetaDocsFields {
  usage?: MetaUsage;
  /**
   * The part tree, one part per line, indented two spaces per level:
   * "Tabs\n  Tabs.List\n    Tabs.Tab\n  Tabs.Panel". A single-element
   * component is just its own name.
   */
  composition?: string;
  /** Keyboard, ARIA shape and naming requirements, one fact per entry. */
  a11y?: readonly string[];
  /** Which motion tokens it uses, and what reduced motion does to it. */
  motion?: { tokens: readonly string[]; reducedMotion: string };
  /** Which sound tokens it plays, and on what. */
  sound?: readonly string[];
  /** One plain-language line for designers: what it feels like to use. */
  feel?: string;
}
