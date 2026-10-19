import { z } from "zod";
import { interopProps } from "../../agent/interop";

export const tunerProps = z.object({
  ...interopProps,
  label: z.string().describe("What it sets: the machine label over the reading, and the accessible name."),
  value: z.number().optional().describe("Controlled value."),
  defaultValue: z.number().optional().describe("Uncontrolled starting value; defaults to min."),
  onValueChange: z.function().optional().describe("Called with each step the reading lands on."),
  min: z.number().default(0),
  max: z.number().default(100),
  step: z.number().default(1).describe("A range that isn't a whole number of steps ends on the last step inside it: 0 to 10 by 4 stops at 8."),
  unit: z.string().optional().describe('Engraved after the reading, and said with it: "kg", "MHz".'),
  labelEvery: z.number().optional().describe("The numbered ticks, in value units. Default: the nicest number that's at least eight steps."),
  formatValue: z.function().optional().describe('How the value is said to assistive technology. Default: the reading and its unit ("72.5 kg").'),
  disabled: z.boolean().default(false),
  screen: z.enum(["emissive", "reflective"]).default("emissive").describe("emissive: a dark screen that glows. reflective: paper-coloured glass, printed in ink, like a pocket calculator's."),
});

export const meta = {
  name: "echo-tuner",
  title: "Tuner",
  description:
    "A number picked the way a radio is tuned: a scale printed on the screen slides under a fixed, lit needle, and a seven-segment reading follows it. Drag it with your hand, flick it and it coasts onto a step, and every tick that passes the needle clicks. It fits a big range into a small width, since the range scrolls instead of being squeezed. A slider for assistive tech, with every slider key.",
  props: tunerProps,
  examples: [
    {
      title: "Weight",
      description: "Half-kilo steps; the reading keeps its width with a dim leading zero.",
      code: '<Tuner label="Weight" unit="kg" min={30} max={150} step={0.5} defaultValue={72.5} />',
    },
    {
      title: "A radio",
      description: "Tenths of a megahertz, numbered every whole one.",
      code: '<Tuner label="Frequency" unit="MHz" min={87.5} max={108} step={0.1} defaultValue={88.5} />',
    },
    {
      title: "Controlled",
      description: "The reading lands in your state a step at a time as the scale moves.",
      code: '<Tuner label="Tip" unit="%" min={0} max={30} value={tip} onValueChange={setTip} />',
    },
  ],
  feel: "A radio dial: the scale moves with your finger, coasts when you let it go, and clicks into each step as it passes the needle.",
  usage: {
    imports: 'import { Tuner } from "@/echo/tuner";',
    code: '<Tuner label="Weight" unit="kg" min={30} max={150} step={0.5} defaultValue={72.5} />',
  },
  composition: "Tuner\n  SegmentDisplay (the reading)\n  the scale (a role=\"slider\" element) and its needle",
  a11y: [
    "`role=\"slider\"` named by `label`, with `aria-valuenow`, min, max, and the reading with its unit as `aria-valuetext` (or `formatValue`'s).",
    "Arrow keys step, Page Up/Down move one numbered tick, Home and End go to the ends.",
    "An up-and-down wheel only turns it once it has focus, so scrolling a page never catches on it; a sideways swipe turns it at any time.",
    "Dragging and flicking are pointer extras: everything they do, the keys do.",
    "The reading above the scale is drawing; the slider says the value.",
  ],
  motion: {
    tokens: ["springs"],
    reducedMotion: "The scale jumps to each value: no coasting after a flick, no travel after a key.",
  },
  sound: ["A short click at every step that passes the needle, inside a SoundProvider."],
  antiPatterns: [
    "Never use a Tuner for a choice between a few values: that's a Segmented or a RadioGroup.",
    "Never leave out unit when the number has one: \"72.5\" means nothing, \"72.5 kg\" does.",
    "Never make the step so fine that one value is hard to land on by hand; a tenth of the thing people care about is usually enough.",
  ],
} as const;
