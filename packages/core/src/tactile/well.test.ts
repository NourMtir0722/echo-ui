import { test } from "node:test";
import assert from "node:assert/strict";

import { caretStretch, stackStrike, strikeFor } from "./well";

test("typing strikes the surface, deleting lifts it, a paste lands heavier", () => {
  assert.ok(strikeFor("insertText") > 0);
  assert.ok(strikeFor("deleteContentBackward") < 0);
  assert.ok(strikeFor("deleteWordBackward") < 0);
  assert.ok(strikeFor("insertFromPaste") > strikeFor("insertText"));
});

test("a burst of keys stacks, but the surface never jumps", () => {
  let v = 0;
  for (let i = 0; i < 20; i++) v = stackStrike(v, strikeFor("insertText"));
  assert.equal(v, 14);
  assert.ok(stackStrike(0, strikeFor("insertText")) < 14, "one key is not a burst");
  assert.equal(stackStrike(-8, -3.2), -9);
});

test("the caret stretches with speed, and only so far", () => {
  assert.equal(caretStretch(0), 0);
  assert.ok(caretStretch(-800) > 0, "either direction");
  assert.equal(caretStretch(100000), 5);
});
