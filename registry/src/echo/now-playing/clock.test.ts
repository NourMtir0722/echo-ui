import { test } from "node:test";
import assert from "node:assert/strict";

import { clock, lengthOf } from "./clock";

test("seconds read as a clock", () => {
  assert.equal(clock(0), "00:00");
  assert.equal(clock(84), "01:24");
  assert.equal(clock(84.9), "01:24", "a part-second hasn't happened yet");
  assert.equal(clock(3725), "1:02:05");
  assert.equal(clock(-3), "00:00");
});

/*
 * An <audio> element's duration is NaN before its metadata loads
 * and Infinity for a live stream. clock() read them as "NaN:NaN" and
 * "Infinity:NaN:NaN", the Slider got max NaN, and Infinity wasn't live.
 */
test("a time that isn't known yet reads as dashes", () => {
  assert.equal(clock(Number.NaN), "--:--");
  assert.equal(clock(Number.POSITIVE_INFINITY), "--:--");
});

test("a duration is live, still loading, or a length", () => {
  assert.deepEqual(lengthOf(undefined), { kind: "live" });
  assert.deepEqual(lengthOf(Number.POSITIVE_INFINITY), { kind: "live" }, "a live stream's audio.duration");
  assert.deepEqual(lengthOf(Number.NaN), { kind: "loading" }, "before the metadata loads");
  assert.deepEqual(lengthOf(214), { kind: "known", seconds: 214 });
  assert.deepEqual(lengthOf(-5), { kind: "loading" }, "a negative length is no length");
});
