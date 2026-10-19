import { test } from "node:test";
import assert from "node:assert/strict";

import { moveBy, moveTo, reconcile } from "./order";

test("a widget moves to a place, and the rest close up around it", () => {
  assert.deepEqual(moveTo(["a", "b", "c", "d"], "a", 2), ["b", "c", "a", "d"]);
  assert.deepEqual(moveTo(["a", "b", "c", "d"], "d", 0), ["d", "a", "b", "c"]);
  assert.deepEqual(moveTo(["a", "b"], "a", 99), ["b", "a"], "past the end is the end");
  assert.deepEqual(moveTo(["a", "b"], "z", 0), ["a", "b"], "an unknown widget moves nothing");
});

test("moving by places stops at the ends", () => {
  assert.deepEqual(moveBy(["a", "b", "c"], "b", 1), ["a", "c", "b"]);
  assert.deepEqual(moveBy(["a", "b", "c"], "a", -1), ["a", "b", "c"]);
});

test("an order keeps up with widgets added and removed", () => {
  assert.deepEqual(reconcile(["c", "a", "b"], ["a", "b", "c", "d"]), ["c", "a", "b", "d"]);
  assert.deepEqual(reconcile(["c", "a", "b"], ["a", "b"]), ["a", "b"]);
});
