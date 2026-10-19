import { test } from "node:test";
import assert from "node:assert/strict";

import { decimalsFor, decimalsOf, digitsFor, indexOf, lastIndex, niceLabelEvery, projectFlick, tickKind, valueAt } from "./scale";

test("a step's decimals decide the reading's", () => {
  assert.equal(decimalsOf(1), 0);
  assert.equal(decimalsOf(0.5), 1);
  assert.equal(decimalsOf(0.25), 2);
  assert.equal(decimalsOf(0.0001), 4);
});

test("values are whole steps from min, never float drift", () => {
  assert.equal(valueAt(3, 0, 0.1), 0.3, "not 0.30000000000000004");
  assert.equal(valueAt(10, 87.5, 0.1), 88.5);
  assert.equal(indexOf(88.5, 87.5, 108, 0.1), 10);
  assert.equal(indexOf(200, 30, 150, 0.5), 240, "past max lands on the last step");
  assert.equal(indexOf(-4, 30, 150, 0.5), 0, "before min lands on the first");
});

test("numbered ticks land every eight to twenty steps, on a nice number", () => {
  assert.equal(niceLabelEvery(0.1), 1, "a radio: 88, 89, 90");
  assert.equal(niceLabelEvery(0.5), 5);
  assert.equal(niceLabelEvery(1), 10);
  assert.equal(niceLabelEvery(5), 50);
  assert.equal(niceLabelEvery(0.25), 2);
  assert.equal(niceLabelEvery(3), 30, "no nice number is a whole number of 3s, so ten steps");
  for (const step of [0.1, 0.25, 0.5, 1, 2, 3, 5, 25]) {
    const steps = niceLabelEvery(step) / step;
    assert.ok(steps >= 8 && steps <= 20, `${step}: a label every ${steps} steps`);
    assert.ok(Math.abs(steps - Math.round(steps)) < 1e-9, `${step}: labels fall on steps`);
  }
});

test("ticks are major at a label, mid halfway, minor between", () => {
  const kinds = Array.from({ length: 11 }, (_, i) => tickKind(i, 88, 0.1, 1));
  assert.equal(kinds[0], "major", "88");
  assert.equal(kinds[5], "mid", "88.5");
  assert.equal(kinds[10], "major", "89");
  assert.deepEqual(new Set(kinds.slice(1, 5)), new Set(["minor"]));
  assert.equal(tickKind(1, 87.5, 0.1, 1), "minor", "labels sit on round values, not on min");
  assert.equal(tickKind(5, 87.5, 0.1, 1), "major", "88, five steps above 87.5");
});

test("a flick coasts on its velocity, then lands on a step inside the scale", () => {
  assert.equal(projectFlick(100, 0, 10, 50), 100);
  assert.equal(projectFlick(104, 0, 10, 50), 100, "a slow release settles on the nearest step");
  assert.ok(projectFlick(100, 1000, 10, 50) > 300, "a fast flick carries on");
  assert.equal(projectFlick(100, 1e6, 10, 50), 500, "never past the last step");
  assert.equal(projectFlick(100, -1e6, 10, 50), 0, "never before the first");
  assert.equal(projectFlick(100, 1000, 10, 50) % 10, 0);
});

test("the reading is wide enough for every value on the scale", () => {
  assert.equal(digitsFor(30, 150, 0.5), 4, "150.0");
  assert.equal(digitsFor(87.5, 108, 0.1), 4, "108.0");
  assert.equal(digitsFor(0, 100, 1), 3);
  assert.equal(digitsFor(-20, 5, 1), 3, "a scale below zero keeps a cell for the minus");
});

/*
 * A range that isn't a whole number of steps rounded its last step
 * up past `max` (0 to 10 by 4 reached 12), and a `min` with more decimals
 * than the step was rounded off (87.5 by 1 read 88, 89, 90…).
 */
test("the last step never passes max", () => {
  assert.equal(lastIndex(0, 10, 4), 2, "0, 4, 8: twelve is past the end");
  assert.equal(lastIndex(0, 10, 3), 3, "0, 3, 6, 9");
  assert.equal(lastIndex(87.5, 108, 0.1), 205, "a range that is whole steps keeps its last one");
  assert.equal(indexOf(12, 0, 10, 4), 2, "a value past max lands on the last step inside it");
  assert.equal(indexOf(10, 0, 10, 4), 2, "max itself rounds down to the last step, not up past it");
  assert.ok(valueAt(lastIndex(0, 10, 4), 0, 4) <= 10);
});

test("a min with more decimals than the step keeps them", () => {
  assert.equal(valueAt(0, 87.5, 1), 87.5);
  assert.equal(valueAt(1, 87.5, 1), 88.5);
  assert.equal(decimalsFor(87.5, 1), 1, "the reading shows the half");
  assert.equal(decimalsFor(0, 0.25), 2, "the step's decimals still count");
  assert.equal(digitsFor(87.5, 108, 1), 4, "107.5 needs four cells");
});

test("a scale whose steps never land on a round number still gets numbers, counted from min", () => {
  assert.equal(tickKind(0, 87.5, 1, 10), "major", "87.5 is labelled");
  assert.equal(tickKind(5, 87.5, 1, 10), "mid");
  assert.equal(tickKind(10, 87.5, 1, 10), "major", "97.5");
  assert.equal(tickKind(3, 87.5, 1, 10), "minor");
});
