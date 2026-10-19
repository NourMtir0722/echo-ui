import { test } from "node:test";
import assert from "node:assert/strict";

import { BOTTOM_OUT, PRESS_STROKE, capPose, releaseClick, releaseSpring } from "./press";
import { sound } from "../sound/sound";

test("the stroke resists, then lands on the seam at the click", () => {
  assert.ok(PRESS_STROKE[0].d < 0.5, "the first stretch is the resistance");
  assert.equal(PRESS_STROKE[BOTTOM_OUT].d, 1, "the click is the landing");
  assert.ok(PRESS_STROKE[BOTTOM_OUT].duration < PRESS_STROKE[0].duration, "it gives faster than it resisted");
  assert.equal(PRESS_STROKE.at(-1)?.d, 1, "it ends sitting on the seam");
});

/** Seconds until a spring released from the seam (d = 1) comes back up through rest. */
function timeToTopOut(from: number, { config, velocity }: ReturnType<typeof releaseSpring>): number {
  const k = (2 * Math.PI / config.duration) ** 2;
  const c = (4 * Math.PI * (1 - config.bounce)) / config.duration;
  let x = from;
  let v = velocity;
  let t = 0;
  const dt = 1 / 2400;
  while (x > 0 && t < 2) {
    v += (-k * x - c * v) * dt;
    x += v * dt;
    t += dt;
  }
  return t;
}

test("the way home is faster than the way down", () => {
  const down = PRESS_STROKE.slice(0, BOTTOM_OUT + 1).reduce((t, k) => t + k.duration, 0);
  assert.ok(timeToTopOut(1, releaseSpring(0)) < down);
  assert.ok(timeToTopOut(1.28, releaseSpring(1)) < down, "even from fully loaded");
});

test("a loaded cap comes home harder and bouncier", () => {
  const light = releaseSpring(0.1);
  const full = releaseSpring(1);
  assert.ok(Math.abs(full.velocity) > Math.abs(light.velocity));
  assert.ok(full.config.bounce > light.config.bounce);
  assert.ok(full.config.bounce <= 0.4, "never a cartoon wobble");
  assert.deepEqual(releaseSpring(5), full, "load is clamped");
});

test("--press never turns a seam inside out, whatever the depth", () => {
  assert.equal(capPose(1, 1.4, 1.5, 3).press, 1, "loaded past the seam");
  assert.equal(capPose(1, -2, 1.5, 3).press, -0.4, "overshooting home");
  assert.equal(capPose(0, 1.28, 1.5, 3).y, 3 * 1.28, "the loaded sink is still real travel");
});

test("a hovered cap rises, and pressing it lands on the seam, not above it", () => {
  assert.equal(capPose(1, 0, 1.5, 3).y, -1.5);
  assert.equal(capPose(1, 1, 1.5, 3).y, 3);
  assert.equal(capPose(1, 1, 1.5, 3).lift, 0.4, "the light dims as it goes down");
});

test("the top-out click brightens with load, and a plain tap gets the plain click", () => {
  assert.equal(releaseClick(0), sound.release);
  const full = releaseClick(1);
  assert.ok((full.freq as number) > (sound.release.freq as number));
  assert.ok(full.gain > sound.release.gain);
});
