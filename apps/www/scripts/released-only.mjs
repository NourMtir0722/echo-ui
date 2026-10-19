/**
 * The deploy's last check: every registry item the export serves is at a
 * version a release has frozen in `registry/e-released/`.
 *
 * `/e/` is rebuilt from source on every build, so a component changed since
 * the last release resolves to the pending version. Deployed, those files are
 * public under a version number, and the next deploy can rewrite them before
 * any release freezes them: that's how 80 of 0.2.0's public files changed
 * under the people who had installed them. So a deploy with an unreleased
 * component stops here and says to release first.
 *
 * Only `deploy:site` runs this. A local static build, a preview or the browser
 * suite can carry unreleased changes; publishing them is what can't.
 */
import { access, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");

/** `{name}@{version}` for each item the export serves at a version the archive doesn't hold. */
export async function unreleasedItems(out, releasedDir) {
  const index = JSON.parse(await readFile(join(out, "e", "index.json"), "utf8"));
  const missing = [];
  for (const { name, version } of index.items) {
    const pinned = `${name}@${version}`;
    if (!(await access(join(releasedDir, `${pinned}.json`)).then(() => true, () => false))) missing.push(pinned);
  }
  return missing;
}

/* Run as a script by `deploy:site`, after the static export is built. */
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const out = resolve(appRoot, process.argv[2] ?? process.env.NEXT_DIST_DIR ?? "out");
  const missing = await unreleasedItems(out, resolve(appRoot, "../../registry/e-released"));
  if (missing.length) {
    console.error(
      `released-only: not deploying. ${missing.length} registry item(s) would go out at a version no release has frozen:\n  ${missing.join("\n  ")}\n` +
        "Release first (packages/core/published-core.md, \"Releasing\"), then deploy: a version, once public, can't change.",
    );
    process.exit(1);
  }
  console.log("released-only: every registry item the site serves is at a released version");
}
