import { test } from "node:test";
import assert from "node:assert/strict";

import { fingerprintText, fitStyles, parseProfile, parseTolerance, type FitCandidate } from "./style-fit";

const style = (name: string, spec: string): FitCandidate => ({ name, title: name, essence: "", fingerprint: parseProfile(spec), from: "yours" });

test("a profile is seven letters with a number each, in any order, and anything else says how to write one", () => {
  assert.deepEqual(parseProfile("O3 C3 E3 F2 D1 V2 W4"), { warmth: 4, volume: 2, density: 1, formality: 2, era: 3, craft: 3, ornament: 3 });
  assert.equal(fingerprintText(parseProfile("W4 V2 D1 F2 E3 C3 O3")), "W4 V2 D1 F2 E3 C3 O3");
  assert.throws(() => parseProfile("W4 V2 D1 F2 E3 C3"), /leaves out ornament/);
  assert.throws(() => parseProfile("W4 V2 D1 F2 E3 C3 O7"), /ornament is 1 to 5/);
  assert.throws(() => parseProfile("W4 V2 D1 F2 E3 C3 X3"), /"X3" isn't an axis/);
  assert.throws(() => parseProfile("W4 W2 D1 F2 E3 C3 O3"), /warmth is given twice/);
});

test("without a tolerance every axis may drift a point, and 0 locks one", () => {
  assert.deepEqual(Object.values(parseTolerance(undefined)), [1, 1, 1, 1, 1, 1, 1]);
  assert.equal(parseTolerance("W1 V1 D1 F0 E2 C1 O2").formality, 0);
});

test("styles are ordered by how far past tolerance they land, and a locked miss is out whatever else it scores", () => {
  const target = parseProfile("W4 V2 D1 F2 E3 C3 O3");
  const tolerance = parseTolerance("W1 V1 D1 F0 E2 C1 O1");
  const results = fitStyles(target, tolerance, [
    style("close-but-severe", "W4 V2 D1 F3 E3 C3 O3"), // one point off on the locked axis
    style("inside", "W4 V3 D2 F2 E4 C3 O3"), // within tolerance everywhere
    style("loud", "W4 V5 D1 F2 E3 C3 O3"), // two past tolerance on volume
  ]);
  assert.deepEqual(results.map((r) => r.name), ["inside", "loud", "close-but-severe"]);
  assert.equal(results[0]!.over, 0);
  assert.equal(results[0]!.total, 3);
  assert.equal(results[1]!.over, 2);
  assert.deepEqual(results[2]!.locked, ["formality"]);
  assert.equal(results[1]!.distance.volume, 3, "distance is signed: the style minus the target");
});

test("the same profile against the same library gives the same order, every time", () => {
  const target = parseProfile("W2 V2 D3 F4 E3 C5 O2");
  const library = [style("b", "W2 V2 D3 F4 E4 C5 O2"), style("a", "W2 V2 D3 F4 E4 C5 O2"), style("c", "W1 V1 D3 F4 E4 C5 O1")];
  const first = fitStyles(target, parseTolerance(undefined), library).map((r) => r.name);
  assert.deepEqual(first, ["a", "b", "c"], "a tie is broken by name, not by the order the library was read in");
  assert.deepEqual(fitStyles(target, parseTolerance(undefined), [...library].reverse()).map((r) => r.name), first);
});
