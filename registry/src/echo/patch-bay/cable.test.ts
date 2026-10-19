import { test } from "node:test";
import assert from "node:assert/strict";

import { cablePath, restingSag } from "./cable";

test("a longer cable hangs lower, up to a limit", () => {
  const a = { x: 0, y: 0 };
  assert.ok(restingSag(a, { x: 300, y: 0 }) > restingSag(a, { x: 100, y: 0 }));
  assert.equal(restingSag(a, { x: 5000, y: 0 }), 90);
});

test("a cable starts and ends at its sockets and sags between", () => {
  const d = cablePath({ x: 110, y: 120 }, { x: 310, y: 160 }, 40);
  assert.ok(d.startsWith("M110.0 120.0 C"), d);
  assert.ok(d.endsWith(" 310.0 160.0"), d);
  const [, c1y] = d.match(/C[\d.]+ ([\d.]+)/)!;
  assert.equal(Number(c1y), 160, "the first control point hangs by the sag");
});
