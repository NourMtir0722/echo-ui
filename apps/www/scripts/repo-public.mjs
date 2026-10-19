/**
 * The deploy's first check: a site that links Echo's repository goes out only
 * once a visitor can open it.
 *
 * Every link to the repository (the GitHub key beside X, the footer, "Star
 * Echo on GitHub", "report a bug") waits on `REPO_PUBLIC` in
 * `components/site/repo.ts`. While the repository is private, GitHub answers
 * everyone but its owner with a 404, and the site once shipped six of those.
 * So with the switch on, the deploy asks GitHub for the repository
 * as a visitor would, and stops unless it's there.
 *
 * Only `deploy:site` runs this, before the build.
 */
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");

/** The switch and the address, as `repo.ts` states them. */
export function readRepoSwitch(source) {
  const url = /export const REPO_URL = "([^"]+)"/.exec(source)?.[1];
  const flag = /export const REPO_PUBLIC = (true|false)\b/.exec(source)?.[1];
  if (!url || !flag) throw new Error("repo.ts no longer states REPO_URL and REPO_PUBLIC as this check reads them");
  return { url, isPublic: flag === "true" };
}

/** Why the deploy can't go out, or null when it can. */
export async function repoBlocker(source, get = (url) => fetch(url, { method: "HEAD", redirect: "follow" })) {
  const { url, isPublic } = readRepoSwitch(source);
  if (!isPublic) return null;
  let status;
  try {
    status = (await get(url)).status;
  } catch (error) {
    return `couldn't reach ${url} to check it's public (${error.message})`;
  }
  return status === 200 ? null : `REPO_PUBLIC is on, but ${url} answers a visitor with ${status}`;
}

/* Run as a script by `deploy:site`. */
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const blocker = await repoBlocker(await readFile(resolve(appRoot, "components/site/repo.ts"), "utf8"));
  if (blocker) {
    console.error(
      `repo-public: not deploying. ${blocker}.\n` +
        "Make the repository public first, or set REPO_PUBLIC to false: every link to it would be a 404.",
    );
    process.exit(1);
  }
  console.log("repo-public: every link to the repository opens");
}
