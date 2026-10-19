import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

import { sampleCatalog, sampleRegistry } from "./sample-catalog";

/**
 * The published package, not the source: build dist/index.js exactly as
 * `npm publish` does, then start it the way an MCP client does — a bare
 * `node` process over stdio. The handler and server tests import TypeScript;
 * only this one would notice a bundle that cannot start on a stranger's
 * machine.
 */
const mcpRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(readFileSync(join(mcpRoot, "package.json"), "utf8")) as {
  name: string;
  version: string;
  bin: Record<string, string>;
  files: string[];
  private?: boolean;
  dependencies: Record<string, string>;
};

test("package.json is publishable and its bin is the built file", () => {
  assert.equal(pkg.private, undefined, "a private package cannot be installed with npx");
  assert.deepEqual(Object.keys(pkg.bin), [pkg.name], "`npx echo-ui-mcp` needs a bin named after the package");
  assert.ok(pkg.files.includes("dist"), "dist must ship");
  // Nothing from the workspace may be a runtime dependency: it would not resolve after install.
  for (const dep of Object.keys(pkg.dependencies)) assert.ok(!dep.startsWith("@echo-ui/"), dep);
});

test("the built server starts over stdio and answers", async () => {
  execFileSync("node", ["build.mjs"], { cwd: mcpRoot, stdio: "ignore" });
  const bin = join(mcpRoot, pkg.bin[pkg.name]!);
  assert.match(readFileSync(bin, "utf8").split("\n")[0]!, /^#!\/usr\/bin\/env node/);

  const dir = mkdtempSync(join(tmpdir(), "echo-mcp-"));
  const catalog = join(dir, "catalog.json");
  writeFileSync(catalog, JSON.stringify(sampleCatalog));
  // A local `/e/` too, so the run needs no network and both env knobs are
  // exercised by the binary that actually ships.
  writeFileSync(join(dir, "index.json"), JSON.stringify(sampleRegistry.index));
  for (const [name, item] of Object.entries(sampleRegistry.items)) {
    writeFileSync(join(dir, `${name}.json`), JSON.stringify(item));
    writeFileSync(join(dir, `${name}@${item.version}.json`), JSON.stringify(item));
  }
  mkdirSync(join(dir, "styles"));
  writeFileSync(join(dir, "styles", "index.json"), JSON.stringify({ styles: Object.values(sampleRegistry.styles).map(({ name, title, essence, fingerprint }) => ({ name, title, essence, fingerprint })) }));
  for (const [name, style] of Object.entries(sampleRegistry.styles)) writeFileSync(join(dir, "styles", `${name}.json`), JSON.stringify(style));

  const client = new Client({ name: "package-test", version: "0.0.0" });
  await client.connect(
    new StdioClientTransport({
      command: "node",
      args: [bin],
      env: { ...process.env, ECHO_CATALOG: catalog, ECHO_REGISTRY: pathToFileURL(dir).href },
    }),
  );
  try {
    assert.equal(client.getServerVersion()?.version, pkg.version, "the server reports the published version");
    const { tools } = await client.listTools();
    assert.deepEqual(tools.map((t) => t.name).sort(), [
      "check_code",
      "check_style",
      "fit_styles",
      "get_accessibility",
      "get_component",
      "get_examples",
      "get_tokens",
      "list_styles",
      "search_components",
      "wear_style",
    ]);
    // The check's parsers are bundled into the published file: both have to run there.
    for (const [code, file, finds] of [
      ["export const A = () => <button>Save</button>;", "app/page.tsx", /where Echo has HardwareButton/],
      [".card { box-shadow: 0 4px 12px rgb(0 0 0 / 0.3); }", "card.css", /a shadow drawn by hand/],
    ] as const) {
      const checked = (await client.callTool({ name: "check_code", arguments: { code, file } })) as { content: { text: string }[] };
      assert.match(checked.content[0]!.text, finds);
    }
    const result = (await client.callTool({ name: "get_component", arguments: { name: "hardware-button" } })) as {
      content: { text: string }[];
    };
    assert.match(result.content[0]!.text, /HardwareButton/);
    // Both documents reached the answer, through the shipped bundle.
    assert.match(result.content[0]!.text, /### Ships as/);
    assert.match(result.content[0]!.text, /- Version: 0\.2\.0/);
    // The theme and DESIGN.md are made inside the shipped bundle too, from Echo's published style.
    const worn = (await client.callTool({ name: "wear_style", arguments: { name: "echo" } })) as { content: { text: string }[] };
    assert.match(worn.content[0]!.text, /--echo-accent/);
    assert.match(worn.content[0]!.text, /init --style echo/);
  } finally {
    await client.close();
  }
});
