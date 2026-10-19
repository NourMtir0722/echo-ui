import { test } from "node:test";
import assert from "node:assert/strict";

import { ECHO_DOTS } from "./character";
import { gridOf, look, mark, place, screenFor, shut, MARKS } from "./dots";

const text = (g: string[][]) => g.map((r) => r.join(""));

test("Echo's dots are a square drawing with two eyes", () => {
  assert.ok(ECHO_DOTS.every((r) => r.length === ECHO_DOTS.length), "every row as wide as it is tall");
  const eyeRows = ECHO_DOTS.filter((r) => /[o*]/.test(r));
  assert.ok(eyeRows.length >= 3);
  assert.ok(eyeRows.every((r) => (r.match(/[o*]+/g) ?? []).length === 2), "two eyes on every eye row");
});

test("shut eyes are one line of white across where they were", () => {
  const closed = text(shut(gridOf(ECHO_DOTS)));
  const withWhite = closed.filter((r) => r.includes("o"));
  assert.equal(withWhite.length, 1, "one row of white");
  assert.ok(!closed.some((r) => r.includes("*")), "no pupils showing");
  assert.equal(closed.join("").replace(/o/g, "#").length, ECHO_DOTS.join("").length, "the silhouette doesn't change");
});

test("the pupils move to the side the eyes look", () => {
  const g = gridOf(["#oo**#"]);
  assert.equal(text(look(g, -1))[0], "#**oo#");
  assert.equal(text(look(g, 1))[0], "#oo**#");
  assert.equal(text(look(gridOf(["#oooo**o#"]), 0))[0], "#oo**ooo#", "two pupils in seven sit just left of centre");
  assert.equal(text(look(gridOf(["#o*oo#"]), 0))[0], "#o*oo#", "one pupil in four sits just left of centre");
  assert.equal(text(look(gridOf(["#oooo#"]), 1))[0], "#oooo#", "a row of white with no pupil stays as it is");
});

test("placing a drawing clips it to the screen and lists only lit dots", () => {
  const dots = place(gridOf(["#o.", "*##"]), 0, 0, 3, 2);
  assert.deepEqual(
    dots.map((d) => `${d.x},${d.y},${d.ink}`),
    ["0,0,body", "1,0,eye", "1,1,body", "2,1,body"],
    "a pupil and nothing are dark",
  );
  assert.equal(place(gridOf(["###"]), -1, 0, 2, 1).length, 2, "off the left edge is clipped");
});

test("marks are drawn in paper, and the screen leaves room to walk and hop", () => {
  assert.ok(mark(MARKS.question, 0, 0, 10, 10).every((d) => d.ink === "eye"));
  const { cols, rows } = screenFor(gridOf(ECHO_DOTS));
  assert.ok(cols > ECHO_DOTS.length + 10);
  assert.ok(rows > ECHO_DOTS.length + 4);
});
