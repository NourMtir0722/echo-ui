import { test } from "node:test";
import assert from "node:assert/strict";

import { merge3 } from "./merge";

const text = (...lines: string[]) => lines.map((l) => `${l}\n`).join("");
const BASE = text("a", "b", "c", "d", "e", "f", "g");

test("changes in different places both land", () => {
  const mine = BASE.replace("b\n", "B\n");
  const theirs = BASE.replace("f\n", "F\n");
  assert.deepEqual(merge3(BASE, mine, theirs), { ok: true, text: text("a", "B", "c", "d", "e", "F", "g") });
});

test("a stretch only one side changed takes that side, and one both changed the same way lands once", () => {
  assert.deepEqual(merge3(BASE, BASE, BASE.replace("d\n", "D\n")), { ok: true, text: BASE.replace("d\n", "D\n") });
  assert.deepEqual(merge3(BASE, BASE.replace("d\n", "D\n"), BASE), { ok: true, text: BASE.replace("d\n", "D\n") });
  const both = BASE.replace("d\n", "D\n");
  assert.deepEqual(merge3(BASE, both, both), { ok: true, text: both });
});

test("insertions and removals merge like changes", () => {
  const mine = BASE.replace("b\n", "b\nmine\n");
  const theirs = BASE.replace("f\n", "");
  assert.deepEqual(merge3(BASE, mine, theirs), { ok: true, text: text("a", "b", "mine", "c", "d", "e", "g") });
});

test("the same stretch changed two ways is a conflict, with where it is in your file", () => {
  const result = merge3(BASE, BASE.replace("d\n", "yours\n"), BASE.replace("d\n", "echo's\n"));
  assert.equal(result.ok, false);
  assert.ok(!result.ok);
  assert.deepEqual(result.conflicts, [{ mine: { from: 4, to: 4, lines: ["yours\n"] }, base: { lines: ["d\n"] }, theirs: { lines: ["echo's\n"] } }]);
  // Two different insertions at one point are a conflict too: which goes first is a decision.
  const insert = merge3(BASE, BASE.replace("c\n", "c\nx\n"), BASE.replace("c\n", "c\ny\n"));
  assert.equal(insert.ok, false);
});

test("changes on neighbouring lines are a conflict, as they are in git", () => {
  const result = merge3(BASE, BASE.replace("c\n", "C\n"), BASE.replace("d\n", "D\n"));
  assert.equal(result.ok, false);
});

test("your line endings are kept, and a missing last newline is a change like any other", () => {
  const crlf = BASE.replace(/\n/g, "\r\n").replace("b\r\n", "B\r\n");
  const merged = merge3(BASE, crlf, BASE.replace("f\n", "F\n"));
  assert.deepEqual(merged, { ok: true, text: text("a", "B", "c", "d", "e", "F", "g").replace(/\n/g, "\r\n") });
  const noEnd = "a\nb";
  assert.deepEqual(merge3(noEnd, noEnd, "a\nb\n"), { ok: true, text: "a\nb\n" });
});

test("a conflict resolved by hand merges the next time: your side already carries Echo's change", () => {
  const theirs = BASE.replace("d\n", "echo's\n");
  const conflict = merge3(BASE, BASE.replace("d\n", "yours\n"), theirs);
  assert.equal(conflict.ok, false);
  // Resolved: Echo's line brought in beside yours.
  const resolved = BASE.replace("d\n", "echo's\nyours\n");
  assert.deepEqual(merge3(BASE, resolved, theirs), { ok: true, text: resolved });
  // Echo removed a line; yours changed its neighbour and then removed it too.
  const removed = BASE.replace("c\n", "");
  assert.equal(merge3(BASE, BASE.replace("d\n", "D\n"), removed).ok, false);
  const both = BASE.replace("c\nd\n", "D\n");
  assert.deepEqual(merge3(BASE, both, removed), { ok: true, text: both });
});
