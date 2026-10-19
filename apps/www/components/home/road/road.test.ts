import { test } from "node:test";
import assert from "node:assert/strict";

import { NARROW_LANE, PACE, alongFor, layOut, nearest, nextMove, slotsOf, type Row } from "./road";

/** Five stops, each 360px tall with 160px between, the way the section stacks them. */
const rows: Row[] = Array.from({ length: 5 }, (_, i) => ({ top: 40 + i * 520, bottom: 400 + i * 520 }));
const HEIGHT = 40 + 5 * 520 + 80;

test("wide, the cable passes through every stop, alternating sides, with two bends between each", () => {
  const l = layOut(1200, HEIGHT, rows)!;
  assert.equal(l.wide, true);
  assert.equal(l.stations.length, 5);
  l.stations.forEach((st, i) => {
    const p = l.road.at(st.s);
    assert.ok(Math.abs(p.y - (rows[i]!.top + rows[i]!.bottom) / 2) < 0.5, `station ${i} is level with its stop`);
    assert.ok(Math.abs(p.x - (i % 2 === 0 ? 960 : 240)) < 0.5, `station ${i} is on its side`);
  });
  assert.equal(l.road.segs.filter((s) => s.kind === "arc").length, 8);
  // It runs from the top of the section to the bottom.
  assert.equal(l.road.at(0).y, 0);
  assert.equal(l.road.at(l.road.length).y, HEIGHT);
});

test("narrow, it's one straight run down the left edge, through every stop", () => {
  const l = layOut(390, HEIGHT, rows)!;
  assert.equal(l.wide, false);
  assert.equal(l.road.segs.every((s) => s.kind === "line"), true);
  for (const st of l.stations) assert.equal(l.road.at(st.s).x, NARROW_LANE);
});

test("the ticks keep a pace and keep clear of the stations", () => {
  const l = layOut(1200, HEIGHT, rows)!;
  for (const t of l.ticks) for (const st of l.stations) assert.ok(Math.abs(t.s - st.s) >= PACE * 0.75);
  for (let i = 1; i < l.ticks.length; i++) assert.ok(l.ticks[i]!.s > l.ticks[i - 1]!.s);
});

test("the reading line puts Echo on a stop while it's read, and between stops on the way, forwards and back", () => {
  const l = layOut(1200, HEIGHT, rows)!;
  for (const st of l.stations) {
    assert.equal(alongFor(l, st.y), st.s, "on the stop as it's read");
    assert.equal(alongFor(l, st.y + 100), st.s, "and while it's still being read");
  }
  const between = alongFor(l, (l.stations[1]!.y + l.stations[2]!.y) / 2);
  assert.ok(between > l.stations[1]!.s && between < l.stations[2]!.s);
  // Monotonic: scrolling on never sends it back, and scrolling back retraces the same places.
  let prev = -1;
  for (let y = 0; y <= HEIGHT; y += 25) {
    const s = alongFor(l, y);
    assert.ok(s >= prev);
    prev = s;
  }
});

test("Echo lands on the straights and at every stop, and rolls round each bend in whole turns", () => {
  const l = layOut(1200, HEIGHT, rows)!;
  const { slots, rolls } = slotsOf(l);
  assert.deepEqual(
    slots.filter((s) => s.station >= 0).map((s) => s.station),
    [0, 1, 2, 3, 4],
  );
  assert.ok(rolls.some(Boolean), "a bend between two stops is rolled");
  const size = 64;
  let k = 0;
  const goal = slots.findIndex((s) => s.station === 4);
  let sawRoll = false;
  for (let guard = 0; k !== goal && guard < 200; guard++) {
    const m = nextMove(l, slots, rolls, k, goal, size)!;
    assert.ok(m.to !== k);
    assert.ok(m.dur <= 700, "every move is quick");
    if (m.kind === "roll") {
      sawRoll = true;
      assert.ok(Number.isInteger(m.turns) && m.turns !== 0, "whole turns, so it lands upright");
    }
    k = m.to;
  }
  assert.equal(k, goal, "it gets there");
  assert.ok(sawRoll);
  assert.equal(nextMove(l, slots, rolls, goal, goal, size), null);
  assert.equal(nearest(slots, l.stations[2]!.s), slots.findIndex((s) => s.station === 2));
});
