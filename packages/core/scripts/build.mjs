/**
 * Builds the publishable echo-ui-core into dist/ and writes dist/package.json,
 * so `npm publish` runs from dist/. The source package.json keeps its exports
 * pointed at src/*.ts for the monorepo (no build step during development);
 * npm can't swap exports at publish time, so the published manifest is
 * generated here instead.
 *
 * Files are compiled one to one by tsc rather than bundled: that keeps each
 * module's "use client" directive, and keeps modules shared between entries
 * (sound, motion) single instances, so SoundProvider and useTactile see the
 * same React context.
 */
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const require = createRequire(import.meta.url);

rmSync(dist, { recursive: true, force: true });
execFileSync(process.execPath, [require.resolve("typescript/bin/tsc"), "-p", join(root, "tsconfig.build.json")], {
  stdio: "inherit",
});

/* Node's ESM loader needs full specifiers: "./seed" → "./seed.js", "../sound" → "../sound/index.js". */
const files = (dir) =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : [p];
  });
const SPECIFIER = /(\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)(["'])(\.{1,2}\/[^"']*)\2/g;
for (const file of files(dist).filter((f) => /\.(js|d\.ts)$/.test(f))) {
  const src = readFileSync(file, "utf8");
  const out = src.replace(SPECIFIER, (match, lead, quote, spec) => {
    if (/\.(js|css|json)$/.test(spec)) return match;
    const target = resolve(dirname(file), spec);
    if (existsSync(`${target}.js`)) return `${lead}${quote}${spec}.js${quote}`;
    if (existsSync(join(target, "index.js"))) return `${lead}${quote}${spec}/index.js${quote}`;
    throw new Error(`${file}: can't resolve ${spec}`);
  });
  if (out !== src) writeFileSync(file, out);
}

copyFileSync(join(root, "src/theme/material.css"), join(dist, "theme/material.css"));
copyFileSync(join(root, "README.md"), join(dist, "README.md"));
copyFileSync(join(root, "../../LICENSE"), join(dist, "LICENSE"));

/*
 * The published manifest: the source one, with exports pointed at the build.
 * An export with conditions keeps them: `./check` is one file under
 * `development` and another everywhere else.
 */
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const built = (target) => {
  if (typeof target === "object") return Object.fromEntries(Object.entries(target).map(([when, t]) => [when, built(t)]));
  if (/\.tsx?$/.test(target)) {
    const base = target.replace(/^\.\/src\//, "./").replace(/\.tsx?$/, "");
    return { types: `${base}.d.ts`, default: `${base}.js` };
  }
  return target.replace(/^\.\/src\//, "./");
};
const exports = Object.fromEntries(Object.entries(pkg.exports).map(([key, target]) => [key, built(target)]));
const published = {
  name: pkg.name,
  version: pkg.version,
  description: pkg.description,
  keywords: pkg.keywords,
  homepage: pkg.homepage,
  funding: pkg.funding,
  license: pkg.license,
  author: pkg.author,
  repository: pkg.repository,
  bugs: pkg.bugs,
  type: pkg.type,
  sideEffects: pkg.sideEffects,
  exports,
  peerDependencies: pkg.peerDependencies,
};
writeFileSync(join(dist, "package.json"), `${JSON.stringify(published, null, 2)}\n`);
console.log(`echo-ui-core ${pkg.version} built into dist/. Publish with: cd packages/core/dist && npm publish`);
