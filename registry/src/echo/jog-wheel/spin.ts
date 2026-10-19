/**
 * How far a turn goes. Pure: no React, no DOM.
 *
 * A slow turn is a step per notch. Faster, each notch is worth more, so a
 * flick covers a long way: at a notch every 50ms (half a turn a second, a
 * brisk hand) a notch is two steps, and it keeps growing with the speed.
 * Turning carries what it owes from notch to notch, so no turn is lost to
 * rounding and a slow turn never skips.
 */
export function spinSteps(
  degrees: number,
  seconds: number,
  owed: number,
  notch: number,
): { steps: number; owed: number } {
  const speed = Math.abs(degrees) / notch / seconds; // notches a second
  const gain = speed > 10 ? Math.min(12, speed / 10) : 1;
  const total = owed + (degrees / notch) * gain;
  const steps = Math.trunc(total);
  return { steps, owed: total - steps };
}

/**
 * The hub: inside this fraction of the wheel's radius, the pointer's angle
 * round the centre is noise. A hair's move there swings it a quarter turn.
 */
export const HUB = 0.3;

/** The pointer's angle round the centre, in degrees, or null inside the hub. */
export function angleAround(dx: number, dy: number, radius: number): number | null {
  if (Math.hypot(dx, dy) < radius * HUB) return null;
  return (Math.atan2(dy, dx) * 180) / Math.PI;
}

/** Pixels, lines and pages of scroll that make one notch. */
const PER_NOTCH = [100, 3, 1] as const;

/**
 * How far a wheel event turns the wheel, in degrees: a mouse wheel's click
 * (100px, or three lines) is one notch, and a trackpad's small deltas add up
 * to one. The stronger axis wins; up and right turn it up.
 */
export function wheelDegrees(
  e: { deltaX: number; deltaY: number; deltaMode: number },
  notch = 15,
): number {
  const by = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : -e.deltaY;
  if (!by) return 0;
  return (by / (PER_NOTCH[e.deltaMode] ?? PER_NOTCH[0])) * notch;
}
