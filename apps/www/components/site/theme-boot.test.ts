import { test } from "node:test";
import assert from "node:assert/strict";

import { DRAWN_ATTR, SEED_CHOSEN_ATTR, THEME_BOOT_SCRIPT, THEME_STORAGE_KEY } from "./theme-boot";

/** Runs the boot script against a saved theme, the way <head> runs it, and returns the attributes it put on <html>. */
function boot(saved: unknown): Set<string> {
  const attrs = new Set<string>();
  const env = {
    localStorage: { getItem: (k: string) => (k === THEME_STORAGE_KEY ? JSON.stringify(saved) : null) },
    document: {
      documentElement: { setAttribute: (name: string) => attrs.add(name) },
      createElement: () => ({}),
      head: { appendChild: () => {} },
    },
  };
  new Function("localStorage", "document", THEME_BOOT_SCRIPT)(env.localStorage, env.document);
  return attrs;
}

test("a saved drawn look marks the page drawn before first paint, and a molded one doesn't", () => {
  assert.deepEqual([...boot({ seed: {}, css: ":root { --echo-drawn: 1; }" })].sort(), [DRAWN_ATTR, SEED_CHOSEN_ATTR].sort());
  assert.deepEqual([...boot({ seed: {}, css: ":root { --echo-drawn: 0; }" })], [SEED_CHOSEN_ATTR]);
  assert.deepEqual([...boot({ seed: {}, css: "" })], [SEED_CHOSEN_ATTR]);
});
