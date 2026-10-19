import { test } from "node:test";
import assert from "node:assert/strict";
import { apart, morphFeels, outline } from "./morph-outline";

const bodies = (d: string) => (d ? d.split("M").length - 1 : 0);

test("one pill is one body, spanning its box", () => {
  const d = outline({ parts: [{ x0: 10, x1: 110, h: 40 }], k: 20 }, 50);
  assert.equal(bodies(d), 1);
  const xs = [...d.matchAll(/([\d.]+) ([\d.]+)/g)].map((m) => Number(m[1]));
  assert.ok(Math.abs(Math.min(...xs) - 10) < 0.5);
  assert.ok(Math.abs(Math.max(...xs) - 110) < 0.5);
});

test("two parts inside the neck's reach are one body; past it, two", () => {
  const pair = (gap: number) => [
    { x0: 0, x1: 100, h: 40 },
    { x0: 100 + gap, x1: 200 + gap, h: 40 },
  ];
  assert.equal(bodies(outline({ parts: pair(8), k: 26 }, 30)), 1);
  assert.equal(bodies(outline({ parts: pair(20), k: 26 }, 30)), 2);
  // No liquid: touching parts are still separate the moment they part.
  assert.equal(bodies(outline({ parts: pair(2), k: 0 }, 30)), 2);
});

test("a whole at t=0 is the whole, while its parts are the slices it divides into", () => {
  const whole = { x0: 0, x1: 200, h: 40, r: 13 };
  const parts = [
    { x0: 0, x1: 100, h: 40, r: 13 },
    { x0: 100, x1: 200, h: 40, r: 13 },
  ];
  assert.equal(outline({ parts, k: 20, whole, t: 0 }, 30), outline({ parts: [whole], k: 20 }, 30));
});

test("parts swallowed to nothing draw nothing", () => {
  assert.equal(outline({ parts: [{ x0: 50, x1: 50, h: 0 }], k: 20 }, 30), "");
});

test("apart always clears the neck, so no feel rests joined", () => {
  for (const feel of Object.values(morphFeels)) {
    const gap = apart(feel);
    assert.ok(gap > feel.k / 2, `gap ${gap} vs reach ${feel.k / 2}`);
    const d = outline(
      {
        parts: [
          { x0: 0, x1: 100, h: 52 },
          { x0: 100 + gap, x1: 200 + gap, h: 52 },
        ],
        k: feel.k,
      },
      40,
    );
    assert.equal(bodies(d), 2);
  }
});

test("grow offsets the outline outward, for the well a cap sits in", () => {
  const part = { x0: 20, x1: 120, h: 40 };
  const xs = (d: string) => [...d.matchAll(/([\d.]+) ([\d.]+)/g)].map((m) => Number(m[1]));
  const ys = (d: string) => [...d.matchAll(/([\d.]+) ([\d.]+)/g)].map((m) => Number(m[2]));
  const d = outline({ parts: [part], k: 0 }, 50, 4);
  assert.ok(Math.abs(Math.min(...xs(d)) - 16) < 0.5);
  assert.ok(Math.abs(Math.max(...xs(d)) - 124) < 0.5);
  assert.ok(Math.abs(Math.min(...ys(d)) - 26) < 0.5);
});

test("a part that has left the whole is itself mid-division, not a wedge smeared out of it", () => {
  const whole = { x0: 100, x1: 200, h: 40, r: 13 };
  const far = { x0: 0, x1: 60, h: 40, r: 13 };
  const d = outline({ parts: [far, { x0: 150, x1: 200, h: 40, r: 13 }], k: 26, whole, t: 0.5 }, 30);
  // Halfway through, the far part is still its full height across its whole width.
  const ys = [...d.matchAll(/([\d.]+) ([\d.]+)/g)].map((m) => [Number(m[1]), Number(m[2])] as const);
  const topAt = (x: number) => Math.min(...ys.filter(([px]) => Math.abs(px - x) < 2).map(([, py]) => py));
  assert.ok(Math.abs(topAt(30) - 10) < 1, `top at x=30 is ${topAt(30)}`);
  assert.ok(Math.abs(topAt(50) - 10) < 1.5, `top at x=50 is ${topAt(50)}`);
});

const points = (d: string) => [...d.matchAll(/([\d.]+) ([\d.]+)/g)].map((m) => [Number(m[1]), Number(m[2])] as const);

test("caps side by side grow no bump over their join, however far the blend has gone", () => {
  // The end of a fold: the parts touch, and the whole takes over from them.
  // The smooth minimum used to add material above and below the join, a bump
  // that stayed on the top edge until the whole had fully taken over.
  const H = 44;
  const r = 15;
  const whole = { x0: 0, x1: 200, h: H, r };
  const parts = [
    { x0: 0, x1: 100, h: H, r },
    { x0: 100, x1: 200, h: H, r },
  ];
  for (const t of [1.15, 1, 0.7, 0.4, 0.1, -0.15]) {
    const ys = points(outline({ parts, k: 26, whole, t }, 40)).map(([, y]) => y);
    assert.ok(Math.min(...ys) >= 40 - H / 2 - 0.05, `t=${t}: top edge at ${Math.min(...ys)}`);
    assert.ok(Math.max(...ys) <= 40 + H / 2 + 0.05, `t=${t}: bottom edge at ${Math.max(...ys)}`);
  }
});

test("a neck snaps while it still has body, rather than pinching to a point", () => {
  // The end of a division: the halves are clear of each other and the whole
  // is nearly gone. Any neck still drawn between them is at least 8px thick;
  // it used to thin to a 1.6px crease the frame before it snapped.
  const gap = 14.4;
  const parts = [
    { x0: -3.6, x1: 100 - gap / 2, h: 44, r: 15 },
    { x0: 100 + gap / 2, x1: 203.6, h: 44, r: 15 },
  ];
  const whole = { x0: 0, x1: 200, h: 44, r: 15 };
  for (let t = 0.95; t <= 0.98; t += 0.002) {
    const d = outline({ parts, k: 26, whole, t }, 40);
    if (bodies(d) > 1) continue;
    // The edge points nearest the middle, above and below the centre line.
    const near = (side: (y: number) => boolean) =>
      points(d)
        .filter(([, y]) => side(y))
        .sort((a, b) => Math.abs(a[0] - 100) - Math.abs(b[0] - 100))[0]![1];
    const thick = near((y) => y > 40) - near((y) => y < 40);
    assert.ok(thick >= 7.9, `t=${t.toFixed(3)}: neck ${thick.toFixed(1)}px thick`);
  }
});
