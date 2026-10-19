import { test } from "node:test";
import assert from "node:assert/strict";

import { CHARS, DIGITS, rollDirection, rollStep, turn, turnMs, turnsLeft } from "./drum";

test("a character counts the turns to its target, either way round", () => {
  assert.equal(turnsLeft("2", "5", DIGITS), 3);
  assert.equal(turnsLeft("8", "1", DIGITS), 3, "forward wraps 9 → 0");
  assert.equal(turnsLeft("5", "2", DIGITS, -1), 3);
  assert.equal(turnsLeft("1", "8", DIGITS, -1), 3, "back wraps 0 → 9");
  assert.equal(turnsLeft("4", "4", DIGITS), 0);
  assert.equal(turnsLeft(",", "4", DIGITS), -1, "off the drum");
});

test("one turn moves one step, and a character off the drum swaps", () => {
  assert.equal(turn("2", "5", DIGITS), "3");
  assert.equal(turn("9", "1", DIGITS), "0");
  assert.equal(turn("0", "8", DIGITS, -1), "9");
  assert.equal(turn(" ", "7", DIGITS), "7");
  assert.equal(turn("A", "C", CHARS), "B");
});

test("far turns are fast and the last is slowest", () => {
  assert.ok(turnMs(8) < turnMs(2));
  assert.ok(turnMs(2) < turnMs(1));
});

test("a readout rolls every digit a step at a time until it arrives", () => {
  const seen: string[] = [];
  let at = "18";
  for (let guard = 0; at !== "21" && guard < 20; guard++) {
    at = rollStep(at, "21", DIGITS).next;
    seen.push(at);
  }
  assert.deepEqual(seen, ["29", "20", "21"]);
});

test("digits are right-aligned, so 99 → 100 turns the nines and adds a 1", () => {
  assert.deepEqual(rollStep("99", "100", DIGITS), { next: "100", left: 0 });
  assert.deepEqual(rollStep("100", "99", DIGITS, -1), { next: "99", left: 0 });
});

test("what isn't on the drum swaps at once and the rest keeps rolling", () => {
  const { next, left } = rollStep("1,000", "1,003", DIGITS);
  assert.equal(next, "1,001");
  assert.equal(left, 2);
});

test("a falling number rolls back, anything else forward", () => {
  assert.equal(rollDirection("12", "9"), -1);
  assert.equal(rollDirection("1,024", "1,100"), 1);
  assert.equal(rollDirection("07:42", "07:41"), 1, "not a number: forward, like a flap");
});
