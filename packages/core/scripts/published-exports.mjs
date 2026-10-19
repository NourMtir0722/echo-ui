/**
 * Print what an unpacked echo-ui-core exports, per subpath, as JSON — the
 * `exports` field of published-core.json. Run it on the tarball npm holds:
 *
 *   npm pack echo-ui-core@<version> && tar -xzf echo-ui-core-<version>.tgz
 *   node packages/core/scripts/published-exports.mjs package
 */
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const require = createRequire(import.meta.url);
const ts = require("typescript");

const root = resolve(process.argv[2] ?? "package");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const entries = Object.entries(pkg.exports)
  .filter(([, v]) => v && typeof v === "object" && v.types)
  .map(([sub, v]) => [sub, join(root, v.types)]);
const program = ts.createProgram(
  entries.map(([, file]) => file),
  { noEmit: true },
);
const checker = program.getTypeChecker();
const out = {};
for (const [sub, file] of entries) {
  const symbol = checker.getSymbolAtLocation(program.getSourceFile(file));
  out[sub] = symbol ? checker.getExportsOfModule(symbol).map((s) => s.name).sort() : [];
}
console.log(JSON.stringify(out, null, 2));
