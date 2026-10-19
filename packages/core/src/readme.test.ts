/**
 * echo-ui-core's README, which npm shows, described `<EchoCheck />`
 * as colours, names, contrast and setup, months after it gained the design
 * tests, and left `echo-ui-core/types` out of its table of entries. Every
 * entry the package exports is now held to the table.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as { name: string; exports: Record<string, unknown> };
const readme = readFileSync(new URL("../README.md", import.meta.url), "utf8");

test("echo-ui-core's README lists every entry the package exports", () => {
  const entries = Object.keys(pkg.exports)
    .filter((e) => e !== "./package.json")
    .map((e) => `\`${pkg.name}${e.slice(1)}\``);
  assert.deepEqual(entries.filter((e) => !readme.includes(e)), []);
});

test("the README says what the page check runs, the design tests among them", () => {
  for (const rule of ["alignment", "depth", "corners", "icons"]) assert.ok(readme.includes(rule), `the README's EchoCheck line doesn't mention ${rule}`);
});
