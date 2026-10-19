import { test } from "node:test";
import assert from "node:assert/strict";

import { canDraw, layout, place, segmentsFor, CELL_W, COLON_W, LEAN_OFFSET } from "./segments";

const lit = (text: string) => layout(text).map((c) => (c.kind === "colon" ? ":" : c.lit.join("")));

test("each digit lights the segments a seven-segment face uses for it", () => {
  assert.deepEqual(lit("8"), ["abcdefg"]);
  assert.deepEqual(lit("1"), ["bc"]);
  assert.deepEqual(lit("0"), ["abcdef"]);
  assert.deepEqual(lit("7"), ["abc"]);
  assert.deepEqual(lit("-"), ["g"]);
});

test("letters the face can draw light, in either case; the rest are blank cells", () => {
  assert.equal(segmentsFor("E")?.join(""), "adefg");
  assert.equal(segmentsFor("e")?.join(""), "adefg", "an e is drawn as the E the face has");
  assert.equal(segmentsFor("b")?.join(""), "cdefg");
  assert.equal(segmentsFor("B")?.join(""), "cdefg", "a B is drawn as the b the face has");
  assert.equal(segmentsFor("W"), null);
  assert.deepEqual(lit("W"), [""], "a character the face can't draw is a blank cell, not a gap");
  assert.ok(canDraw("88:05"));
  assert.ok(canDraw("Err"));
  assert.ok(!canDraw("Wow"));
});

test("a dot lights the point of the cell before it and takes no cell of its own", () => {
  const cells = layout("88.5");
  assert.equal(cells.length, 3);
  assert.deepEqual(
    cells.map((c) => c.kind === "digit" && c.dp),
    [false, true, false],
  );
  const leading = layout(".5");
  assert.equal(leading.length, 2, "a dot with nothing before it gets a blank cell");
  assert.ok(leading[0]!.kind === "digit" && leading[0]!.dp && leading[0]!.lit.length === 0);
});

test("a colon is its own narrow cell", () => {
  const cells = layout("12:40");
  assert.equal(cells.length, 5);
  assert.equal(cells[2]!.kind, "colon");
  const { x, width } = place(cells);
  assert.equal(x[0], LEAN_OFFSET, "the face leaves room for the lean at its left edge");
  assert.equal(width, LEAN_OFFSET + 4 * CELL_W + COLON_W);
});

test("padding fills on the left, as dim zeros by default or as blanks", () => {
  const zeros = layout("88.5", 4);
  assert.equal(zeros.length, 4);
  assert.ok(zeros[0]!.kind === "digit" && zeros[0]!.pad && zeros[0]!.lit.join("") === "abcdef");
  assert.ok(zeros.slice(1).every((c) => c.kind === "digit" && !c.pad), "the reading itself is never padding");
  const blanks = layout("7", 3, " ");
  assert.equal(blanks.length, 3);
  assert.ok(blanks[0]!.kind === "digit" && blanks[0]!.pad && blanks[0]!.lit.length === 0);
  assert.equal(layout("1234", 2).length, 4, "a reading longer than `digits` is never cut");
});

test("a colon and a dot don't count as digits when padding", () => {
  assert.equal(layout("7:05", 4).filter((c) => c.kind === "digit").length, 4);
  assert.equal(layout("2.5", 3).filter((c) => c.kind === "digit").length, 3);
});

/*
 * Padding went in front of the whole text, so with the default dim
 * zeros a negative reading drew a zero before its minus: -5 in three cells
 * read "0-5". Zeros now go between the minus and the digits ("-05"); blanks
 * still lead, the way a calculator right-aligns "  -5".
 */
test("a negative reading keeps its minus in front of the padding zeros", () => {
  const MINUS = segmentsFor("-")!.join("");
  const FIVE = segmentsFor("5")!.join("");
  const read = (cells: ReturnType<typeof layout>) =>
    cells.map((c) => (c.kind === "colon" ? ":" : c.pad ? (c.lit.length ? "pad0" : "pad ") : c.lit.join("")));
  assert.deepEqual(read(layout("-5", 3)), [MINUS, "pad0", FIVE], "-05, not 0-5");
  assert.deepEqual(read(layout("5", 3)), ["pad0", "pad0", FIVE], "a positive reading pads as before");
  assert.deepEqual(read(layout("-5", 3, " ")), ["pad ", MINUS, FIVE], "blanks lead");
  assert.equal(
    layout("-12.5", 4).filter((c) => c.kind === "digit" && c.pad).length,
    0,
    "a reading that fills its cells gets no padding",
  );
});
