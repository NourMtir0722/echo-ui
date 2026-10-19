/**
 * Which files the check reads, and reading one.
 *
 * Scope: the project's own `.tsx`, `.jsx` and `.css`, minus the Echo folder.
 * Echo's copied files use raw elements and literal values on purpose (they
 * are the components), so checking them would flag Echo itself.
 */
import { readFile, readdir } from "node:fs/promises";
import { extname, join } from "node:path";

import { readCss } from "@registry/agent/check/css";
import type { CheckProject } from "./project";
import { cssRules, tsxRules, type FileResult } from "@registry/agent/check/rules";
import { readTsx } from "@registry/agent/check/tsx";
import { applyTeam } from "@registry/agent/check/team";

/** Folders that are never the project's own source. */
const SKIP = new Set(["node_modules", ".next", ".git", "dist", "build", "out", "coverage", ".turbo", ".vercel", ".output", ".svelte-kit"]);

export function inScope(project: CheckProject, file: string): boolean {
  if (!/\.(tsx|jsx|css)$/.test(file)) return false;
  if (file === project.echoDir || file.startsWith(`${project.echoDir}/`)) return false;
  return !file.split("/").some((part) => SKIP.has(part));
}

/** Every file in scope, relative to the root with forward slashes. */
export async function projectFiles(project: CheckProject, dir = ""): Promise<string[]> {
  const out: string[] = [];
  for (const entry of await readdir(join(project.root, dir), { withFileTypes: true })) {
    const rel = dir ? `${dir}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      if (!SKIP.has(entry.name) && !entry.name.startsWith(".") && rel !== project.echoDir) out.push(...(await projectFiles(project, rel)));
    } else if (inScope(project, rel)) {
      out.push(rel);
    }
  }
  return out.sort();
}

/**
 * One file's findings. A file that can't be parsed, half-written mid-edit,
 * is a note, never a failure of the check: the compiler will say more about
 * it than a style check could.
 */
export async function checkFile(project: CheckProject, file: string): Promise<FileResult> {
  const source = await readFile(join(project.root, file), "utf8");
  try {
    if (extname(file) === ".css") return applyTeam({ findings: cssRules(file, readCss(source, file), project), notes: [] }, project.team);
    return applyTeam(tsxRules(file, readTsx(file, source), project), project.team);
  } catch (error) {
    if ((error as { name?: string }).name === "SyntaxError" || (error as { name?: string }).name === "CssSyntaxError") {
      return { findings: [], notes: [{ file, line: 0, message: `Couldn't read it: ${(error as Error).message.split("\n")[0]}` }] };
    }
    throw error;
  }
}
