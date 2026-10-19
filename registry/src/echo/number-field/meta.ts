import { z } from "zod";
import { textInteropProps } from "../../agent/interop";

export const numberFieldProps = z.object({
  ...textInteropProps,
  label: z.string().describe("Visible label, the scrub handle, and the input's accessible name."),
  value: z.number().optional().describe("Controlled value."),
  defaultValue: z.number().optional().describe("Uncontrolled initial value."),
  onValueChange: z.function().optional().describe("Called with the new value — which is null while the field is empty mid-edit, so do not assume a number."),
  min: z.number().optional(),
  max: z.number().optional(),
  step: z.number().default(1).describe("Step for the caps, arrow keys, and scrubbing."),
  largeStep: z.number().default(10).describe("Step while holding shift."),
  smallStep: z.number().default(0.1).describe("Step while holding alt."),
  disabled: z.boolean().default(false),
  readOnly: z.boolean().default(false),
  decrementLabel: z.string().default("Decrease").describe("Accessible name for the − cap."),
  incrementLabel: z.string().default("Increase").describe("Accessible name for the + cap."),
  roll: z
    .boolean()
    .default(false)
    .describe("A step rolls the digits, each stepping through the ones in between, instead of sliding the whole number in. Typing never rolls."),
  size: z
    .enum(["sm", "md", "lg"])
    .default("md")
    .describe("Height on the control scale: sm 32px, md 44px, lg 60px, the same as a HardwareButton or Field of that size, so they line up in a row. Defaults to the nearest SizeProvider's size."),
});

export const meta = {
  name: "echo-number-field",
  title: "NumberField",
  description:
    "A machined readout between two molded step caps — and the label above it is a scrub handle you drag left and right to dial the value. Base UI owns typing, arrow keys, alt/shift step sizes, clamping, and form semantics. Scrubbing is what makes this worth wrapping instead of using a plain number input.",
  props: numberFieldProps,
  examples: [
    {
      title: "Bounded setting",
      description: "Label names the value; min/max clamp every interaction path.",
      code: '<NumberField label="Tempo" defaultValue={120} min={40} max={240} />',
    },
    {
      title: "Fine control",
      description: "Alt steps by smallStep, shift by largeStep — no extra props needed.",
      code: '<NumberField label="Gain" defaultValue={0} min={-24} max={24} step={1} smallStep={0.1} />',
    },
    {
      title: "Controlled",
      description: "value can be null while the input is mid-edit or empty.",
      code: "<NumberField label=\"Count\" value={count} onValueChange={(v) => setCount(v ?? 0)} />",
    },
    {
      title: "Rolling digits",
      description: "Each step rolls the digits through the ones in between, like an odometer.",
      code: '<NumberField label="Floor" defaultValue={18} min={0} max={99} roll />',
    },
  ],
  feel: "A readout with two molded steppers; drag the label sideways to scrub it like a knob. The readout sinks while you type into it, and each digit lands as a small strike.",
  usage: {
    imports: "import { NumberField } from \"@/echo/number-field\";",
    code: "<NumberField label=\"Tempo\" defaultValue={120} min={40} max={240} />",
  },
  composition: "NumberField",
  a11y: [
    "`label` names the input. The − and + steppers have their own labels.",
    "Arrow Up and Down change the value by `step`; with Shift by `largeStep`, with Alt by `smallStep`.",
    "Scrubbing by dragging the label is a pointer extra — everything it does is also possible from the keyboard.",
    "With `roll`, the digits in between are drawn over the input and hidden from assistive technology; the input itself always holds, and says, the real value.",
  ],
  motion: {
    tokens: ["lift"],
    reducedMotion: "The value changes without sliding or rolling, the readout doesn't sink, and the steppers press without travelling.",
  },
  sound: [
    "`tap` once per whole step, however the value changed.",
  ],
  antiPatterns: [
    "Never treat the value as always-numeric in a controlled setup — Base UI reports null while the input is empty or mid-edit. Coalesce it; do not render NaN into the readout.",
    "Never use this for a bounded value the user should feel out rather than name — that is a Slider. NumberField is for values worth typing exactly.",
    "Never remove the label: it is the input's accessible name AND the scrub handle. Without it the field is both unnamed and undraggable.",
    "Never hand the step caps to a screen reader unnamed. They ship as − and +, which read as punctuation; the decrementLabel and incrementLabel props exist so they announce as actions.",
  ],
} as const;
