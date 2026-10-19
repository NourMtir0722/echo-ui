import { test } from "node:test";
import assert from "node:assert/strict";

import { DESIGN_RULES, glowOf, parseShadows, raised, recessed } from "./design";
import { PAGE_RULES } from "./types";

/**
 * The design tests read a shadow the way the browser reports it, and tell a
 * shade below a part from a glow around it and a recess into it. The rest of
 * them measure a rendered page, and are tested on one (tests/page-tests.spec.ts).
 */
test("a computed box-shadow reads layer by layer, whatever colour form the browser used", () => {
  assert.deepEqual(parseShadows("none"), []);
  const [drop, lip] = parseShadows("rgba(0, 0, 0, 0.45) 0px 10px 22px 0px, rgb(255, 255, 255) 0px 1px 0px 0px inset");
  assert.deepEqual({ ...drop, colour: undefined }, { x: 0, y: 10, blur: 22, spread: 0, inset: false, colour: undefined });
  assert.ok(Math.abs(drop!.colour!.a - 0.45) < 0.01);
  assert.equal(lip!.inset, true);
  const [mixed] = parseShadows("oklab(0.62 0.05 -0.2 / 0.7) 0px 0px 7px 0px");
  assert.equal(mixed!.blur, 7);
  assert.ok(mixed!.colour);
});

test("a shade below is raised, an inset shade is recessed, and a lit halo is a glow", () => {
  assert.ok(raised(parseShadows("rgba(0, 0, 0, 0.4) 0px 4px 12px 0px")));
  // A drawn device's stand: a hard ink edge below, no blur.
  assert.ok(raised(parseShadows("rgb(20, 20, 20) 0px 3px 0px 1.5px")));
  // A pale lip a pixel down is a highlight, not a stand.
  assert.ok(!raised(parseShadows("rgba(255, 255, 255, 0.9) 0px 1px 0px 0px")));
  assert.ok(recessed(parseShadows("rgba(0, 0, 0, 0.6) 0px 2px 5px 0px inset")));
  // A ring is a line, not depth.
  assert.ok(!recessed(parseShadows("rgb(139, 111, 232) 0px 0px 0px 2px inset")));
  assert.ok(glowOf(parseShadows("rgba(139, 111, 232, 0.7) 0px 0px 14px 0px")));
  assert.ok(!glowOf(parseShadows("rgba(0, 0, 0, 0.5) 0px 0px 14px 0px")), "a dark halo is a shade");
  assert.ok(!glowOf(parseShadows("rgba(139, 111, 232, 0.7) 0px 6px 14px 0px")), "a coloured drop is a shadow");
  assert.ok(!glowOf(parseShadows("rgb(139, 111, 232) 0px 0px 0px 4px")), "a focus ring has no blur");
});

test("the design tests are page rules, beside contrast and before the screen rules", () => {
  for (const rule of DESIGN_RULES) assert.ok(PAGE_RULES.includes(rule), rule);
  assert.ok(PAGE_RULES.indexOf("contrast") < PAGE_RULES.indexOf("alignment"));
  assert.ok(PAGE_RULES.indexOf("icons") < PAGE_RULES.indexOf("screen"));
});
