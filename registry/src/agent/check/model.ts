/**
 * What `check` knows about a project before it reads a file, as data: where
 * Echo's folder is, what's installed, the catalog, the theme's roles and
 * tokens, the team's rules, and how an import resolves.
 *
 * Nothing here reads a disk. The CLI builds this from the project it's run in
 * (packages/cli/src/check/project.ts); the MCP server builds it from the
 * catalog alone, for code it's handed as text. The rules only ever see this.
 */
import type { CatalogComponent, RegistryCatalog } from "../catalog";
import type { TeamRules } from "../config-schema";
import type { RoleColour } from "./colour";

/** What `echo-lock.json` records, as far as the rules need it. */
export interface InstalledItems {
  items: Record<string, { version: string; files: Record<string, string> }>;
}

export interface CheckProject {
  root: string;
  /** What the project is built with, from echo.json: how a part is loaded lazily depends on it. */
  framework: string;
  /** The Echo folder, relative, with forward slashes. */
  echoDir: string;
  /** The theme file `init` wrote, where colour values belong. */
  themeFile: string;
  catalog: RegistryCatalog;
  /** Catalog entries by the name they're installed under (`switch`). */
  items: Map<string, CatalogComponent>;
  lock?: InstalledItems;
  roles: RoleColour[];
  htmlAttributes: ReadonlySet<string>;
  materials: ReadonlySet<string>;
  /** Every custom property the theme declares (`--echo-accent`, `--echo-space-4`…): the seed's to set, nobody else's. */
  themeTokens: ReadonlySet<string>;
  /** The team's own rules, from echo.json's `check`. */
  team: TeamRules;
  /** What the builder kept of what the slop police bans (the worn style's `keeps`): not flagged. */
  keeps?: ReadonlySet<string>;
  /** An Echo component class (`echo-hw__cap`) → the item whose CSS defines it. */
  classOwners: Map<string, string>;
  /** Where an import lands, relative to the root with forward slashes, or undefined for a package. */
  resolve(fromFile: string, specifier: string): string | undefined;
}

/** The item an import lands in, when it lands inside the Echo folder. */
export function echoItem(project: CheckProject, fromFile: string, specifier: string): string | undefined {
  const path = project.resolve(fromFile, specifier);
  if (!path || !path.startsWith(`${project.echoDir}/`)) return undefined;
  return path.slice(project.echoDir.length + 1).split("/")[0];
}
