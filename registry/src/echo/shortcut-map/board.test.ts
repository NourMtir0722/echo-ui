import { test } from "node:test";
import assert from "node:assert/strict";

import { BOARD, legendFor, lit } from "./board";

test("keys are found by any of their usual names", () => {
  assert.equal(legendFor("Cmd"), "⌘");
  assert.equal(legendFor("meta"), "⌘");
  assert.equal(legendFor("Ctrl"), "⌃");
  assert.equal(legendFor("Option"), "⌥");
  assert.equal(legendFor("Enter"), "↵");
  assert.equal(legendFor("k"), "K");
  assert.equal(legendFor("/"), "/");
  assert.equal(legendFor("F13"), null, "a key the board doesn't have lights nothing");
});

test("a shortcut lights its keys; ? lights Shift and its key", () => {
  assert.deepEqual([...lit(["Cmd", "K"])].sort(), ["K", "⌘"].sort());
  assert.deepEqual([...lit(["?"])].sort(), ["/", "⇧"].sort());
});

test("the rows are close to the same width, like a real keyboard", () => {
  const widths = BOARD.map((row) => row.reduce((a, c) => a + c.width, 0));
  const spread = Math.max(...widths) - Math.min(...widths);
  assert.ok(spread <= 1.5, `rows vary by ${spread} units`);
});
