/**
 * An item's fact card: what someone (or their agent) wants to know before
 * adding it, from data the build already holds. Its weight is measured when
 * the registry is built; the rest is the meta the docs page, `docs` and the
 * MCP server already read, so the card can't say something the page doesn't.
 */
import type { CatalogComponent } from "./catalog";
import { installName } from "./guidance";

/** A line that says which keys do what: the keyboard half of the card. */
export const KEYS = /\b(Space|Enter|Escape|Esc|Tab|Arrow|Home|End|Page ?Up|Page ?Down|Backspace|type-?ahead|keyboard)\b|[←→↑↓]/i;

/** Bytes as a reader says them: "3.2 KB". */
export function kb(bytes: number): string {
  return bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`;
}

export interface FactCard {
  version?: string;
  weight?: CatalogComponent["weight"];
  /** npm packages it needs besides echo-ui-core, which everything needs. */
  npm: string[];
  /** Echo items it brings with it. */
  items: string[];
  keyboard: string[];
  reducedMotion?: string;
  sound: readonly string[];
}

export function factCard(c: CatalogComponent): FactCard {
  return {
    ...(c.version ? { version: c.version } : {}),
    ...(c.weight ? { weight: c.weight } : {}),
    npm: c.dependencies.filter((d) => d !== "echo-ui-core"),
    items: c.registryDependencies.map((d) => installName(d.replace(/^@echo\//, ""))),
    keyboard: (c.a11y ?? []).filter((line) => KEYS.test(line)),
    ...(c.motion?.reducedMotion ? { reducedMotion: c.motion.reducedMotion } : {}),
    sound: c.sound ?? [],
  };
}

/** The weight in one line, for text: "1.2 KB; 34.8 KB with what it imports; 0.8 KB of CSS (gzipped)". */
export function weightLine(weight: NonNullable<CatalogComponent["weight"]>): string {
  const deps = weight.withDependencies > weight.js ? `; ${kb(weight.withDependencies)} with what it imports` : "";
  const css = weight.css ? `; ${kb(weight.css)} of CSS` : "";
  return `${kb(weight.js)}${deps}${css} (minified and gzipped, React not counted)`;
}
