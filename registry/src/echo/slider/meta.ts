import { z } from "zod";
import { interopProps } from "../../agent/interop";

export const sliderProps = z.object({
  ...interopProps,
  min: z.number().default(0),
  max: z.number().default(100),
  step: z.number().default(1),
  value: z.number().optional().describe("Controlled value."),
  defaultValue: z.number().default(50),
  onValueChange: z.function().optional().describe("Called with the new value on every step (value, eventDetails)."),
  disabled: z.boolean().default(false),
  size: z.enum(["sm", "md"]).default("md").describe("md is the fader; sm is the dense-row slider (6px rail, 20px knob)."),
  "aria-label": z.string().optional().describe("The accessible name. The rail carries no text, so this or aria-labelledby is required (a type error otherwise). It lands on the thumb, which owns the hidden range input."),
  "aria-labelledby": z.string().optional().describe("Id of a visible label, instead of aria-label."),
});

export const meta = {
  name: "echo-slider",
  title: "Slider",
  description:
    "Base UI Slider (keyboard, drag, track-press, a11y) with a recessed rail + molded knob and a scrubbing tick sound on each step — very hardware.",
  props: sliderProps,
  examples: [
    { title: "Basic", description: "0–100, ticks per step.", code: '<Slider defaultValue={40} aria-label="Volume" />' },
    { title: "Stepped", description: "Coarser steps tick louder in the hand.", code: '<Slider min={0} max={10} step={1} aria-label="Level" />' },
    { title: "Small", description: "For dense rows — a mixer strip, an inline setting.", code: '<Slider size="sm" defaultValue={30} aria-label="Send" />' },
  ],
  feel: "A fader in a recessed rail that ticks once for every step it crosses.",
  usage: {
    imports: "import { Slider } from \"@/echo/slider\";",
    code: "<Slider defaultValue={40} aria-label=\"Volume\" />",
  },
  composition: "Slider",
  a11y: [
    "The thumb holds a range input: arrow keys move one step, Page Up and Page Down a large step, Home and End go to the ends.",
    "`aria-label` or `aria-labelledby` is passed to the thumb, which is what a screen reader focuses. The rail has no text of its own.",
    "The value is announced by the input as it changes.",
  ],
  sound: [
    "`tap` once per step as the value changes — dragging across ten steps ticks ten times.",
  ],
  antiPatterns: [
    "Give the slider an accessible name (aria-label) — the rail carries no text.",
    "Do not set a tiny step on a wide range if sound is on; the ticks turn into a buzz.",
  ],
} as const;
