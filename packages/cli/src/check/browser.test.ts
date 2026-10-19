import { test } from "node:test";
import assert from "node:assert/strict";
import { chmod, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { BrowserError, openBrowser } from "./browser";

/**
 * A Chrome that won't start (a sandbox keeps it from it, as an agent's did in
 * a blind run) isn't the end: the project's Playwright is tried next, and
 * with neither, the error says why that may be and where the tests still run.
 */
test("a Chrome that quits at start says a sandbox may be why, and where the tests still run", async () => {
  const dir = await mkdtemp(join(tmpdir(), "echo-browser-"));
  const chrome = join(dir, "chrome");
  await writeFile(chrome, "#!/bin/sh\nexit 21\n");
  await chmod(chrome, 0o755);
  await writeFile(join(dir, "package.json"), "{}\n");
  const before = process.env.ECHO_CHROME;
  process.env.ECHO_CHROME = chrome;
  try {
    await assert.rejects(openBrowser(dir), (error: unknown) => {
      assert.ok(error instanceof BrowserError);
      assert.match(error.message, /quit before it started \(exit 21\)/);
      assert.match(error.message, /sandbox/);
      assert.match(error.message, /Stop gate/);
      return true;
    });
  } finally {
    if (before === undefined) delete process.env.ECHO_CHROME;
    else process.env.ECHO_CHROME = before;
    await rm(dir, { recursive: true, force: true });
  }
});
