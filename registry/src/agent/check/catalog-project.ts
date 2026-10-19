/**
 * The check's model of a project, from the catalog alone, for code handed
 * over as text with no project around it (the MCP server's check_code). The
 * default theme stands in for the project's, and an import reaches an Echo
 * item when its path does (`@/components/echo/switch`, `../echo/switch`).
 */
import { createEchoTheme } from "echo-ui-core/theme";

import type { RegistryCatalog } from "../catalog";
import { installName } from "../guidance";
import { themeRoles } from "./colour";
import type { CheckProject } from "./model";

export function catalogProject(catalog: RegistryCatalog): CheckProject {
  const theme = createEchoTheme({}, { quiet: true }).css;
  return {
    root: "",
    framework: "next",
    echoDir: "echo",
    themeFile: "",
    catalog,
    items: new Map(catalog.components.map((c) => [installName(c.name), c])),
    roles: themeRoles(theme, catalog.tokens.colorRoles),
    htmlAttributes: new Set(catalog.htmlAttributes ?? []),
    materials: new Set(catalog.materials ?? []),
    themeTokens: new Set([...theme.matchAll(/(--echo-[\w-]+)\s*:/g)].map((m) => m[1]!)),
    team: {},
    classOwners: new Map(),
    resolve: (_from, specifier) => {
      const m = /(?:^|\/)echo\/([a-z0-9-]+)(?:\/|$)/.exec(specifier);
      return m ? `echo/${m[1]}` : undefined;
    },
  };
}
