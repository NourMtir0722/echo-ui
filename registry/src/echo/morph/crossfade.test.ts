import { test } from "node:test";
import assert from "node:assert/strict";

import { LABEL_IN, LABEL_LAG, LABEL_OUT } from "./crossfade";

/**
 * The labels' crossfade, integrated the way echo-ui-core's createSpring does
 * (stiffness and damping from duration and bounce, 1/240s substeps).
 */
function curve(from: number, to: number, cfg: { duration: number; bounce: number }, lag: number, dt = 1 / 240) {
  const stiffness = ((2 * Math.PI) / cfg.duration) ** 2;
  const damping = (4 * Math.PI * (1 - cfg.bounce)) / cfg.duration;
  let x = from;
  let v = 0;
  const out: number[] = [];
  for (let t = 0; t < 0.5; t += dt) {
    if (t >= lag) {
      v += (-stiffness * (x - to) - damping * v) * dt;
      x += v * dt;
    }
    out.push(x);
  }
  return out;
}

test("during a morph's crossfade some label is always at least 40% there", () => {
  const leaving = curve(1, 0, LABEL_OUT, 0);
  const arriving = curve(0, 1, LABEL_IN, LABEL_LAG);
  const weakest = Math.min(...leaving.map((o, i) => Math.max(o, arriving[i]!)));
  assert.ok(weakest >= 0.4, `the text dips to ${weakest.toFixed(2)} as one label hands over to the next`);
});
