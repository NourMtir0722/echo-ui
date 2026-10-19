import { test } from "node:test";
import assert from "node:assert/strict";

import { drift, type Place } from "./drift";

const MAKE: Place = { x: 1100, y: 430, w: 470, rz: 0 };
const PICK: Place = { x: 1120, y: 470, w: 560, rz: 0 };

const close = (a: number, b: number, what: string) => assert.ok(Math.abs(a - b) < 1e-6, `${what}: ${a} ≠ ${b}`);

test("a sheet takes off from exactly where it lay, flat on the page", () => {
  for (const behind of [false, true]) {
    const p = drift(0, MAKE, PICK, behind);
    close(p.x, MAKE.x, "x");
    close(p.y, MAKE.y, "y");
    close(p.w, MAKE.w, "width");
    close(p.rz, MAKE.rz, "turn");
    for (const k of ["z", "rx", "ry", "flutter", "curl"] as const) close(p[k], 0, k);
  }
});

test("it lands exactly where the page's sheet lies, flat again", () => {
  for (const behind of [false, true]) {
    const p = drift(1, MAKE, PICK, behind);
    close(p.x, PICK.x, "x");
    close(p.y, PICK.y, "y");
    close(p.w, PICK.w, "width");
    close(p.rz, PICK.rz, "turn");
    for (const k of ["z", "rx", "ry", "flutter", "curl"] as const) close(p[k], 0, k);
  }
});

test("between, it lifts towards you and rides the air; only then is it drawn", () => {
  const mid = drift(0.5, MAKE, PICK);
  assert.ok(mid.visible && mid.z > 100 && mid.flutter > 0.5, JSON.stringify(mid));
  assert.equal(drift(0, MAKE, PICK).visible, false);
  assert.equal(drift(1, MAKE, PICK).visible, false);
});

test("the sheet behind keeps behind all the way, and the two drift apart", () => {
  for (let q = 0.05; q < 1; q += 0.05) {
    const front = drift(q, MAKE, PICK);
    const back = drift(q, MAKE, PICK, true);
    assert.ok(back.depth - back.z > -front.z + 100, `at ${q.toFixed(2)} the back sheet comes forward`);
  }
  assert.ok(drift(0.3, MAKE, PICK).x < drift(0.3, MAKE, PICK, true).x);
});
