/**
 * Bundles the CLI into one self-contained file for publishing.
 *
 * Same reason as the MCP server's build: the CLI imports `@echo-ui/client`,
 * a private workspace sibling that is never published, so a plain `tsc` would
 * emit an import that resolves on nobody's machine. Bundling inlines it, which
 * is what "the client is bundled into both" means — and it is
 * how the CLI and the MCP are guaranteed to read the registry the same way.
 *
 * `echo-ui-core` stays EXTERNAL: the CLI uses it to write the theme, and the
 * user's project installs its own copy anyway. So does `axe-core`, which the
 * page tests add to each page they load: it's MPL-2.0, not MIT, so it stays
 * a package of its own rather than inlined into the bundle, and it's pinned
 * exactly, so a new axe rule never starts blocking agents the day it ships.
 */
import { build } from "esbuild";
import { readFileSync, writeFileSync, copyFileSync, existsSync } from "node:fs";
import { join } from "node:path";

import { writeLicenses } from "../../scripts/licenses.mjs";

const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));

/*
 * The page check `check --url` adds to a headless page: the same code
 * `<EchoCheck />` runs, bundled for a browser and carried in the CLI as a
 * string. Only the source reaches for esbuild to build it on the spot.
 */
const pageCheck = await build({
  entryPoints: ["../core/src/check/browser.ts"],
  bundle: true,
  format: "iife",
  platform: "browser",
  minify: true,
  write: false,
  metafile: true,
  logLevel: "warning",
});

const cli = await build({
  entryPoints: ["src/index.ts"],
  outfile: "dist/index.js",
  metafile: true,
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node20",
  external: [...Object.keys(pkg.dependencies ?? {}), "esbuild"],
  define: { __ECHO_PAGE_CHECK__: JSON.stringify(pageCheck.outputFiles[0].text) },
  tsconfig: "tsconfig.json",
  // src/index.ts already starts with the shebang, which esbuild keeps first.
  // The banner below it gives the bundle a `require`: postcss is CommonJS
  // and asks for Node's own modules, which an ES module has no require for.
  banner: { js: 'import { createRequire as __echoCreateRequire } from "node:module";\nconst require = __echoCreateRequire(import.meta.url);' },
  legalComments: "inline",
  logLevel: "info",
});

/*
 * The published package.json, written next to the bundle so `npm publish` runs
 * from dist/ — the same shape core's build uses. It carries real version
 * ranges rather than `workspace:*`, which nothing outside this repo can
 * resolve, and the private client is gone because it was inlined above.
 */
const core = JSON.parse(readFileSync(new URL("../core/package.json", import.meta.url), "utf8"));
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
  type: "module",
  bin: { "echo-ui": "./index.js" },
  engines: pkg.engines,
  dependencies: { "axe-core": pkg.dependencies["axe-core"], "echo-ui-core": `^${core.version}` },
  // What the production smoke check reads off npm to see the published CLI has every command the
  // docs teach. Left out, npm never had it to give.
  echoUi: pkg.echoUi,
};
writeFileSync(join("dist", "package.json"), `${JSON.stringify(published, null, 2)}\n`);
if (existsSync("README.md")) copyFileSync("README.md", join("dist", "README.md"));
// What npm publishes has to carry the licenses of what's inside it.
writeLicenses({ inputs: { ...pageCheck.metafile.inputs, ...cli.metafile.inputs } }, "dist", "echo-ui-cli's `index.js`");
console.log(`${pkg.name} ${pkg.version} built into dist/. Publish with: cd packages/cli/dist && npm publish`);
