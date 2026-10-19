import { test } from "node:test";
import assert from "node:assert/strict";
import { readZip as unzip, zip } from "./zip";

test("a ZIP of the plugin's files reads back exactly, hidden folders and all", () => {
  const files = { ".claude-plugin/plugin.json": '{ "name": "echo-ui" }\n', "skills/echo-ui/SKILL.md": "# Echo UI\n".repeat(200), "LICENSE": "MIT\n" };
  assert.deepEqual(unzip(zip(files)), files);
});

test("the same files make the same ZIP, so a rebuild doesn't change what's served", () => {
  const files = { "a.txt": "one", "b/c.txt": "two" };
  assert.ok(zip(files).equals(zip(files)));
});
