/**
 * A barcode drawn from a reference: the same code always prints the same
 * bars. It's a picture of a barcode, not a scannable one; the code itself is
 * printed in text beneath it.
 */
export interface Bar {
  x: number;
  w: number;
}

/** Bars across a 200-unit strip, with quiet zones at both ends. */
export function barcode(code: string, width = 200): Bar[] {
  let seed = 2166136261;
  for (const ch of code) {
    seed ^= ch.charCodeAt(0);
    seed = Math.imul(seed, 16777619) >>> 0;
  }
  const next = () => {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    seed >>>= 0;
    return seed;
  };
  const bars: Bar[] = [];
  let x = 8;
  while (x < width - 10) {
    const w = 1 + (next() % 3);
    const gap = 1 + (next() % 3);
    if (x + w > width - 8) break;
    bars.push({ x, w });
    x += w + gap;
  }
  return bars;
}
