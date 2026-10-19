import { test } from "node:test";
import assert from "node:assert/strict";

import { rubberband } from "./spring";

test("rubberband gives less the further it is pulled, and never reaches its dimension", () => {
  const a = rubberband(20, 36);
  const b = rubberband(40, 36);
  const c = rubberband(4000, 36);
  assert.ok(a > 0 && a < 20, "a pull is resisted");
  assert.ok(b - a < a, "the second 20px gives less than the first");
  assert.ok(c < 36, "it never passes its dimension");
});

test("rubberband is symmetric and still at zero", () => {
  assert.equal(rubberband(0, 36), 0);
  assert.equal(rubberband(-25, 36), -rubberband(25, 36));
});
