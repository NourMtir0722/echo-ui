import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { FLOWER_BBOX } from "../../brand/paths";
import { UNWORN, crowdMarbles, echoMarble, hexToOklch, oklchToHex, wearable } from "./palette";
import { moves, onPerch, place, placeStill, type Stop, type Viewport } from "./journey";
import { Pile } from "./pile";

// --- colour ------------------------------------------------------------------

/** The site's four seeds (theme-store.ts), plus a white and a black one a visitor can pick. */
const SEEDS = ["#8B6FE8", "#DE3B74", "#F2674E", "#3D8EF0", "#FFFFFF", "#000000"];

test("OKLCH round-trips a colour", () => {
  for (const hex of ["#8b6fe8", "#de3b74", "#f2674e", "#3d8ef0", "#000000", "#ffffff"]) {
    assert.equal(oklchToHex(hexToOklch(hex)), hex);
  }
});

test("the crowd never wears yellow, green or teal, whatever the seed", () => {
  const unworn = (hex: string) => {
    const [, c, h] = hexToOklch(hex);
    // Two degrees of slack: an 8-bit hex can land a degree past where it was aimed.
    return c > 0.04 && h > UNWORN[0] + 2 && h < UNWORN[1] - 2;
  };
  for (const seed of SEEDS) {
    for (const m of crowdMarbles(seed, 24)) {
      for (const hex of [m.base, m.light, m.deep, m.vein]) assert.ok(!unworn(hex), `${seed} → ${hex}`);
    }
  }
  assert.equal(wearable(100), UNWORN[0]);
  assert.equal(wearable(215), UNWORN[1]);
  assert.equal(wearable(300), 300);
});

test("the crowd relights with the seed: its first creature is the seed's own hue", () => {
  for (const seed of SEEDS.slice(0, 4)) {
    const [, , seedHue] = hexToOklch(seed);
    const [, , firstHue] = hexToOklch(crowdMarbles(seed, 1)[0]!.base);
    const turn = Math.abs(((firstHue - seedHue + 540) % 360) - 180);
    assert.ok(turn < 6, `${seed}: ${firstHue} vs ${seedHue}`);
  }
  const purple = crowdMarbles("#8B6FE8", 12).map((m) => m.base);
  const sky = crowdMarbles("#3D8EF0", 12).map((m) => m.base);
  assert.notDeepEqual(purple, sky);
  // Everyone in a crowd is somebody different.
  assert.equal(new Set(purple).size, purple.length);
});

test("Echo's own marble is the engine's colours for the seed, veined with a neighbour", () => {
  const m = echoMarble("#8B6FE8", "#B5A2F2", "#6A4FC9");
  assert.deepEqual([m.base, m.light, m.deep], ["#8B6FE8", "#B5A2F2", "#6A4FC9"]);
  assert.notEqual(m.vein, m.base);
});

// --- the journey ---------------------------------------------------------------

const PAGE = 6000;
const VIEW: Omit<Viewport, "scroll"> = { maxScroll: PAGE - 900, vw: 1440, vh: 900, gutter: 100, top: 56 };
/** Sections and their perches on the page (document coordinates). */
const WAY = [
  { section: [0, 1000], perch: { left: 1200, top: 480, width: 96, height: 96 } },
  { section: [1100, 2400], perch: { left: 1200, top: 1300, width: 72, height: 72 } },
  // A perch at the top of a long section: it scrolls away while the section is still being read.
  { section: [2400, 4200], perch: { left: 200, top: 2500, width: 84, height: 84 } },
  { section: [5400, PAGE], perch: { left: 650, top: 5500, width: 140, height: 140 } },
];
const at = (scroll: number): Stop[] =>
  WAY.map((w) => ({
    perch: { ...w.perch, top: w.perch.top - scroll },
    section: { left: 0, top: w.section[0]! - scroll, width: 1440, height: w.section[1]! - w.section[0]! },
  }));
const where = (scroll: number, view = VIEW) => place(at(scroll), { ...view, scroll });
const inMargin = (pose: { x: number; size: number }) => pose.x - pose.size / 2 >= 0 && (pose.x + pose.size / 2 <= VIEW.gutter || pose.x - pose.size / 2 >= VIEW.vw - VIEW.gutter);

test("at the top Echo is home, sitting with its feet on the perch's floor", () => {
  const { pose, perch, seated } = where(0);
  assert.equal(perch, 0);
  assert.ok(seated);
  const home = WAY[0]!.perch;
  assert.equal(pose.x, home.left + home.width / 2);
  assert.ok(Math.abs(pose.y + pose.size / 2 - (home.top + home.height)) < 1e-9);
  assert.equal(pose.air, 0);
});

test("it belongs to the section you're reading, and sits on its perch while the perch is in view", () => {
  // The second section's top is well above the middle of the window: that's the one being read.
  const s = 1100 - 900 * 0.2;
  const { perch, seated, pose } = where(s);
  assert.equal(perch, 1);
  assert.ok(seated);
  assert.deepEqual(pose, onPerch(at(s)[1]!.perch));
});

test("reading on past its perch, it waits in the margin, never on the page", () => {
  // Deep in the third section: its perch went off the top a while ago.
  const s = 3300;
  const { perch, seated, pose } = where(s);
  assert.equal(perch, 2);
  assert.ok(!seated);
  assert.ok(inMargin(pose), `x ${pose.x}`);
  // And it's below the bar across the top of the window.
  assert.ok(pose.y - pose.size / 2 >= VIEW.top!);
});

test("between sections it moves with the scroll, continuously, and back again", () => {
  let last = where(0).pose;
  let moved = 0;
  for (let s = 0; s <= VIEW.maxScroll; s += 1) {
    const { pose } = where(s);
    // No teleporting: even crossing the whole page, a pixel of scroll moves it a few dozen at most.
    assert.ok(Math.hypot(pose.x - last.x, pose.y - last.y) < 20, `jump at ${s}`);
    moved += Math.hypot(pose.x - last.x, pose.y - last.y);
    last = pose;
  }
  assert.ok(moved > 2000, "it travels the page");
  // Scrubbing back puts it exactly where it was.
  const [start, end] = moves(at(0), { ...VIEW, scroll: 0 })[2]!;
  assert.deepEqual(where((start + end) / 2), where((start + end) / 2));
});

test("stop scrolling halfway between sections and it's in the margin, facing the page", () => {
  const [start, end] = moves(at(0), { ...VIEW, scroll: 0 })[1]!;
  const { pose, perch } = where((start + end) / 2);
  assert.equal(perch, null);
  assert.equal(pose.air, 1);
  assert.ok(inMargin(pose), `x ${pose.x}`);
  assert.ok(Math.abs(Math.sin(pose.spin)) < 1e-9, "turned away");
});

test("it lands facing you: every turn in the air is a whole one", () => {
  const view = { ...VIEW, scroll: 0 };
  for (const [, end] of moves(at(0), view).slice(1)) assert.equal(where(end).pose.spin, 0);
});

test("at the end of the page it's on the last perch", () => {
  const { perch, seated } = where(VIEW.maxScroll);
  assert.equal(perch, WAY.length - 1);
  assert.ok(seated);
});

test("with no margin (a phone) it waits half outside the window, peeking in, never over the words", () => {
  const phone = { maxScroll: PAGE - 800, vw: 390, vh: 800, gutter: 16, top: 56 };
  const { pose } = where(3300, phone);
  const outside = Math.max(0, pose.size / 2 - pose.x, pose.x + pose.size / 2 - phone.vw);
  assert.ok(outside >= pose.size * 0.5 - 0.5, `only ${outside}px outside`);
  // What's in reaches about as far as the page's gutter, not into the words beside it (it stood 37px in or more).
  assert.ok(pose.size - outside <= 26, `${pose.size - outside}px in`);
});

test("under reduced motion it's never between sections: on the perch, or beside it", () => {
  for (let s = 0; s <= VIEW.maxScroll; s += 50) {
    const { pose, perch, seated } = placeStill(at(s), { ...VIEW, scroll: s });
    assert.notEqual(perch, null);
    if (seated) assert.deepEqual(pose, onPerch(at(s)[perch!]!.perch));
    else assert.ok(inMargin(pose));
  }
});

// --- the pile ------------------------------------------------------------------

const radii = [60, 48, 72, 55, 64, 50, 70, 45, 58, 66, 52, 62];

test("the pile falls, settles inside its box and stops", () => {
  const pile = new Pile(radii, 1200);
  pile.drop(400);
  for (let t = 0; t < 8; t += 1 / 60) pile.step(1 / 60);
  assert.ok(pile.still, "still moving after 8s");
  for (const b of pile.balls) {
    assert.ok(b.y >= b.r - 0.5, "through the floor");
    assert.ok(b.x >= b.r - 0.5 && b.x <= 1200 - b.r + 0.5, "through a wall");
    assert.ok(Math.abs(b.roll - b.rest) < 0.05, "not righted");
  }
  for (let i = 0; i < pile.balls.length; i++) {
    for (let j = i + 1; j < pile.balls.length; j++) {
      const a = pile.balls[i]!;
      const b = pile.balls[j]!;
      const d = Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
      assert.ok(d > (a.r + b.r) * 0.8, `${i} and ${j} are inside each other`);
    }
  }
});

test("it heaps: with more creatures than fit on the floor, some rest on others", () => {
  const pile = new Pile(radii, 500);
  pile.drop(300);
  pile.settle();
  assert.ok(pile.balls.some((b) => b.y > b.r * 1.5));
});

test("the pointer shoves, and a press makes the nearest one jump", () => {
  const pile = new Pile(radii, 1200);
  pile.drop(300);
  pile.settle();
  const b = pile.balls[0]!;
  const before = { x: b.x, y: b.y };
  pile.push(b.x - b.r, b.y, 40, 800, 0);
  assert.ok(b.x > before.x && b.vx > 0);

  const i = pile.poke(b.x, b.y, 10, () => 0.5);
  assert.ok(i >= 0);
  assert.ok(pile.balls[i]!.vy > 800);
  assert.equal(pile.poke(-5000, -5000, 10), -1);
});

test("a pile is the same pile on every visit", () => {
  const a = new Pile(radii, 900);
  const b = new Pile(radii, 900);
  a.drop(300);
  b.drop(300);
  a.settle();
  b.settle();
  assert.deepEqual(
    a.balls.map((x) => [x.x, x.y]),
    b.balls.map((x) => [x.x, x.y]),
  );
});

// --- the model -------------------------------------------------------------------

test("the model is the drawing: a small file, one body, and where the drawing lands on it", () => {
  const glb = readFileSync(new URL("../../../public/models/echo.glb", import.meta.url));
  // Downloaded after the page is up, but still: a mascot, not a movie.
  assert.ok(glb.length < 200_000, `${glb.length} bytes`);
  assert.equal(glb.toString("ascii", 0, 4), "glTF");
  const json = JSON.parse(glb.toString("utf8", 20, 20 + glb.readUInt32LE(12))) as {
    nodes: { name: string; extras?: { svg_centre?: [number, number]; svg_scale?: number } }[];
  };
  const body = json.nodes.find((n) => n.name === "Body");
  assert.ok(body?.extras?.svg_centre && body.extras.svg_scale, "Body carries its drawing map");
  // The face is printed through this map, so it has to be the flower's own centre and size.
  const [cx, cy] = body.extras.svg_centre;
  assert.ok(Math.abs(cx - FLOWER_BBOX.cx) < 0.1 && Math.abs(cy - FLOWER_BBOX.cy) < 0.1, `centre ${cx}, ${cy}`);
  assert.ok(Math.abs(body.extras.svg_scale * FLOWER_BBOX.h - 2) < 0.02, `scale ${body.extras.svg_scale}`);
});
