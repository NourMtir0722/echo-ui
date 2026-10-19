/**
 * What `check` knows about the project before it reads a file: where Echo's
 * folder is, what's installed at which version, the catalog, the theme's
 * roles, how imports resolve, and which Echo class belongs to which item.
 */
import { readFile, readdir } from "node:fs/promises";
import { dirname, join, posix, relative, resolve, sep } from "node:path";
import { createEchoTheme } from "echo-ui-core/theme";
import { footprintItem } from "@registry/agent/footprint";
import { installName } from "@registry/agent/guidance";

import { loadCatalog } from "../catalog";
import { parseJsonc } from "../import-path";
import { DEFAULT_REGISTRY, readConfig, readLock } from "../project";
import { themeRoles } from "@registry/agent/check/colour";
import { readTeamRules } from "@registry/agent/check/team";
import type { CheckProject } from "@registry/agent/check/model";
import { withoutTrailingSlashes } from "@echo-ui/client";

export type { CheckProject } from "@registry/agent/check/model";
export { echoItem } from "@registry/agent/check/model";

export const toPosix = (path: string) => path.split(sep).join(posix.sep);

async function aliases(root: string): Promise<{ prefix: string; bases: string[] }[]> {
  for (const file of ["tsconfig.json", "jsconfig.json"]) {
    try {
      const config = parseJsonc(await readFile(join(root, file), "utf8")) as {
        compilerOptions?: { baseUrl?: string; paths?: Record<string, string[]> };
      };
      const options = config.compilerOptions ?? {};
      return Object.entries(options.paths ?? {})
        .filter(([alias]) => alias.endsWith("/*"))
        .map(([alias, targets]) => ({
          prefix: alias.slice(0, -1),
          bases: targets.filter((t) => t.endsWith("*")).map((t) => posix.join(options.baseUrl ?? ".", t.slice(0, -1))),
        }));
    } catch {
      /* next */
    }
  }
  return [];
}

/** Every `.echo-*` class each installed item's CSS defines, minus the shared material recipes. */
async function classOwners(root: string, echoDir: string, materials: ReadonlySet<string>): Promise<Map<string, string>> {
  const owners = new Map<string, string>();
  let entries;
  try {
    entries = await readdir(join(root, echoDir), { withFileTypes: true });
  } catch {
    return owners;
  }
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    let files: string[];
    try {
      files = (await readdir(join(root, echoDir, entry.name))).filter((f) => f.endsWith(".css"));
    } catch {
      continue;
    }
    for (const file of files) {
      const css = await readFile(join(root, echoDir, entry.name, file), "utf8");
      for (const m of css.matchAll(/\.(echo-[\w-]+)/g)) {
        if (!materials.has(m[1]!) && !owners.has(m[1]!)) owners.set(m[1]!, entry.name);
      }
    }
  }
  return owners;
}

/**
 * The project, or undefined when it isn't an Echo project (no `echo.json`):
 * then there's nothing to check against, and nothing to say.
 */
export async function loadProject(root: string, options: { registry?: string; refresh?: boolean } = {}): Promise<CheckProject | undefined> {
  const config = await readConfig(root);
  if (!config) return undefined;
  // Checked before anything is fetched: a mistake here is the team's to fix, and says so.
  const team = readTeamRules(config.check);
  const echoDir = withoutTrailingSlashes(toPosix(config.dir));
  const { catalog } = await loadCatalog(root, options.registry ?? config.registry ?? DEFAULT_REGISTRY, { refresh: options.refresh });
  const themeFile = footprintItem("theme").paths({ dir: echoDir })[0]!;
  const themeCss = await readFile(join(root, themeFile), "utf8").catch(() => createEchoTheme().css);
  const materials = new Set(catalog.materials ?? []);
  const found = await aliases(root);

  return {
    root,
    framework: config.framework,
    echoDir,
    themeFile,
    catalog,
    items: new Map(catalog.components.map((c) => [installName(c.name), c])),
    lock: await readLock(root),
    roles: themeRoles(themeCss, catalog.tokens.colorRoles),
    htmlAttributes: new Set(catalog.htmlAttributes ?? []),
    materials,
    themeTokens: new Set([...themeCss.matchAll(/(--echo-[\w-]+)\s*:/g)].map((m) => m[1]!)),
    team,
    keeps: new Set((config.style?.keeps ?? []).map((k) => k.rule)),
    classOwners: await classOwners(root, echoDir, materials),
    resolve(fromFile, specifier) {
      let target: string | undefined;
      if (specifier.startsWith("./") || specifier.startsWith("../")) {
        target = resolve(dirname(join(root, fromFile)), specifier);
      } else {
        for (const alias of found) {
          if (!specifier.startsWith(alias.prefix)) continue;
          const base = alias.bases[0];
          if (base !== undefined) target = join(root, base, specifier.slice(alias.prefix.length));
          break;
        }
      }
      return target === undefined ? undefined : toPosix(relative(root, target));
    },
  };
}
