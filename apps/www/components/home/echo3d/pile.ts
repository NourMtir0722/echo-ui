/**
 * The pile at the foot of the page: Echo's crowd, dropped in a heap the way
 * the balls pile up on a conference's ticket page.
 *
 * Each creature is a ball as wide as its flower, in a box as wide as the
 * window and a few balls deep, so the heap has a front and a back. They fall,
 * bump, settle, and roll a little when they land off-centre; then they right
 * themselves, because they're characters and want to face you. The pointer
 * is a ball too: move it through the pile and it shoves them aside, press
 * near one and it jumps.
 *
 * Pure: no DOM, no three. Units are CSS pixels, y up from the floor.
 */

export interface Ball {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  r: number;
  /** Roll about the axis facing you, radians, and how fast. */
  roll: number;
  spin: number;
  /** The roll it settles at: a small tilt of its own. */
  rest: number;
  /** Held out of the simulation: not yet dropped. */
  waiting: boolean;
}

const GRAVITY = 2600;
const BOUNCE = 0.28;
const FRICTION = 0.86;
const SUBSTEPS = 4;
/** Balls may sink this far into each other: the petals are soft. */
const SQUISH = 0.9;

/** A small seeded random, so a pile is the same pile on every visit. */
export function random(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Pile {
  balls: Ball[] = [];
  width: number;
  depth: number;

  constructor(radii: readonly number[], width: number, seed = 7) {
    this.width = width;
    this.depth = Math.max(...radii, 1) * 1.1;
    const rnd = random(seed);
    this.balls = radii.map((r) => ({
      x: r + rnd() * Math.max(1, width - 2 * r),
      y: 0,
      z: (rnd() * 2 - 1) * this.depth,
      vx: 0,
      vy: 0,
      vz: 0,
      r,
      roll: 0,
      spin: 0,
      rest: (rnd() * 2 - 1) * 0.22,
      waiting: true,
    }));
  }

  /** Everyone drops from `height` above the floor and a little higher each, left to right in a shuffle. */
  drop(height: number, seed = 11) {
    const rnd = random(seed);
    const order = this.balls.map((_, i) => i).sort(() => rnd() - 0.5);
    order.forEach((i, k) => {
      const b = this.balls[i]!;
      b.waiting = false;
      b.y = height + b.r + k * 26 + rnd() * 50;
      b.vx = (rnd() * 2 - 1) * 60;
      b.vy = -200;
      b.roll = (rnd() * 2 - 1) * 0.8;
      b.spin = (rnd() * 2 - 1) * 3;
    });
  }

  /** Settle without drawing: a heap that's already there (reduced motion, or a return visit). */
  settle(seconds = 6) {
    for (let t = 0; t < seconds; t += 1 / 60) this.step(1 / 60);
    for (const b of this.balls) {
      b.vx = b.vy = b.vz = b.spin = 0;
      b.roll = b.rest;
    }
  }

  resize(width: number) {
    this.width = width;
    for (const b of this.balls) b.x = Math.min(Math.max(b.x, b.r), Math.max(b.r, width - b.r));
  }

  /** Add one more ball: Echo itself, arriving from wherever it was. */
  add(ball: Omit<Ball, "waiting" | "rest"> & { rest?: number }): number {
    this.balls.push({ rest: 0, ...ball, waiting: false });
    return this.balls.length - 1;
  }

  remove(i: number) {
    this.balls.splice(i, 1);
  }

  /**
   * The pointer, as a ball of radius `r` at (x, y) moving at (vx, vy):
   * anything it overlaps is shoved out of its way, depth ignored so it can
   * reach the back of the heap.
   */
  push(x: number, y: number, r: number, vx: number, vy: number) {
    for (const b of this.balls) {
      if (b.waiting) continue;
      const dx = b.x - x;
      const dy = b.y - y;
      const d = Math.hypot(dx, dy);
      const min = b.r + r;
      if (d >= min || d === 0) continue;
      const nx = dx / d;
      const ny = dy / d;
      const overlap = min - d;
      b.x += nx * overlap * 0.5;
      b.y += ny * overlap * 0.5;
      const along = vx * nx + vy * ny;
      b.vx += nx * Math.max(0, along) * 0.7 + nx * 90;
      b.vy += ny * Math.max(0, along) * 0.7 + Math.max(0, ny) * 120;
      b.spin += (vx * ny - vy * nx) / (b.r * 60);
    }
  }

  /** The ball nearest to (x, y) within reach jumps. Returns which one, or -1. */
  poke(x: number, y: number, reach: number, rnd = Math.random): number {
    let best = -1;
    let bestD = Infinity;
    this.balls.forEach((b, i) => {
      if (b.waiting) return;
      const d = Math.hypot(b.x - x, b.y - y) - b.r;
      if (d < reach && d < bestD) {
        best = i;
        bestD = d;
      }
    });
    if (best >= 0) {
      const b = this.balls[best]!;
      b.vy = 900 + rnd() * 300;
      b.vx += (b.x < x ? -1 : 1) * (80 + rnd() * 120);
      b.spin += (rnd() < 0.5 ? -1 : 1) * (5 + rnd() * 4);
    }
    return best;
  }

  step(dt: number) {
    const h = Math.min(dt, 1 / 30) / SUBSTEPS;
    const live = this.balls.filter((b) => !b.waiting);
    for (let s = 0; s < SUBSTEPS; s++) {
      for (const b of live) {
        b.vy -= GRAVITY * h;
        b.x += b.vx * h;
        b.y += b.vy * h;
        b.z += b.vz * h;
      }
      for (let i = 0; i < live.length; i++) {
        for (let j = i + 1; j < live.length; j++) this.collide(live[i]!, live[j]!);
      }
      for (const b of live) this.walls(b, h);
    }
  }

  private collide(a: Ball, b: Ball) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dz = b.z - a.z;
    const d = Math.hypot(dx, dy, dz);
    const min = (a.r + b.r) * SQUISH;
    if (d >= min || d === 0) return;
    const nx = dx / d;
    const ny = dy / d;
    const nz = dz / d;
    // Heavier (bigger) balls move less.
    const ma = a.r * a.r;
    const mb = b.r * b.r;
    const wa = mb / (ma + mb);
    const wb = ma / (ma + mb);
    const overlap = min - d;
    a.x -= nx * overlap * wa;
    a.y -= ny * overlap * wa;
    a.z -= nz * overlap * wa;
    b.x += nx * overlap * wb;
    b.y += ny * overlap * wb;
    b.z += nz * overlap * wb;
    const rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny + (b.vz - a.vz) * nz;
    if (rv < 0) {
      const j = -(1 + BOUNCE) * rv;
      a.vx -= nx * j * wa;
      a.vy -= ny * j * wa;
      a.vz -= nz * j * wa;
      b.vx += nx * j * wb;
      b.vy += ny * j * wb;
      b.vz += nz * j * wb;
      // A glancing knock sets them turning.
      const slide = (b.vx - a.vx) * -ny + (b.vy - a.vy) * nx;
      a.spin += (slide * wa) / (a.r * 4);
      b.spin -= (slide * wb) / (b.r * 4);
    }
    // Resting on each other, they slow each other down.
    a.vx *= 0.995;
    b.vx *= 0.995;
  }

  private walls(b: Ball, h: number) {
    if (b.y < b.r) {
      b.y = b.r;
      if (b.vy < 0) b.vy = Math.abs(b.vy) < 60 ? 0 : -b.vy * BOUNCE;
      b.vx *= FRICTION ** (h * 60);
      b.vz *= FRICTION ** (h * 60);
      // On the floor it rolls with the ground: sliding right turns it clockwise.
      b.spin += (-b.vx / b.r - b.spin) * Math.min(1, h * 12);
    }
    if (b.x < b.r) {
      b.x = b.r;
      b.vx = Math.abs(b.vx) * BOUNCE;
    } else if (b.x > this.width - b.r) {
      b.x = this.width - b.r;
      b.vx = -Math.abs(b.vx) * BOUNCE;
    }
    if (Math.abs(b.z) > this.depth) {
      b.z = Math.sign(b.z) * this.depth;
      b.vz = -b.vz * BOUNCE;
    }
    // It rights itself: the roll springs back to its own small tilt.
    b.spin += ((b.rest - b.roll) * 28 - b.spin * 5) * h;
    b.roll += b.spin * h;
  }

  /** Nothing is moving any more. */
  get still(): boolean {
    return this.balls.every((b) => b.waiting || (Math.hypot(b.vx, b.vy, b.vz) < 8 && Math.abs(b.spin) < 0.05));
  }
}
