import { test } from "node:test";
import assert from "node:assert/strict";

import { follow, following, TOP } from "./follow";
import { carry } from "./snap";

/** Runs `f` toward `to(t)` at 60 frames a second for `s` seconds; returns where it was each frame. */
function run(f: ReturnType<typeof following>, to: (t: number) => number, s: number, dt = 1 / 60): number[] {
  const at: number[] = [];
  for (let t = dt; t <= s + 1e-9; t += dt) at.push(follow(f, to(t), dt));
  return at;
}

test("a scene never plays faster than it can be seen, however fast the page moves", () => {
  // A flick on a phone: the page is two stops on in one frame.
  const f = following(0);
  const at = run(f, () => 2, 4);
  const fastest = Math.max(...at.map((x, i) => (x - (at[i - 1] ?? 0)) * 60));
  assert.ok(fastest <= TOP + 1e-9, `${fastest.toFixed(2)} stops a second`);
  // Two beats take at least 2/TOP seconds, and then it rests exactly where the page is.
  assert.ok(at[Math.floor((2 / TOP) * 60) - 2]! < 2, "not there before its time");
  assert.equal(at.at(-1), 2);
  assert.equal(f.v, 0);
});

test("a step's glide is followed as one movement that sets off and comes to rest", () => {
  // The page's step: one stop in 0.9s, leaving at three times its average speed (snap.ts `carry(3)`).
  const glide = (t: number) => (t >= 0.9 ? 1 : 1 - Math.pow(1 - t / 0.9, 3));
  const f = following(0);
  const at = run(f, glide, 3);
  // It only ever goes on, never back, and it's at rest on the stop well within two seconds.
  at.forEach((x, i) => assert.ok(x >= (at[i - 1] ?? 0) - 1e-12, `frame ${i}`));
  assert.equal(at[Math.round(2 * 60)], 1);
  // Half the beat takes a good part of a second, not the glide's fifth.
  const half = at.findIndex((x) => x >= 0.5) / 60;
  assert.ok(half >= 0.45, `half the beat in ${half.toFixed(2)}s`);
});

test("scrolled back, a scene plays back at the same pace", () => {
  const f = following(3);
  const at = run(f, () => 1, 4);
  const fastest = Math.max(...at.map((x, i) => ((at[i - 1] ?? 3) - x) * 60));
  assert.ok(fastest <= TOP + 1e-9);
  assert.equal(at.at(-1), 1);
});

test("a long frame moves a scene one frame's worth at most, never by the whole stall", () => {
  const f = following(0);
  follow(f, 1, 0.5);
  assert.ok(f.at <= TOP * 0.1 + 1e-9, `${f.at}`);
});

test("a page moving at the scene's pace is followed exactly, and the scene turns back the moment it does", () => {
  // The wheel's step through the ChatGPT moment: one stop in 1.5s, leaving at 0.8 of its average speed (TOP at its
  // fastest). Halfway, the visitor pushes back: the page glides back to where it began.
  const there = carry(0.8);
  const page = (t: number) => (t < 0.75 ? there(t / 1.5) : there(0.5) * (1 - there(Math.min(1, (t - 0.75) / 1.5))));
  const f = following(0);
  const dt = 1 / 60;
  let going = 0;
  let back = 0;
  let turned: number | null = null;
  let last = 0;
  for (let t = dt; t <= 3; t += dt) {
    const at = follow(f, page(t), dt);
    const off = Math.abs(at - page(t));
    if (t < 0.75) going = Math.max(going, off);
    else back = Math.max(back, off);
    if (turned === null && t > 0.75 && at < last) turned = t - 0.75;
    last = at;
  }
  assert.ok(going < 0.04, `${going.toFixed(3)} of a beat off the page at worst, going`);
  assert.ok(back < 0.08, `${back.toFixed(3)} of a beat off the page at worst, turning back`);
  assert.ok(turned !== null && turned < 0.12, `turned back ${turned?.toFixed(2)}s after the page`);
  assert.equal(f.at, 0);
});
