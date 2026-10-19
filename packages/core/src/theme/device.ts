/**
 * The device's shape and feel: the three adjustable settings of the grammar
 * (PRINCIPLES.md, "What you can change"). Each is part of the seed.
 *
 * - finish: matte (0) to glossy (1). Scales how brightly lit edges shine and
 *   how deep shadows fall. It never moves the light: the key light is fixed at
 *   145° (KEY_LIGHT_ANGLE), because every recipe is drawn for it.
 * - radius: crisp (0) to soft (1). Scales every radius token except `full`.
 * - density: compact, default or comfortable. Scales spacing and control
 *   heights; compact never takes a control under 24px (WCAG 2.5.8).
 * - render: molded or drawn. How the parts are shown, never what they are. A
 *   molded part is plastic lit by the key light; a drawn one is the same part
 *   drawn in the ink, as a spec sheet draws a key: an outline at one weight,
 *   hollow, standing on a hard ink edge it travels down when pressed. Pressing,
 *   travel, sound and what each material is for don't change.
 *
 * The midpoint (0.5, "default") is today's look exactly: every factor is 1
 * there, so a theme that doesn't set these renders pixel for pixel as before.
 */

/** The one key light, in degrees. Grammar, not vocabulary: not part of the seed. */
export const KEY_LIGHT_ANGLE = 145;

export const DENSITIES = ["compact", "default", "comfortable"] as const;
export type EchoDensity = (typeof DENSITIES)[number];

export const RENDERS = ["molded", "drawn"] as const;
export type EchoRender = (typeof RENDERS)[number];

/** The ink line a drawn device draws everything with. 0 on a molded one, so its outlines draw nothing. */
export const DRAWN_LINE_WIDTH = "1.5px";

export interface EchoDevice {
  /** Matte (0) to glossy (1). Default 0.5. */
  finish: number;
  /** Crisp (0) to soft (1). Default 0.5. */
  radius: number;
  /** How tightly parts are packed. Default "default". */
  density: EchoDensity;
  /** Molded and lit, or drawn in the ink. Default "molded". */
  render: EchoRender;
  /**
   * Whether buttons and segments are pills, whatever the radius. Unset, they
   * are at radius 1 only, as before; set, a style can have pill buttons and
   * crisp boxes (a spec sheet's) or soft boxes and square keys.
   */
  pills: boolean;
}

export const DEVICE_DEFAULTS: EchoDevice = { finish: 0.5, radius: 0.5, density: "default", render: "molded", pills: false };

/**
 * 0 → `low`, 0.5 → 1 (today), 1 → `high`, straight lines in between. Two
 * segments rather than one so the midpoint is exactly 1 whatever the ends are.
 */
function around(t: number, low: number, high: number): number {
  return t <= 0.5 ? low + (1 - low) * (t / 0.5) : 1 + (high - 1) * ((t - 0.5) / 0.5);
}

/** Multiplier on every lit-edge and specular highlight's opacity. */
export const glossFactor = (finish: number): number => around(finish, 0.35, 1.6);

/** Multiplier on every shadow's opacity. Matte plastic still casts shadows, so the range is narrow. */
export const shadeFactor = (finish: number): number => around(finish, 0.85, 1.12);

/** Multiplier on every radius token except `full`. */
export const radiusFactor = (radius: number): number => around(radius, 0.35, 1.6);

/** Multiplier on spacing and control heights. */
export const DENSITY_FACTOR: Readonly<Record<EchoDensity, number>> = {
  compact: 0.875,
  default: 1,
  comfortable: 1.125,
};
