/**
 * The seed as a zod schema, for the docs: the Theme page's prop table and the
 * live seed panel are walked from it by `describeProps`.
 *
 * The runtime validator is hand-written in echo-ui-core (`theme/seed.ts`), so
 * the published package doesn't depend on zod. `seed-parity.test.ts` keeps the
 * two in step: same fields, same defaults, same accept/reject decisions.
 */
import { z } from "zod";

const hexColor = z
  .string()
  .regex(/^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/, "must be a hex color like #8B6FE8");

export const EchoSeedSchema = z.object({
  /** The one saturated color. Default #8B6FE8 (Echo's purple). */
  accent: hexColor.default("#8B6FE8").describe("The one saturated colour, as a hex: the mark, the on state, the lit rail."),
  /** Molded-plastic chassis base. Default #232130 (a purple-tinted graphite). */
  chassis: hexColor.default("#232130").describe("The molded plastic every surface, cap and well is derived from. A pale one makes a light device."),
  /** Text/ivory source. Default #EFEBFA (a lavender-tinted paper). */
  paper: hexColor.default("#EFEBFA").describe("The source of every text colour."),
  /** Optional LCD screen tint; derived from chassis when omitted. */
  lcdTint: hexColor.optional().describe("The screens' tint. Derived from the chassis when omitted."),
  /*
   * The device's shape and feel. No key-light setting: the light is grammar,
   * fixed at 145° (PRINCIPLES.md, "One light").
   */
  /** Matte (0) to glossy (1): how lit edges shine and shadows fall. */
  finish: z.number().min(0).max(1).default(0.5).describe("Matte (0) to glossy (1): how brightly lit edges shine and how deep shadows fall."),
  /** Crisp (0) to soft (1): how rounded the molding is. */
  radius: z.number().min(0).max(1).default(0.5).describe("Crisp (0) to soft (1): the corners of boxes, panels and fields."),
  /** How tightly parts are packed. */
  density: z.enum(["compact", "default", "comfortable"]).default("default").describe("compact, default or comfortable: spacing and control heights. A target is never under 24px."),
  /** Molded (lit plastic) or drawn (the same parts in the ink: outlined, hollow, on a hard ink edge). */
  render: z.enum(["molded", "drawn"]).default("molded").describe("molded or drawn: lit plastic, or the same parts drawn in the ink, outlined and hollow on a hard ink edge."),
  /** Buttons and segments as pills, whatever the radius. Unset: pills at radius 1 only. */
  pills: z.boolean().optional().describe("Buttons and segments as pills (true) or following the radius (false), whatever the radius. Unset, they're pills at radius 1 only."),

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
  fontMachine: z
    .string()
    .default("ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif").describe("Instrument labels: caps, panel legends, captions. A font stack."),
  /** Body and UI prose. */
  fontSans: z
    .string()
    .default("ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif").describe("Body and UI prose. A font stack."),
  /** Data, code, and any digits that have to be told apart at a glance. */
  fontMono: z
    .string()
    .default("ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace").describe("Data, code, and digits that must be told apart. A font stack."),
  /** The screen face, on LCD panels and readouts. Tabular by necessity. */
  fontLcd: z
    .string()
    .default("ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace").describe("The screen face on LCD panels and readouts. A font stack."),
});
