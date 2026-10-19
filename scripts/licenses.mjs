/**
 * What a bundle owes the code inside it: Echo's LICENSE, and the notice of
 * every npm package esbuild inlined, written next to the bundle so they're in
 * what npm publishes.
 *
 * echo-ui-cli and echo-ui-mcp are single files with @babel/parser, postcss and
 * more inside. Their licenses (MIT, ISC, BSD) ask that their notice travel
 * with every copy, and npm adds a LICENSE only from the folder it publishes.
 * The list comes from esbuild's own record of what it read, so it can't fall
 * behind a new dependency.
 */
import { copyFileSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");

/** The folder of each npm package a bundle read, from esbuild's metafile. Echo's own sources aren't in node_modules. */
export function bundledPackages(metafile, cwd = process.cwd()) {
  const dirs = new Set();
  for (const input of Object.keys(metafile.inputs)) {
    const match = /^(.*node_modules\/(?:@[^/]+\/)?[^/]+)\//.exec(input);
    if (match) dirs.add(resolve(cwd, match[1]));
  }
  return [...dirs];
}

const LICENSE_FILE = /^(licen[cs]e|copying|notice)(\.(md|txt))?$/i;

/** One section per package: its name, version and license, then its license file as it ships. */
export function noticesFor(packageDirs, what) {
  const sections = packageDirs
    .map((dir) => {
      const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
      const license = typeof pkg.license === "string" ? pkg.license : pkg.license?.type ?? "see below";
      const files = readdirSync(dir).filter((f) => LICENSE_FILE.test(f)).sort();
      const text = files.map((f) => readFileSync(join(dir, f), "utf8").trim()).join("\n\n");
      return { name: pkg.name, body: `## ${pkg.name} ${pkg.version} · ${license}\n\n${text || `Licensed ${license}; the package ships no license file.`}\n` };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
  return [
    "# Third-party notices",
    "",
    `${what} includes the following packages, each under its own license, reproduced here.`,
    "",
    ...sections.map((s) => s.body),
  ].join("\n");
}

/** Echo's LICENSE and the bundle's notices, into `outDir`. */
export function writeLicenses(metafile, outDir, what) {
  copyFileSync(join(repoRoot, "LICENSE"), join(outDir, "LICENSE"));
  writeFileSync(join(outDir, "THIRD-PARTY-NOTICES.md"), noticesFor(bundledPackages(metafile), what));
}
