/**
 * `pnpm --filter echo-ui-mcp build:plugin`: writes Echo's plugin into
 * `mcp/dist-plugin/` (ignored by git):
 *
 * - `claude/`: the folder for the public repository Claude's directory reads,
 *   and `echo-ui-claude-<version>.zip` of it: what claude.ai's
 *   Customize > Plugins > Upload plugin takes, to try it on one account.
 * - `openai/`, and `echo-ui-openai-<version>.zip` of it: what OpenAI's portal uploads.
 * - `.agents/plugins/marketplace.json`: a marketplace of one, so Codex and
 *   ChatGPT desktop can install `openai/` before it's listed.
 *
 * With `--site <dir>`, it also writes the two downloads the site serves
 * (`SITE_DOWNLOADS`) under that folder: `pnpm build:registry` passes the
 * site's `public/`, so every deploy carries them.
 *
 * It ends by saying what still stands between each and a submission.
 */
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { claudePlugin, LOCAL_MARKETPLACE, localMarketplace, openaiPlugin, PLUGIN_NAME, pluginVersion, portalReport, siteDownloads } from "./plugin";
import { zip } from "./zip";

const out = fileURLToPath(new URL("../dist-plugin/", import.meta.url));
rmSync(out, { recursive: true, force: true });

function write(folder: string, files: Record<string, string>) {
  for (const [path, content] of Object.entries(files)) {
    const file = join(out, folder, path);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, content);
  }
  return Object.keys(files).length;
}

const version = pluginVersion();
console.log(`Echo's plugin, version ${version}`);
console.log(`  claude/  ${write("claude", claudePlugin(version))} files`);
console.log(`  openai/  ${write("openai", openaiPlugin(version))} files`);
write("", localMarketplace());

// Each folder's contents at the ZIP's root, which both uploads accept.
for (const [folder, files] of [["claude", claudePlugin(version)], ["openai", openaiPlugin(version)]] as const) {
  const archive = join(out, `echo-ui-${folder}-${version}.zip`);
  writeFileSync(archive, zip(files));
  console.log(`  ${archive.slice(out.length)}`);
}

const siteAt = process.argv.indexOf("--site");
if (siteAt >= 0) {
  const site = resolve(process.argv[siteAt + 1] ?? "");
  rmSync(join(site, "plugin"), { recursive: true, force: true });
  for (const [path, archive] of Object.entries(siteDownloads(version))) {
    mkdirSync(dirname(join(site, path)), { recursive: true });
    writeFileSync(join(site, path), archive);
  }
  console.log(`  the site's downloads: ${Object.keys(siteDownloads(version)).join(", ")}, in ${site}`);
}

console.log("\nTo try it before it's listed:");
console.log(`  Claude Code:  claude --plugin-dir "${join(out, "claude")}"`);
console.log(`  claude.ai:    Customize > Plugins > Add > Upload plugin, echo-ui-claude-${version}.zip`);
console.log(`  Codex and ChatGPT desktop:  codex plugin marketplace add "${out.replace(/\/$/, "")}"`);
console.log(`                              codex plugin add ${PLUGIN_NAME}@${LOCAL_MARKETPLACE}`);

console.log(`\n${portalReport().join("\n")}`);
