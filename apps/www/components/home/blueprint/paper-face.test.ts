import { test } from "node:test";
import assert from "node:assert/strict";
import { contrastRatio, hexToOklch } from "echo-ui-core/theme";

import { blueprintBlues } from "./paper-face";

test("a seed with no hue gets a graphite sheet, and the sheet's white words still read on it", () => {
  for (const accent of ["#1C1C1C", "#F3F3F3", "#050505", "#FDFDFD", "#808080"]) {
    const sheet = blueprintBlues(accent);
    for (const face of [sheet.deep, sheet.light, sheet.back]) {
      assert.ok(hexToOklch(face).C < 0.01, `${accent} gave ${face}, a colour`);
    }
    assert.ok(contrastRatio("#FFFFFF", sheet.light) >= 4.5, `white on ${sheet.light}`);
  }
});

test("a seed with a hue keeps its own blueprint, with the white words reading on it", () => {
  const sheet = blueprintBlues("#3D8EF0");
  assert.ok(hexToOklch(sheet.light).C > 0.1);
  assert.ok(contrastRatio("#FFFFFF", sheet.light) >= 4.5);
});
