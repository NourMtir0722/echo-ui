/**
 * The install matrix checks the hook `init` writes by running it the
 * way Claude Code would, on a file the agent just wrote. It named
 * `app/layout.tsx`, which only a Next.js app has, so on every Vite row the
 * check was handed a file that wasn't there, exited 1 as it should, and the
 * matrix failed before measuring anything: the release matrix's three Vite
 * rows, and `install-app.mjs --framework vite --sizes`, the run behind the
 * Installation guide's size table. The hook now runs on a file the matrix
 * writes for it, in every framework.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { writeHookProbe } from "../../scripts/matrix/fresh-app.mjs";

test("the hook probe is a component file the matrix writes, whatever the framework", async () => {
  const root = mkdtempSync(join(tmpdir(), "echo-hook-probe-"));
  try {
    const probe = await writeHookProbe(root);
    assert.ok(probe.path.startsWith(root) && probe.path.endsWith(".tsx"), probe.path);
    assert.ok(existsSync(probe.path));
    await probe.remove();
    assert.ok(!existsSync(probe.path), "the probe is taken back out");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("the matrix's hook check runs on the probe, not on a file one framework has", () => {
  const script = readFileSync(new URL("../../scripts/matrix/install-app.mjs", import.meta.url), "utf8");
  assert.ok(script.includes("writeHookProbe(root)"));
  assert.ok(!/file_path: join\(root, "app", "layout\.tsx"\)/.test(script));
});
