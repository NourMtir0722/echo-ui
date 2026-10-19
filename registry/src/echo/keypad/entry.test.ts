import { test } from "node:test";
import assert from "node:assert/strict";

import { digitsOf, press, valueOf } from "./entry";

const typeAll = (keys: string[], mode: "amount" | "pin" | "digits", max: number) =>
  keys.reduce((d, k) => press(d, k, mode, max), "");

test("an amount fills from the right, like a till", () => {
  assert.equal(valueOf(typeAll(["1", "2", "4", "0"], "amount", 6), "amount", 2), "12.40");
  assert.equal(valueOf("5", "amount", 2), "0.05");
  assert.equal(valueOf("", "amount", 2), "", "nothing typed is no value, not 0.00");
  assert.equal(valueOf("1240", "amount", 0), "1240", "no decimals, no point");
});

test("an amount never starts with a zero, and 00 types two", () => {
  assert.equal(typeAll(["0", "0", "5"], "amount", 6), "5");
  assert.equal(typeAll(["00"], "amount", 6), "", "00 on nothing is still nothing");
  assert.equal(typeAll(["1", "00"], "amount", 6), "100");
});

test("entry stops at the most digits it takes", () => {
  assert.equal(typeAll(["9", "9", "9", "9", "9", "9", "9"], "amount", 6), "999999");
  assert.equal(typeAll(["1", "2", "3", "4", "5"], "pin", 4), "1234");
  assert.equal(press("99999", "00", "amount", 6), "999990", "00 with room for one types one zero");
});

test("a PIN and a code keep their zeros", () => {
  assert.equal(typeAll(["0", "7"], "pin", 4), "07");
  assert.equal(valueOf("0071", "digits", 2), "0071");
});

test("delete takes the last digit off", () => {
  assert.equal(press("1240", "delete", "amount", 6), "124");
  assert.equal(press("", "delete", "pin", 4), "");
});

test("a value set from outside becomes its digits", () => {
  assert.equal(digitsOf("12.40", "amount"), "1240");
  assert.equal(digitsOf("0.05", "amount"), "5");
  assert.equal(digitsOf("0071", "pin"), "0071");
  assert.equal(valueOf(digitsOf("12.40", "amount"), "amount", 2), "12.40", "round trip");
});

/*
 * A value set from outside was read by stripping every non-digit and
 * re-applying `decimals`, so any amount not written with exactly that many
 * places came out wrong: "12.4" showed 1.24, "12" showed 0.12, "5" 0.05.
 */
test("an amount set from outside is read as a number, whatever its places", () => {
  const read = (v: string, decimals = 2) => valueOf(digitsOf(v, "amount", decimals), "amount", decimals);
  assert.equal(read("12.4"), "12.40");
  assert.equal(read("12"), "12.00");
  assert.equal(read(String(12.5)), "12.50", "a number passed through String()");
  assert.equal(read("5"), "5.00");
  assert.equal(read("0.05"), "0.05");
  assert.equal(read("12.40"), "12.40", "exactly the right places still round-trips");
  assert.equal(read("12.345"), "12.34", "places past the pad's are cut, the way a till can't hold them");
  assert.equal(read("12.4", 0), "12", "no decimals, no fraction");
  assert.equal(read(""), "", "nothing is no value");
  assert.equal(read("0"), "", "zero is nothing typed yet");
});
