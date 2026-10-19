import { z } from "zod";

export const meterProps = z.object({
  label: z.string().describe("What it measures; the visible label and the accessible name."),
  value: z.number(),
  min: z.number().default(0),
  max: z.number().default(100),
  format: z.unknown().optional().describe('How the value reads: Intl.NumberFormatOptions ({ style: "unit", unit: "gigabyte" }). Default: percent of the range; `{ style: "percent" }` is the share of the range too, with your digits.'),
  marks: z.array(z.number()).optional().describe("Levels engraved on the tube (a limit, a target). Say what each means in words."),
  showValue: z.boolean().default(true).describe("The value as text beside the label."),
});

export const meta = {
  name: "echo-meter",
  title: "Meter",
  description:
    "A measurement within a known range (storage, battery, signal, a score), not a task's progress. A recessed tube with the primary plastic poured to the value; when the value changes the level travels there on a spring and settles with a small slosh. marks engrave levels on the tube without a second colour. Built on Base UI Meter: role=\"meter\" with the formatted value as aria-valuetext.",
  props: meterProps,
  examples: [
    {
      title: "Storage",
      description: "A unit, and a limit engraved on the tube.",
      code: '<Meter label="Storage" value={42.5} max={64} marks={[56]} format={{ style: "unit", unit: "gigabyte", maximumFractionDigits: 1 }} />',
    },
    {
      title: "Battery",
      description: "The default reads as a percent.",
      code: '<Meter label="Battery" value={battery} />',
    },
  ],
  feel: "A tube of lit plastic that settles to its level like a liquid: when the reading moves, you see it travel.",
  usage: {
    imports: 'import { Meter } from "@/echo/meter";',
    code: '<Meter label="Signal" value={signal} />',
  },
  composition: "Meter → a label, a reading and a tube (Base UI Meter)",
  a11y: [
    "`role=\"meter\"` named by `label`, with min, max and the formatted value as `aria-valuetext`.",
    "It doesn't announce changes; announce a meaningful threshold (\"storage almost full\") separately.",
    "A mark has no colour of its own and no meaning without words: say what it is.",
    "In forced colors the fill is the system highlight inside an outlined tube.",
  ],
  motion: {
    tokens: ["springs"],
    reducedMotion: "The level jumps to the new value.",
  },
  antiPatterns: [
    "Never use a Meter for a task's progress: that's Progress.",
    "Never colour a Meter red when it's high: say it (\"almost full\") and, if it matters, raise a Banner.",
    "Never animate a Meter that changes many times a second: that's a Level meter.",
  ],
} as const;
