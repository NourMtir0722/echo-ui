"use client";

/**
 * useRoll. A readout that rolls to a new value instead of swapping it: each
 * digit steps through the ones in between, all together, fast when it's far
 * and slowest on the last step — the drum a SplitFlap turns on, without the
 * flaps. It's how LcdChip, StatTile and NumberField change digits when you
 * pass `roll`, and SplitFlap turns on the same drum.
 *
 *   const shown = useRoll(String(count));
 *
 * A falling number rolls back and a rising one forward; text that isn't a
 * number rolls forward, like a departures board. What isn't on the drum (a
 * comma, a colon) swaps at once.
 *
 * It returns the text to draw, which is in between values while it rolls, so
 * draw it aria-hidden and give the real value to assistive technology. Under
 * reduced motion, or with `enabled: false`, it returns the value itself.
 */
import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "echo-ui-core/tactile";
import { DIGITS, rollDirection, rollStep, turnMs, type Turn } from "./drum";

export interface RollOptions {
  /** The characters in order, each one a step. Defaults to the digits. */
  drum?: string;
  /** Roll at all. `false` swaps the value outright. Default true. */
  enabled?: boolean;
  /** Called on every step, for a tick. */
  onTurn?: () => void;
}

export function useRoll(text: string, { drum = DIGITS, enabled = true, onTurn }: RollOptions = {}): string {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(text);
  const tick = useRef(onTurn);
  const dir = useRef<Turn>(1);
  const target = useRef(text);

  useEffect(() => {
    tick.current = onTurn;
  });

  // Which way to go is set by the change of target, not by where the roll
  // has got to: 12 → 9 rolls back even if it's already showing 10.
  useEffect(() => {
    if (target.current === text) return;
    dir.current = rollDirection(target.current, text);
    target.current = text;
  }, [text]);

  const rolling = enabled && !reduced;
  useEffect(() => {
    if (shown === text) return;
    if (!rolling) {
      setShown(text);
      return;
    }
    const { next, left } = rollStep(shown, text, drum, dir.current);
    const id = setTimeout(() => {
      tick.current?.();
      setShown(next);
    }, turnMs(left + 1));
    return () => clearTimeout(id);
  }, [shown, text, drum, rolling]);

  return rolling ? shown : text;
}
