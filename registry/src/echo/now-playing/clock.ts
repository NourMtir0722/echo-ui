/**
 * Seconds as a clock: 84 → "01:24", 3725 → "1:02:05". A time that isn't
 * known (NaN, or Infinity) reads as dashes, never "NaN:NaN".
 */
export function clock(seconds: number): string {
  if (!Number.isFinite(seconds)) return "--:--";
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const two = (n: number) => String(n).padStart(2, "0");
  return h ? `${h}:${two(m)}:${two(sec)}` : `${two(m)}:${two(sec)}`;
}

export type Length = { kind: "live" } | { kind: "loading" } | { kind: "known"; seconds: number };

/**
 * What a duration says, including the two an <audio> element gives before it
 * has a number: Infinity for a live stream, NaN before its metadata loads.
 */
export function lengthOf(duration: number | undefined): Length {
  if (duration === undefined || duration === Number.POSITIVE_INFINITY) return { kind: "live" };
  if (!Number.isFinite(duration) || duration < 0) return { kind: "loading" };
  return { kind: "known", seconds: duration };
}
