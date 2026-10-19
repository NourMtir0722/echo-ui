/**
 * Bundles the server into one self-contained file for publishing.
 *
 * WHY A BUNDLE AND NOT `tsc`. The server imports from `@registry/agent/*` —
 * the registry package's agent layer — which is a private workspace sibling
 * that is never published. A plain compile would emit those imports verbatim
 * and the published package would fail to resolve them on a stranger's
 * machine. Bundling inlines them, which is correct here rather than a
 * workaround: they are pure functions with no runtime dependency of their own,
 * and vendoring a copy of the source into `mcp/` instead would be the actual
 * fork.
 *
 * The real runtime dependencies stay EXTERNAL so npm installs them normally
 * and the MCP SDK is deduped against whatever else the host has.
 */
import { build } from "esbuild";
import { readFileSync } from "node:fs";

import { writeLicenses } from "../scripts/licenses.mjs";

const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));

const server = await build({
  entryPoints: ["src/index.ts"],
  outfile: "dist/index.js",
  metafile: true,
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node20",
  // Declared dependencies are installed by npm; everything else is inlined.
  external: Object.keys(pkg.dependencies ?? {}),
  // Resolves the @registry/* alias from tsconfig, so the inlining works.
  tsconfig: "tsconfig.json",
  // What an MCP client displays has to be what was published.
  define: { __ECHO_MCP_VERSION__: JSON.stringify(pkg.version) },
  // postcss, which the check bundles, is CommonJS and requires Node's own modules: an ESM bundle
  // needs a `require` for that.
  banner: {
    js: '#!/usr/bin/env node\nimport { createRequire as __echoCreateRequire } from "node:module";\nconst require = __echoCreateRequire(import.meta.url);',
  },
  legalComments: "inline",
  logLevel: "info",
});

// What npm publishes (`files: ["dist", …]`) has to carry the licenses of what's inside it.
writeLicenses(server.metafile, "dist", "echo-ui-mcp's `dist/index.js`");
