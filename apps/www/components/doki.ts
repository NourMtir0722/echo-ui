import type { CreatureCharacter } from "@registry/echo/creature";

/** A rounded rectangle as a path: an eye, or a pupil. */
const pill = (x: number, y: number, w: number, h: number, r: number) =>
  `M${x + r} ${y}h${w - 2 * r}a${r} ${r} 0 0 1 ${r} ${r}v${h - 2 * r}a${r} ${r} 0 0 1 ${-r} ${r}h${2 * r - w}a${r} ${r} 0 0 1 ${-r} ${-r}v${2 * r - h}a${r} ${r} 0 0 1 ${r} ${-r}z`;

/**
 * Doki, the character of Noor's other brand, as a Creature: its own
 * silhouette exactly as drawn, with two eyes in the upper bulb so its moods
 * can show. The site's example of bringing your own character.
 */
export const DOKI: CreatureCharacter = {
  viewBox: "0 0 197 188",
  body: "M127.676 93.7333C167.539 81.2223 196.458 43.9879 196.458 0H0C0 43.9879 28.9186 81.2223 68.7772 93.7333C28.9186 106.244 0 143.479 0 187.467H196.458C196.458 143.479 167.539 106.244 127.676 93.7333Z",
  eyes: [pill(60, 32, 30, 36, 11), pill(107, 32, 30, 36, 11)],
  pupils: [pill(72, 39, 14, 24, 7), pill(119, 39, 14, 24, 7)],
  catchLights: [
    [76, 44],
    [123, 44],
  ],
  origin: [98, 184],
  eyeLine: 50,
};

/** Doki's own orange. */
export const DOKI_ORANGE = "#FF5A00";
