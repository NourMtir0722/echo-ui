import { test } from "node:test";
import assert from "node:assert/strict";

import { roadCss, roadStyles } from "./road-css";

test("the road's styles are the file's rules, without comments or indentation", () => {
  assert.equal(roadCss("/* the road */\n.demo {\n  color: red;\n}\n\n"), ".demo {\ncolor: red;\n}");
});

test("in development an edit to journey.css reaches the next render of the homepage", () => {
  let source = ".demo { color: red; }";
  const read = () => source;
  assert.equal(roadStyles(read, false), ".demo { color: red; }");
  source = ".demo { color: blue; }";
  assert.equal(roadStyles(read, false), ".demo { color: blue; }");
});
