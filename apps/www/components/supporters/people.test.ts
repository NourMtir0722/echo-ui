import { test } from "node:test";
import assert from "node:assert/strict";
import type { Supporter } from "@/components/support/supporters";
import { NOOR, everyone, numberOf } from "./people";
import { blueOf, finishOf } from "./finish";

const sample: Supporter[] = [
  { id: "c", name: "C", plan: "once", no: 3, since: "November 2026", times: 1, links: [] },
  { id: "b", name: "B", plan: "monthly", no: 2, since: "October 2026", times: 1, links: [] },
  { id: "a", name: "A", plan: "monthly", no: 1, since: "October 2026", times: 1, founding: true, links: [] },
];

test("the island's order: Noor, then monthly supporters, then one-time ones, each by number", () => {
  assert.deepEqual(
    everyone("#3D8EF0", sample).map((p) => p.id),
    ["noor", "a", "b", "c"],
  );
});

test("how someone supports shows in their Echo's finish, and everyone has a blue of their own", () => {
  const [a, b, c] = [sample[2]!, sample[1]!, sample[0]!];
  assert.deepEqual([finishOf(a), finishOf(b), finishOf(c)], ["pearl", "glaze", "satin"]);
  assert.equal(blueOf(NOOR, "#3D8EF0"), "#3D8EF0");
  assert.equal(blueOf(b, "#3D8EF0"), blueOf(b, "#3D8EF0"));
  assert.notEqual(blueOf(b, "#3D8EF0"), blueOf({ ...b, id: "another" }, "#3D8EF0"));
});

test("a number is set like a numbered print", () => {
  assert.equal(numberOf({ no: 7 }), "No. 007");
  assert.equal(numberOf({ no: 128 }), "No. 128");
  assert.equal(numberOf(NOOR), "");
});
