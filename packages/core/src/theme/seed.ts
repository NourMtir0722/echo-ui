/**
 * Layer 1 — Seed. The ~6 values a user actually touches.
 * A theme IS a seed. Echo ships with the Nawwara seed as default.
 */
/*
 * Validated by hand rather than with zod: this file ships in echo-ui-core, and
 * a schema library is a heavy dependency (and a version conflict with the
 * app's own zod) for ten fields. The zod schema the docs render lives in the
 * registry (`echo/theme/seed-schema.ts`); `seed-parity.test.ts` there keeps
 * the two from drifting.
 */

import { DENSITIES, DEVICE_DEFAULTS, RENDERS, type EchoDensity, type EchoRender } from "./device";

const HEX = /^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const SYSTEM_SANS = "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif";
const SYSTEM_MONO = "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace";

/** What a caller passes. Every field is optional; omitted ones take the default. */
export interface EchoSeedInput {
  /** The one saturated color. Default #8B6FE8 (Echo's purple). */
  accent?: string;
  /** Molded-plastic chassis base. Default #232130 (a purple-tinted graphite). */
  chassis?: string;
  /** Text/ivory source. Default #EFEBFA (a lavender-tinted paper). */
  paper?: string;
  /** Optional LCD screen tint; derived from chassis when omitted. */
  lcdTint?: string;
  /*
   * The device's shape and feel (device.ts). There is no key-light setting:
   * the light is grammar, fixed at 145° (KEY_LIGHT_ANGLE).
   */
  /** Matte (0) to glossy (1). How lit edges shine and shadows fall. Default 0.5. */
  finish?: number;
  /** Crisp (0) to soft (1). How rounded the molding is. Default 0.5. */
  radius?: number;
  /** How tightly parts are packed. Default "default". */
  density?: EchoDensity;
  /**
   * Molded (plastic lit by the key light) or drawn (the same parts drawn in the
   * ink: outlined, hollow, standing on a hard ink edge). Default "molded".
   */
  render?: EchoRender;
  /**
   * Buttons and segments are pills (true) or follow the radius (false),
   * whatever the radius. Unset: pills at radius 1 only.
   */
  pills?: boolean;

  /*
   * --- Type ---
   *
   * `--echo-font-machine` was referenced 55 times and `--echo-font-lcd` 5, and
   * neither was ever defined: all 60 declarations fell through to whatever
   * fallback each one happened to name, so the library shipped with no
   * typeface of its own. A consumer installing from the registry got even less
   * than the docs site, because `createEchoTheme` emitted colour only.
   *
   * The defaults are deliberately SYSTEM stacks with no webfont in them. A
   * default that names a family nobody self-hosts is the same bug again — it
   * renders as the fallback, differs between the docs app and a consumer, and
   * hides the fact that no decision has been made. Naming the families is one
   * edit here when that decision arrives.
   */

  /** Instrument labels: caps, panel legends, captions. The library's voice. */
  fontMachine?: string;
  /** Body and UI prose. */
  fontSans?: string;
  /** Data, code, and any digits that have to be told apart at a glance. */
  fontMono?: string;
  /** The screen face, on LCD panels and readouts. Tabular by necessity. */
  fontLcd?: string;
}

/** A seed with every default applied. `lcdTint` and `pills` stay optional: omitted means derived. */
export type EchoSeedResolved = Required<Omit<EchoSeedInput, "lcdTint" | "pills">> & Pick<EchoSeedInput, "lcdTint" | "pills">;

/** The defaults, in one place. */
export const SEED_DEFAULTS: Omit<EchoSeedResolved, "lcdTint" | "pills"> = {
  accent: "#8B6FE8",
  chassis: "#232130",
  paper: "#EFEBFA",
  finish: DEVICE_DEFAULTS.finish,
  radius: DEVICE_DEFAULTS.radius,
  density: DEVICE_DEFAULTS.density,
  render: DEVICE_DEFAULTS.render,
  fontMachine: SYSTEM_SANS,
  fontSans: SYSTEM_SANS,
  fontMono: SYSTEM_MONO,
  fontLcd: SYSTEM_MONO,
};

const COLOR_FIELDS = ["accent", "chassis", "paper", "lcdTint"] as const;
const FONT_FIELDS = ["fontMachine", "fontSans", "fontMono", "fontLcd"] as const;

/**
 * Validate a seed and fill its defaults. Throws one error that lists every bad
 * field, so a caller fixes them in one pass. Unknown keys are dropped.
 */
function parseSeed(input: EchoSeedInput = {}): EchoSeedResolved {
  if (input === null || typeof input !== "object") {
    throw new TypeError("Invalid Echo seed: expected an object");
  }
  const problems: string[] = [];
  for (const key of COLOR_FIELDS) {
    const value = input[key];
    if (value !== undefined && (typeof value !== "string" || !HEX.test(value))) {
      problems.push(`${key} must be a hex color like #8B6FE8 (got ${JSON.stringify(value)})`);
    }
  }
  for (const key of FONT_FIELDS) {
    const value = input[key];
    if (value !== undefined && typeof value !== "string") {
      problems.push(`${key} must be a string (got ${JSON.stringify(value)})`);
    }
  }
  for (const key of ["finish", "radius"] as const) {
    const value = input[key];
    if (value !== undefined && (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1)) {
      problems.push(`${key} must be a number from 0 to 1 (got ${JSON.stringify(value)})`);
    }
  }
  if (input.density !== undefined && !(DENSITIES as readonly unknown[]).includes(input.density)) {
    problems.push(`density must be one of ${DENSITIES.join(", ")} (got ${JSON.stringify(input.density)})`);
  }
  if (input.pills !== undefined && typeof input.pills !== "boolean") {
    problems.push(`pills must be true or false (got ${JSON.stringify(input.pills)})`);
  }
  if (input.render !== undefined && !(RENDERS as readonly unknown[]).includes(input.render)) {
    problems.push(`render must be one of ${RENDERS.join(", ")} (got ${JSON.stringify(input.render)})`);
  }
  if (problems.length > 0) {
    throw new TypeError(`Invalid Echo seed: ${problems.join("; ")}`);
  }

  const resolved: EchoSeedResolved = {
    accent: input.accent ?? SEED_DEFAULTS.accent,
    chassis: input.chassis ?? SEED_DEFAULTS.chassis,
    paper: input.paper ?? SEED_DEFAULTS.paper,
    finish: input.finish ?? SEED_DEFAULTS.finish,
    radius: input.radius ?? SEED_DEFAULTS.radius,
    density: input.density ?? SEED_DEFAULTS.density,
    render: input.render ?? SEED_DEFAULTS.render,
    fontMachine: input.fontMachine ?? SEED_DEFAULTS.fontMachine,
    fontSans: input.fontSans ?? SEED_DEFAULTS.fontSans,
    fontMono: input.fontMono ?? SEED_DEFAULTS.fontMono,
    fontLcd: input.fontLcd ?? SEED_DEFAULTS.fontLcd,
  };
  if (input.lcdTint !== undefined) resolved.lcdTint = input.lcdTint;
  if (input.pills !== undefined) resolved.pills = input.pills;
  return resolved;
}

/** The seed validator. `EchoSeed.parse(input)` returns a resolved seed or throws. */
export const EchoSeed = { parse: parseSeed } as const;

/** The Nawwara seed — Echo's default identity. */
export const defaultSeed: EchoSeedResolved = EchoSeed.parse({});
