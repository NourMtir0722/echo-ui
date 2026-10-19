/**
 * The drum a rolling character turns on. Pure: no React, no DOM, so the
 * stepping rule can be tested on its own and shared by everything that rolls
 * (SplitFlap's flaps, LcdChip's, StatTile's and NumberField's digits).
 *
 * A character on the drum reaches its target by passing every character in
 * between, one turn at a time. A character that isn't on the drum (a comma,
 * a unit, a character a text drum lacks) has no in-between: it swaps.
 */

/** Digits, in order. */
export const DIGITS = "0123456789";
/** A departures board's letters, digits and marks, in order. */
export const CHARS = " ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,:-!?";

/** Which way a drum turns: 1 forward (0→1→2), -1 back (2→1→0). */
export type Turn = 1 | -1;

/** How many turns `from` is from `to`, going `dir`. 0 when they're equal, -1 when either is off the drum. */
export function turnsLeft(from: string, to: string, drum: string, dir: Turn = 1): number {
  if (from === to) return 0;
  const at = drum.indexOf(from);
  const end = drum.indexOf(to);
  if (at < 0 || end < 0) return -1;
  return ((end - at) * dir + drum.length) % drum.length;
}

/** The character one turn on from `from` toward `to`; `to` itself when there's nothing in between. */
export function turn(from: string, to: string, drum: string, dir: Turn = 1): string {
  if (turnsLeft(from, to, drum, dir) <= 0) return to;
  const at = drum.indexOf(from);
  return drum[(at + dir + drum.length) % drum.length]!;
}

/** How long one turn takes with `left` to go: fast when it's far, the last one slowest. */
export function turnMs(left: number): number {
  return left > 3 ? 55 : left > 1 ? 80 : 120;
}

/**
 * One turn of a whole readout: every character that isn't there yet moves one
 * step. The two are right-aligned, the way a counter's digits are, so 99 → 100
 * turns the nines over and a 1 appears in front.
 *
 * Returns the next text and the most turns any character still has to go
 * after this one (0 when it has arrived).
 */
export function rollStep(from: string, to: string, drum: string, dir: Turn = 1): { next: string; left: number } {
  const n = Math.max(from.length, to.length);
  const a = from.padStart(n, " ");
  const b = to.padStart(n, " ");
  let next = "";
  let left = 0;
  for (let i = 0; i < n; i++) {
    const c = turn(a[i]!, b[i]!, drum, dir);
    next += c;
    left = Math.max(left, turnsLeft(c, b[i]!, drum, dir));
  }
  return { next: left === 0 ? to : next, left };
}

/** The number a readout shows, if it shows one: "1,024" → 1024, "07:42" → null. */
export function readNumber(text: string): number | null {
  const plain = text.replace(/[\s,_\u00a0\u202f]/g, "");
  if (!/^[-+]?(\d+\.?\d*|\.\d+)$/.test(plain)) return null;
  return Number(plain);
}

/** Which way to roll from one reading to the next: back when a number falls, forward otherwise. */
export function rollDirection(from: string, to: string): Turn {
  const a = readNumber(from);
  const b = readNumber(to);
  return a !== null && b !== null && b < a ? -1 : 1;
}
