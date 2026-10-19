import { test } from "node:test";
import assert from "node:assert/strict";

import { angleAround, HUB, spinSteps, wheelDegrees } from "./spin";

test("a slow turn is a step a notch, carried across small moves", () => {
  let owed = 0;
  let steps = 0;
  for (let i = 0; i < 6; i++) {
    const r = spinSteps(5, 0.1, owed, 15);
    owed = r.owed;
    steps += r.steps;
  }
  assert.equal(steps, 2, "six 5° moves are two 15° notches");
});

test("turning back counts back", () => {
  assert.equal(spinSteps(-30, 1, 0, 15).steps, -2);
});

test("a flick goes further than the same turn made slowly", () => {
  const slow = spinSteps(90, 1, 0, 15).steps;
  const fast = spinSteps(90, 0.02, 0, 15).steps;
  assert.equal(slow, 6);
  assert.ok(fast > slow * 2, `a fast turn gains: ${fast}`);
  assert.ok(fast <= slow * 12, "but never without limit");
});

/*
 * Dragging read the pointer's angle round the centre with no dead
 * zone, so a 3px wobble near the hub swung the angle 90–180° in one event,
 * the speed gain maxed out, and the value leapt 100+ steps from a twitch.
 */
test("near the hub the pointer's angle means nothing", () => {
  assert.equal(angleAround(2, 0, 48), null, "2px from the centre of a 96px wheel");
  assert.equal(angleAround(0, 48 * HUB - 0.5, 48), null);
  assert.equal(angleAround(40, 0, 48), 0, "out on the rim it's the angle");
  assert.equal(angleAround(0, 40, 48), 90);
});

/*
 * The wheel read only the sign of deltaY, so a sideways swipe
 * (deltaY 0) stepped it down, and every event was a whole notch, so a small
 * trackpad scroll moved it dozens of steps.
 */
test("a wheel turns it by how far it scrolled, either way it scrolled", () => {
  const px = { deltaMode: 0 };
  assert.equal(wheelDegrees({ ...px, deltaX: 0, deltaY: 0 }), 0, "no scroll, no turn");
  assert.ok(wheelDegrees({ ...px, deltaX: 30, deltaY: 0 }) > 0, "a swipe right turns it up");
  assert.ok(wheelDegrees({ ...px, deltaX: -30, deltaY: 0 }) < 0, "a swipe left turns it down");
  assert.ok(wheelDegrees({ ...px, deltaX: 0, deltaY: -30 }) > 0, "scrolling up turns it up");
  assert.equal(wheelDegrees({ ...px, deltaX: 0, deltaY: -100 }), 15, "a mouse wheel's click is one notch");
  assert.equal(wheelDegrees({ deltaMode: 1, deltaX: 0, deltaY: -3 }), 15, "so are three lines");
  assert.equal(wheelDegrees({ ...px, deltaX: 2, deltaY: -30 }), wheelDegrees({ ...px, deltaX: 0, deltaY: -30 }), "the stronger axis wins");
  const nudge = spinSteps(wheelDegrees({ ...px, deltaX: 0, deltaY: -3 }), 0.25, 0, 15);
  assert.equal(nudge.steps, 0, "three pixels is less than a notch: owed, not lost");
  assert.ok(nudge.owed > 0);
});
