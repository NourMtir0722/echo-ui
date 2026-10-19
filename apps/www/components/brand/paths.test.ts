import { test } from "node:test";
import assert from "node:assert/strict";
import { area, flatten, type Pt } from "./outline";
import { BODY, EYE_WHITE_L, EYE_WHITE_R, FLOWER_BBOX, PUPIL_L, PUPIL_R } from "./paths";

/** Corners sharper than this turn back on themselves (a real notch turns 60–110°). */
const DOUBLES_BACK = 150;

function reversals(d: string): Pt[] {
  const found: Pt[] = [];
  for (const raw of flatten(d)) {
    const pts = raw.filter((p, k) => {
      const q = raw[(k + raw.length - 1) % raw.length]!;
      return Math.hypot(p[0] - q[0], p[1] - q[1]) > 1e-6;
    });
    for (let k = 0; k < pts.length; k++) {
      const a = pts[(k + pts.length - 1) % pts.length]!;
      const b = pts[k]!;
      const c = pts[(k + 1) % pts.length]!;
      const ux = b[0] - a[0];
      const uy = b[1] - a[1];
      const vx = c[0] - b[0];
      const vy = c[1] - b[1];
      const cos = (ux * vx + uy * vy) / (Math.hypot(ux, uy) * Math.hypot(vx, vy));
      if ((Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI > DOUBLES_BACK) found.push(b);
    }
  }
  return found;
}

test("the canonical outline never doubles back on itself (the rim stroke drew burrs there)", () => {
  for (const [name, d] of Object.entries({ BODY, EYE_WHITE_L, EYE_WHITE_R, PUPIL_L, PUPIL_R })) {
    assert.deepEqual(reversals(d), [], `${name} doubles back`);
  }
});

test("the body keeps its measured silhouette", () => {
  const [poly, ...rest] = flatten(BODY);
  assert.equal(rest.length, 0, "one closed outline");
  const xs = poly!.map((p) => p[0]);
  const ys = poly!.map((p) => p[1]);
  const near = (a: number, b: number, what: string) => assert.ok(Math.abs(a - b) < 0.05, `${what}: ${a} vs ${b}`);
  near(Math.min(...xs), FLOWER_BBOX.x, "left");
  near(Math.min(...ys), FLOWER_BBOX.y, "top");
  near(Math.max(...xs) - Math.min(...xs), FLOWER_BBOX.w, "width");
  near(Math.max(...ys) - Math.min(...ys), FLOWER_BBOX.h, "height");
  // Area of the drawing as traced from the Wonder source, within 0.1%.
  assert.ok(Math.abs(Math.abs(area(poly!)) - 1636.2) < 1.7, `area ${Math.abs(area(poly!))}`);
});
