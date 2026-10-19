import { test } from "node:test";
import assert from "node:assert/strict";

import { mergeHandlers, mergeRefs } from "./compose";

test("both sides hear the event, the caller's handler first", () => {
  const calls: string[] = [];
  const merged = mergeHandlers<HTMLElement>(
    { onPointerDown: () => calls.push("mine") },
    { onPointerDown: () => calls.push("theirs"), onClick: () => calls.push("click") },
  );
  (merged.onPointerDown as (e: never) => void)(undefined as never);
  assert.deepEqual(calls, ["theirs", "mine"]);
  assert.equal(merged.onClick, undefined, "handlers the part doesn't own are left to the caller's spread");
});

test("one ref fills callback and object refs alike", () => {
  const box = { current: null as string | null };
  let seen: string | null = null;
  mergeRefs<string>(box, (n) => {
    seen = n;
  }, undefined)("node");
  assert.equal(box.current, "node");
  assert.equal(seen, "node");
});
