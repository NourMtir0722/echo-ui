import { z } from "zod";
import { interopProps } from "../../agent/interop";

export const knobProps = z.object({
  ...interopProps,
  label: z.string().describe("What it sets; the visible label and the accessible name."),
  value: z.number().optional().describe("Controlled value."),
  defaultValue: z.number().optional().describe("Uncontrolled starting value; defaults to min."),
  onValueChange: z.function().optional(),
  min: z.number().default(0),
  max: z.number().default(100),
  step: z.number().default(1),
  formatValue: z.function().optional().describe('How the value reads, under the knob and to assistive tech ("-6 dB").'),
  ticks: z.number().default(11).describe("Ticks engraved around it; they light up to the value."),
  size: z.enum(["sm", "md", "lg"]).default("md").describe("40, 56 or 72px across."),
  disabled: z.boolean().default(false),
});

export const meta = {
  name: "echo-knob",
  title: "Knob",
  description:
    "A molded rotary cap in its well with an engraved pointer and a scale that lights up to the value. Drag it up (or around), turn it with the wheel once focused, or use the keys; it clicks at every step, settles onto each detent on a spring, and gives a little past either end. A slider for assistive tech: role=\"slider\" named by label, with every slider key.",
  props: knobProps,
  examples: [
    {
      title: "Gain",
      description: "A reading under the knob, and to a screen reader.",
      code: '<Knob label="Gain" min={-24} max={24} defaultValue={0} formatValue={(v: number) => `${v > 0 ? "+" : ""}${v} dB`} />',
    },
    {
      title: "A bank of knobs",
      description: "Small knobs in a row, like a channel strip.",
      code: '<Stack direction="row" gap={6}>\n  <Knob size="sm" label="Low" />\n  <Knob size="sm" label="Mid" />\n  <Knob size="sm" label="High" />\n</Stack>',
    },
  ],
  feel: "A real pot: it clicks at every step and lands on each one with a small settle; turned past the end, it gives a little and springs back.",
  usage: {
    imports: 'import { Knob } from "@/echo/knob";',
    code: '<Knob label="Volume" defaultValue={60} />',
  },
  composition: "Knob → a scale, a well and a turning cap (a role=\"slider\" element)",
  a11y: [
    "`role=\"slider\"` named by `label`, with `aria-valuenow`, min, max and `formatValue`'s reading as `aria-valuetext`.",
    "Arrow keys step, Page Up/Down move a tenth of the range, Home and End go to the ends.",
    "The wheel only turns it once it has focus, so scrolling a page never catches on a knob.",
    "Dragging is a pointer extra: everything it does, the keys do.",
  ],
  motion: {
    tokens: ["springs"],
    reducedMotion: "The cap turns straight to the value; no settle, no give past the ends.",
  },
  sound: ["A short click at every step, inside a SoundProvider."],
  antiPatterns: [
    "Never use a Knob where a Slider will do in a form: it's an instrument, for a panel of controls people tweak by feel.",
    "Never leave out formatValue when the number has a unit: \"-6\" means nothing, \"-6 dB\" does.",
  ],
} as const;
