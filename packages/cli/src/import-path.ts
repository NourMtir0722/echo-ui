/**
 * How this project imports its Echo folder: `@/components/echo`, worked out
 * from its tsconfig's path aliases and `echo.json`. The docs' snippets import
 * from a placeholder, and an agent copying one needs the path that resolves
 * here, not the one that resolved on the docs site.
 */
import { access, readFile } from "node:fs/promises";
import { join, posix } from "node:path";

import type { Framework } from "./project";
import { withoutTrailingSlashes } from "@echo-ui/client";

/** tsconfig is JSON with comments and trailing commas; this reads that much. */
export function parseJsonc(text: string): unknown {
  const withoutComments = text.replace(/("(?:[^"\\]|\\.)*")|\/\/[^\n]*|\/\*[\s\S]*?\*\//g, (match, string: string | undefined) => string ?? "");
  return JSON.parse(withoutComments.replace(/,(\s*[}\]])/g, "$1"));
}

interface CompilerOptions {
  baseUrl?: string;
  paths?: Record<string, string[]>;
}

/** The import prefix for `dir` under `paths`, or undefined when no alias covers it. */
export function aliasFor(dir: string, options: CompilerOptions): string | undefined {
  const folder = withoutTrailingSlashes(posix.normalize(dir.split(/[\\/]/).join("/")));
  let best: { prefix: string; base: string } | undefined;
  for (const [alias, targets] of Object.entries(options.paths ?? {})) {
    if (!alias.endsWith("/*")) continue;
    for (const target of targets) {
      if (!target.endsWith("*")) continue;
      const base = withoutTrailingSlashes(posix.normalize(posix.join(options.baseUrl ?? ".", target.slice(0, -1)))).replace(/^\.$/, "");
      const inside = base === "" || folder === base || folder.startsWith(`${base}/`);
      if (inside && (!best || base.length > best.base.length)) best = { prefix: alias.slice(0, -2), base };
    }
  }
  if (!best) return undefined;
  const rest = best.base === "" ? folder : folder.slice(best.base.length).replace(/^\//, "");
  return rest ? `${best.prefix}/${rest}` : best.prefix;
}

export async function echoImportPath(root: string, dir: string): Promise<string | undefined> {
  for (const file of ["tsconfig.json", "jsconfig.json"]) {
    try {
      const config = parseJsonc(await readFile(join(root, file), "utf8")) as { compilerOptions?: CompilerOptions };
      const alias = aliasFor(dir, config.compilerOptions ?? {});
      if (alias) return alias;
    } catch {
      /* no such file, or one this can't read: try the next */
    }
  }
  return undefined;
}

/** Where the theme is imported, and the line that does it. */
export interface ThemeImport {
  file: string;
  line: string;
}

const exists = (path: string) => access(path).then(() => true, () => false);

/**
 * The theme's import, the way this project resolves it from the file it goes
 * in: the root layout in Next.js (`src/app/layout.tsx` or `app/layout.tsx`),
 * the entry file in Vite. Through the project's alias when it has one, and
 * relative to that file when it doesn't. A fixed `./echo-theme.css` resolved
 * only from inside the Echo folder.
 */
export async function themeImport(root: string, dir: string, framework: Framework): Promise<ThemeImport> {
  const src = await exists(join(root, "src"));
  const file =
    framework === "vite"
      ? "src/main.tsx"
      : (await exists(join(root, "src", "app"))) || (src && !(await exists(join(root, "app"))))
        ? "src/app/layout.tsx"
        : "app/layout.tsx";
  const alias = await echoImportPath(root, dir);
  if (alias) return { file, line: `import "${alias}/echo-theme.css";` };
  const relative = posix.relative(posix.dirname(file), posix.join(dir.split(/[\\/]/).join("/"), "echo-theme.css"));
  return { file, line: `import "${relative.startsWith(".") ? relative : `./${relative}`}";` };
}

/** How the docs' snippets import the Echo folder here, and from which folder when that's relative. */
export interface DocsImport {
  from: string;
  relativeTo?: string;
}

/**
 * Through the project's alias when one reaches the Echo folder. With none, as
 * in Vite's starter, relative to the folder the app's own files are in (where
 * `themeImport` puts the theme): `src` in Vite, the app folder in Next.js. The
 * placeholder `@/echo` resolved nowhere, and an agent copying it broke the
 * build.
 */
export async function docsImport(root: string, dir: string, framework: Framework): Promise<DocsImport> {
  const alias = await echoImportPath(root, dir);
  if (alias) return { from: alias };
  const folder = posix.dirname((await themeImport(root, dir, framework)).file);
  const relative = posix.relative(folder, dir.split(/[\\/]/).join("/"));
  return { from: relative.startsWith(".") ? relative : `./${relative}`, relativeTo: folder };
}
