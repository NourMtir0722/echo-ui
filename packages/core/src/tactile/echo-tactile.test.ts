import { test } from "node:test";
import assert from "node:assert/strict";

import { resolveMotion, isMotionName, isActivationKey } from "./resolve-motion";

/* --------------------------------------------------------- motion resolution */

test("token motion resolves to the phase gesture with the token's timing", () => {
  const press = resolveMotion("press", "press", { reduced: false });
  assert.ok(press);
  assert.equal(press.vars.scale, 0.96);
  assert.equal(press.vars.y, 1);
  assert.equal(press.vars.duration, 0.09); // 90ms
  assert.equal(press.vars.ease, "back.out(2)");

  const release = resolveMotion("release", "pop", { reduced: false });
  assert.ok(release);
  assert.equal(release.vars.scale, 1);
  assert.equal(release.vars.y, 0);
  assert.equal(release.vars.duration, 0.4); // 400ms
});

test("reduced motion collapses a 'none' token to no motion", () => {
  assert.equal(resolveMotion("press", "press", { reduced: true }), null);
  assert.equal(resolveMotion("release", "pop", { reduced: true }), null);
});

test("reduced motion collapses an opacity-variant token to a fade", () => {
  const summon = resolveMotion("activate", "summon", { reduced: true });
  assert.ok(summon);
  assert.equal(summon.vars.opacity, 1);
  assert.equal(summon.vars.ease, "none");
  assert.ok(!("scale" in summon.vars));
});

/* --------------------------------------------------------------- escape hatch */

test("raw GSAP vars pass through untouched when motion is allowed", () => {
  const r = resolveMotion("press", { rotation: -3, duration: 0.1 }, { reduced: false });
  assert.ok(r);
  assert.equal(r.vars.rotation, -3);
  assert.equal(r.vars.duration, 0.1);
});

test("raw transform vars are suppressed under reduced motion; opacity-only survive", () => {
  assert.equal(resolveMotion("press", { scale: 0.9 }, { reduced: true }), null);
  const fade = resolveMotion("press", { opacity: 0.5, duration: 0.2 }, { reduced: true });
  assert.ok(fade);
  assert.equal(fade.vars.opacity, 0.5);
});

test("undefined motion resolves to null", () => {
  assert.equal(resolveMotion("press", undefined, { reduced: false }), null);
});

/* ------------------------------------------------------------ name / key utils */

test("isMotionName recognizes tokens, rejects arbitrary strings and vars", () => {
  assert.ok(isMotionName("press"));
  assert.ok(isMotionName("glitch"));
  assert.ok(!isMotionName("nope"));
  assert.ok(!isMotionName({ scale: 1 }));
});

test("isActivationKey matches Space and Enter only (keyboard parity)", () => {
  assert.ok(isActivationKey(" "));
  assert.ok(isActivationKey("Enter"));
  assert.ok(isActivationKey("Spacebar"));
  assert.ok(!isActivationKey("a"));
  assert.ok(!isActivationKey("Tab"));
});

/* ---------------------------------------------------------------- SSR safety */

test("importing useTactile touches no browser globals at module scope", async () => {
  const mod = await import("./index");
  assert.equal(typeof mod.useTactile, "function");
  assert.equal(typeof mod.resolveMotion, "function");
});
