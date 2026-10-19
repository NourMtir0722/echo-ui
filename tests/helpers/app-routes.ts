import { execFileSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * Every route in an App Router folder, read from the filesystem — not typed
 * out: static routes, and dynamic ones (with a `[segment]`) apart.
 *
 * console.spec.ts's list used to be hand-kept, and it drifted the way every
 * hand-kept list in this repo has: /audition went unchecked for a long time, and
 * /templates plus three of the four template pages were never on it. A route
 * folder with a page.tsx is now checked the moment it exists.
 *
 * What git ignores is left out: a page a machine keeps there out of
 * git isn't the repository's, and
 * testing it made the suite's answer that machine's. A new page git doesn't
 * track yet is still in.
 */
export function appRoutes(dir: string): { static: string[]; dynamic: string[] } {
  const ignored = ignoredIn(dir);
  const walk = (at: string, rel: string, prefix: string) => {
    const out = { static: [] as string[], dynamic: [] as string[] };
    const page = ["page.tsx", "page.mdx"].find((file) => existsSync(join(at, file)) && !ignored.has(rel ? `${rel}/${file}` : file));
    if (page) (prefix.includes("[") ? out.dynamic : out.static).push(prefix || "/");
    for (const entry of readdirSync(at, { withFileTypes: true })) {
      const path = rel ? `${rel}/${entry.name}` : entry.name;
      if (!entry.isDirectory() || ignored.has(path)) continue;
      // A route group — "(guides)" — organises files without adding a URL segment.
      const segment = /^\(.*\)$/.test(entry.name) ? "" : `/${entry.name}`;
      const sub = walk(join(at, entry.name), path, `${prefix}${segment}`);
      out.static.push(...sub.static);
      out.dynamic.push(...sub.dynamic);
    }
    return out;
  };
  return walk(dir, "", "");
}

/** What git ignores under `dir`, as paths from it; nothing outside git. */
function ignoredIn(dir: string): Set<string> {
  try {
    const listed = execFileSync("git", ["ls-files", "--others", "--ignored", "--exclude-standard", "--directory", "--", "."], { cwd: dir, encoding: "utf8" });
    return new Set(listed.split("\n").filter(Boolean).map((path) => path.replace(/\/$/, "")));
  } catch {
    return new Set();
  }
}
