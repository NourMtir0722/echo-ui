import { test } from "node:test";
import assert from "node:assert/strict";

import { carry, hurryRate, LONGEST_FRAME, newPush, reaim, steadyClock, stopAmong, wheelRun } from "./snap";

/**
 * A trackpad swipe as the browser reports it: the fingers' few events rising
 * to `peak`, then the pad's own momentum, slowing a little every frame.
 */
function swipe(peak = 40, frame = 16, decay = 0.95): number[] {
  const ds: number[] = [];
  for (let i = 1; i <= 6; i++) ds.push((peak * i) / 6);
  for (let d = peak * decay; d > 0.8; d *= decay) ds.push(d);
  return ds.map((d) => (d * frame) / 16);
}

/** Swipes beginning at `starts` (ms): each new one cuts the last one's momentum short, `gap` ms before it begins. */
function events(starts: number[], { gap = 80, frame = 16, peak = 40 } = {}): [number, number][] {
  const out: [number, number][] = [];
  starts.forEach((s, k) => {
    const next = starts[k + 1];
    swipe(peak, frame).forEach((d, i) => {
      const t = s + i * frame;
      if (next === undefined || t < next - gap) out.push([t, d]);
    });
  });
  return out;
}

const pushes = (evs: [number, number][]) => {
  const run = wheelRun();
  return evs.filter(([t, d]) => newPush(run, t, d)).length;
};

test("one swipe, its momentum and all, is one push", () => {
  assert.equal(pushes(events([0])), 1);
  // On a 120Hz screen: twice the events, each half the size.
  assert.equal(pushes(events([0], { frame: 8 })), 1);
});

test("a swipe after the wheel has been still is a new one", () => {
  assert.equal(pushes(events([0, 2000])), 2);
});

test("a swipe made while the last one's momentum is still arriving is a new push", () => {
  // Fingers back on the pad 0.45s, 0.7s and 1s after the first swipe began: the momentum stops, a new swipe starts.
  for (const at of [450, 700, 1000]) assert.equal(pushes(events([0, at])), 2, `second swipe at ${at}ms`);
  assert.equal(pushes(events([0, 600, 1200])), 3, "three swipes");
  assert.equal(pushes(events([0, 450], { frame: 8 })), 2, "at 120Hz");
});

test("momentum that wavers as it slows is still the same push", () => {
  const run = wheelRun();
  const wavering = swipe().map((d, i) => d + (i % 2 ? 1 : -1));
  assert.equal(wavering.filter((d, i) => newPush(run, i * 16, Math.abs(d))).length, 1);
});

test("a mouse wheel spun steadily, or faster and faster, is one push", () => {
  const steady = wheelRun();
  const notches = Array.from({ length: 20 }, (_, i) => [i * 40, 100] as const);
  assert.equal(notches.filter(([t, d]) => newPush(steady, t, d)).length, 1);
  const faster = wheelRun();
  assert.equal([4, 4, 8, 16, 24, 40, 60, 100].filter((d, i) => newPush(faster, i * 30, d)).length, 1);
});

test("fingers that jerk as a swipe starts are still one push", () => {
  const run = wheelRun();
  const jerky = [2, 15, 6, 30, 25, 40, ...swipe().slice(6)];
  assert.equal(jerky.filter((d, i) => newPush(run, i * 16, d)).length, 1);
});

test("a page that stalls in the middle of a swipe's momentum doesn't read it as a new push", () => {
  // Safari stamps a wheel event when the page gets to it. The page stalls 400ms (a first WebGL frame, say): the
  // momentum's next event is stamped 400ms after the last, and what queued meanwhile comes merged, in a burst.
  // The wheel never stopped, and the page, stalled, never saw it still (`seen`: one frame's worth).
  const ds = swipe();
  const run = wheelRun();
  let pushes = 0;
  const send = (t: number, d: number, seen?: number) => void (newPush(run, t, d, seen) && pushes++);
  for (let i = 0; i < 20; i++) send(i * 16, ds[i]!);
  const late = ds.slice(20, 45);
  send(19 * 16 + 400, late[0]!, 16);
  for (let g = 1; g < late.length; g += 6) send(19 * 16 + 400 + g / 6, late.slice(g, g + 6).reduce((a, b) => a + b, 0), 0);
  ds.slice(45).forEach((d, i) => send(19 * 16 + 416 + i * 16, d));
  assert.equal(pushes, 1);
});

test("momentum a busy page gets merged unevenly is still one push", () => {
  // Chrome merges the wheel events that queue while a frame runs long, adding them up, stamped as the last one
  // was. On a 120Hz trackpad, a page drawing at an uneven 30–60 fps gets one, two, three or four at a time.
  const raw = swipe(40, 8);
  const groups = [1, 2, 3, 4, 1, 2, 3, 2, 4, 1, 3];
  const run = wheelRun();
  let pushes = 0;
  for (let i = 0, k = 0; i < raw.length; k++) {
    const n = groups[k % groups.length]!;
    const d = raw.slice(i, i + n).reduce((a, b) => a + b, 0);
    i += n;
    if (newPush(run, (i - 1) * 8, d)) pushes++;
  }
  assert.equal(pushes, 1);
});

test("a swipe the other way while the last one's momentum is still arriving is a new push, at once", () => {
  // Down, then the fingers go back on the pad and swipe up while the first swipe's momentum is still coming in:
  // the momentum only ever goes the way its swipe went, so the first event the other way is the visitor's.
  const run = wheelRun();
  const down = swipe().slice(0, 30);
  down.forEach((d, i) => newPush(run, i * 16, d));
  const up = swipe().map((d) => -d);
  assert.equal(newPush(run, 30 * 16, up[0]!), true, "the first event of the swipe back");
  // …and the rest of it is that one push.
  assert.equal(up.slice(1).filter((d, i) => newPush(run, (31 + i) * 16, d)).length, 0);
});

test("a step's ease leaves at once, and both ends are exact", () => {
  const launch = carry(3);
  assert.equal(launch(0), 0);
  assert.equal(launch(1), 1);
  // A tenth of the way through, a push's launch has covered over a quarter of it (in-out had covered 0.4%).
  assert.ok(launch(0.1) > 0.25, `at 0.1: ${launch(0.1)}`);
  // It never runs past the stop, and never goes back.
  let last = 0;
  for (let t = 0.01; t <= 1; t += 0.01) {
    const p = launch(t);
    assert.ok(p >= last - 1e-12 && p <= 1 + 1e-12, `at ${t.toFixed(2)}: ${p}`);
    last = p;
  }
});

test("handed a glide's own speed, the ease starts at that speed and comes to rest", () => {
  for (const speed of [0, 0.6, 2]) {
    const e = carry(speed);
    const h = 1e-5;
    assert.ok(Math.abs(e(h) / h - speed) < 1e-3, `sets off at ${speed}`);
    assert.ok(Math.abs((1 - e(1 - h)) / h) < 1e-3, `comes to rest (from ${speed})`);
  }
  // Faster than a launch is held to a launch: it never overshoots.
  assert.equal(carry(9)(0.5), carry(3)(0.5));
});

test("after a long frame a glide goes on by one frame's worth, not by the whole stall", () => {
  const clock = steadyClock();
  // 60fps, then a 400ms stall, then 60fps again.
  const at = [0, 16, 32, 432, 448].map(clock);
  assert.deepEqual(at.slice(0, 3), [0, 16, 32]);
  assert.equal(at[3], 32 + LONGEST_FRAME);
  assert.equal(at[4], 32 + LONGEST_FRAME + 16);
  // A page that runs slowly but steadily (24fps) keeps real time.
  const slow = steadyClock();
  assert.equal([0, 42, 84, 126].map(slow).at(-1), 126);
});

test("hurried, a card plays the rest fast, never so fast its steps are a blur", () => {
  // Make plays 8.2s, a press every 0.8 to 1.5s. Pushed on a second in, the rest was over in 1.1s: 6.5 times as fast,
  // a press every eighth of a second.
  const make = hurryRate(8.2 - 1);
  assert.ok(make <= 3, `Make, a second in, plays ${make.toFixed(1)}× as fast`);
  assert.ok(make >= 2.5, `…and is still hurried (${make.toFixed(1)}×)`);
  // A card near its end isn't slowed: it plays the little that's left at its own pace.
  assert.equal(hurryRate(0.5), 1);
  // The shorter cards, pushed on early, still end in about two seconds or less.
  for (const length of [5.2, 5.4, 5.9, 6]) assert.ok((length - 1) / hurryRate(length - 1) <= 2, `a ${length}s card`);
});

test("a swipe away from a stop is never pulled back to it", () => {
  // The motion panel's stop at 7081, the components' next at 9379 (too far to step to): the wheel scrolls freely.
  const stops = [7081, 9379];
  for (const swipe of [51, 94, 137, 400]) {
    assert.equal(stopAmong(stops, 900, 7081, 7081 + swipe), null, `down ${swipe}px from the motion panel`);
  }
  // …up from Get (2576) into the puzzle above it, with no stop above near enough.
  for (const swipe of [53, 94, 138]) assert.equal(stopAmong([2576, 3396], 900, 2576, 2576 - swipe), null, `up ${swipe}px from Get`);
  // A swipe that lets go short of the next stop, heading for it, still goes on to frame it.
  assert.equal(stopAmong(stops, 900, 8200, 8600), 9379);
});

test("a step whose stop moves under its glide goes on to where the stop is now, at the speed it's going", () => {
  // Pushed on from Pick to Build: a fifth of the way in, Pick's worn style comes off, every card grows a few px, and
  // Build now frames 22px lower. Aimed where it was, the glide came to rest 22px short.
  const r = reaim(5079, 5101, 4713, 900, 0.6);
  assert.ok(r, "the glide is re-aimed");
  assert.equal(r.to, 5101);
  // It leaves from where it is at the speed it's going: carry's launch is that speed over the rest's average.
  assert.ok(Math.abs(r.launch - (900 * 0.6) / (5101 - 4713)) < 1e-9, `launch ${r.launch}`);
  // A stop that hasn't moved (a pixel's rounding) leaves the glide alone.
  assert.equal(reaim(5079, 5080, 4713, 900, 0.6), null);
});
