import { test } from "node:test";
import assert from "node:assert/strict";
import { BLOOMS, DEFAULT_BLOOM, SAMPLES, bloomAt, bloomEnd, framePath, getBloom, mark } from "./bloom";
import { springAt, springEase, springSettle } from "./springs";
import { area, flatten } from "./outline";
import { BODY } from "./paths";

const TAU = Math.PI * 2;
const deg = (r: number) => (r * 180) / Math.PI;
const bodyArea = Math.abs(area(flatten(BODY)[0]!));
const frameArea = (d: string) => Math.abs(area(flatten(d)[0]!));

test("the mark is measured as eight petals, clockwise from the top, 45° apart", () => {
  const { petals } = mark();
  assert.equal(petals.length, 8);
  petals.forEach((p, i) => {
    let off = deg(p.angle) - i * 45;
    if (off > 180) off -= 360;
    assert.ok(Math.abs(off) < 5, `petal ${i} at ${deg(p.angle).toFixed(1)}°`);
  });
});

test("the radial outline is the drawing: swapping in BODY at the end moves nothing", () => {
  const { cx, cy, radii } = mark();
  let worst = 0;
  for (const [x, y] of flatten(BODY, 48)[0]!) {
    let th = Math.atan2(x - cx, -(y - cy));
    if (th < 0) th += TAU;
    const f = (th / TAU) * SAMPLES;
    const i0 = Math.floor(f) % SAMPLES;
    const r = radii[i0]! + (radii[(i0 + 1) % SAMPLES]! - radii[i0]!) * (f - Math.floor(f));
    worst = Math.max(worst, Math.abs(r - Math.hypot(x - cx, y - cy)));
  }
  // 0.15 units is 0.23px on the 84px boot mark.
  assert.ok(worst < 0.15, `the sampled outline strays ${worst.toFixed(3)} units from BODY`);
});

test("four variants ship, Unfurl first and by default", () => {
  assert.deepEqual(
    BLOOMS.map((b) => b.id),
    ["unfurl", "nested", "divide", "breath"],
  );
  assert.equal(DEFAULT_BLOOM.id, "unfurl");
  assert.equal(getBloom(undefined).id, "unfurl");
});

for (const b of BLOOMS) {
  test(`${b.name}: starts from nothing and lands exactly on the mark`, () => {
    assert.equal(bloomAt(b, 0).scale, 0);
    const end = bloomEnd(b);
    assert.ok(end < 2, `${end.toFixed(2)}s is too long for a boot`);
    assert.equal(bloomAt(b, end).done, true);
    const last = bloomAt(b, end - 1 / 120);
    assert.equal(last.done, false);
    const { radii } = mark();
    let worst = 0;
    for (let i = 0; i < SAMPLES; i++) worst = Math.max(worst, Math.abs(last.radii[i]! * last.scale - radii[i]!));
    assert.ok(worst < 0.1, `the last frame is ${worst.toFixed(3)} units off the mark`);
    assert.ok(Math.abs(frameArea(framePath(last)) - bodyArea) / bodyArea < 0.005);
  });

  test(`${b.name}: only grows — never the old deflation`, () => {
    // Spring settling may dip a hair below the running size (a bounce coming
    // back); what must never happen again is the old engine's shape losing
    // 24% of itself on the way to four petals.
    const end = bloomEnd(b);
    let best = 0;
    for (let t = 0; t <= end; t += 1 / 120) {
      const a = frameArea(framePath(bloomAt(b, t)));
      const floor = Math.min(best, bodyArea);
      assert.ok(a >= floor - bodyArea * 0.01, `at ${t.toFixed(3)}s the shape fell to ${a.toFixed(0)} from ${floor.toFixed(0)}`);
      best = Math.max(best, a);
    }
  });

  test(`${b.name}: the same instant draws the same frame`, () => {
    const t = bloomEnd(b) / 2;
    assert.equal(framePath(bloomAt(b, t)), framePath(bloomAt(b, t)));
  });
}

test("springs: bounce 0 never overshoots, bounce overshoots and settles", () => {
  const calm = { duration: 0.5, bounce: 0 };
  const lively = { duration: 0.5, bounce: 0.3 };
  let peak = 0;
  for (let t = 0; t < 2; t += 0.005) {
    assert.ok(springAt(t, calm) <= 1 + 1e-9);
    peak = Math.max(peak, springAt(t, lively));
  }
  // ζ = 0.7 overshoots by e^(−πζ/√(1−ζ²)) = 4.6%.
  assert.ok(Math.abs(peak - 1.046) < 0.002, `bounce 0.3 peaks at ${peak.toFixed(3)}`);
  assert.equal(springAt(0, lively), 0);
  assert.ok(Math.abs(1 - springAt(springSettle(lively), lively)) <= 0.002);
  assert.equal(springEase(lively)(1), 1);
});
