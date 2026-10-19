import { z } from "zod";
import { interopProps } from "../../agent/interop";

export const checkboxProps = z.object({
  ...interopProps,
  checked: z.boolean().optional().describe("Controlled state."),
  defaultChecked: z.boolean().optional().describe("Uncontrolled initial state."),
  indeterminate: z.boolean().optional().describe("Mixed state — some but not all of a group is set."),
  onCheckedChange: z.function().optional().describe("Fired with the new state. The select sound plays before it."),
  disabled: z.boolean().optional(),
  id: z.string().optional(),
  name: z.string().optional().describe("Identifies the field when a form is submitted."),
  "aria-label": z.string().optional().describe("The box's name. This or aria-labelledby is required (a type error otherwise). Inside a <label>, point aria-labelledby at the label's text."),
  "aria-labelledby": z.string().optional().describe("Id of the visible label, when there is one."),
});

export const meta = {
  name: "echo-checkbox",
  title: "Checkbox",
  description:
    "Base UI Checkbox (keyboard, indeterminate, a11y) with a molded box skin that fills accent and shows a check when set. Select sound on change.",
  props: checkboxProps,
  examples: [
    { title: "Basic", description: "Uncontrolled with a label.", code: '<label><Checkbox aria-label="Agree" /> I agree</label>' },
    { title: "Indeterminate", description: "Tri-state parent.", code: "<Checkbox indeterminate aria-label=\"Select all\" />" },
  ],
  feel: "A small molded key that latches down with a click: it gives and lands like the library's buttons, sinks further while held, and checking it pops the lit cap up and draws the tick in one stroke.",
  usage: {
    imports: "import { Checkbox } from \"@/echo/checkbox\";",
    code: "<Checkbox aria-label=\"Loop playback\" defaultChecked />",
  },
  composition: "Checkbox",
  a11y: [
    "Base UI Checkbox: `role=\"checkbox\"` with `aria-checked`, which is `mixed` when `indeterminate`. Space toggles it.",
    "Name it with `aria-label` or `aria-labelledby`.",
    "Checked draws a check and indeterminate a dash, so the states differ by shape, not only by colour.",
  ],
  motion: {
    tokens: ["--echo-duration-swap"],
    reducedMotion: "The key doesn't travel or pop, and the mark appears without a transition; the hole's shading still answers the press.",
  },
  sound: [
    "`select` each time it changes.",
  ],
  antiPatterns: [
    "Give every Checkbox an accessible name (a wrapping <label> or aria-label).",
    "Do not swap accent for other colors — accent is the one saturated fill.",
  ],
} as const;
