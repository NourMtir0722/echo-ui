import { z } from "zod";
import { interopProps } from "../../agent/interop";

export const switchProps = z.object({
  ...interopProps,
  checked: z.boolean().optional().describe("Controlled state."),
  defaultChecked: z.boolean().optional().describe("Uncontrolled initial state."),
  onCheckedChange: z
    .function()
    .optional()
    .describe("Fired with the new state. The click sound plays before it, so this never has to make noise itself."),
  disabled: z.boolean().optional(),
  id: z.string().optional(),
  name: z.string().optional().describe("Identifies the field when a form is submitted."),
  "aria-label": z.string().optional().describe("The switch's name; the track carries no text. This or aria-labelledby is required: leaving both out is a type error."),
  "aria-labelledby": z.string().optional().describe("Id of the visible label, when there is one."),
});

export const meta = {
  name: "echo-switch",
  title: "Switch",
  description:
    "Base UI Switch (role=switch, keyboard, a11y) with a hardware-toggle skin — a molded thumb sliding in a recessed track — and a click sound on toggle.",
  props: switchProps,
  examples: [
    { title: "Basic", description: "Uncontrolled toggle.", code: '<Switch aria-label="Airplane mode" defaultChecked />' },
    { title: "Controlled", description: "Drive it from state.", code: "<Switch checked={on} onCheckedChange={setOn} aria-label=\"Power\" />" },
  ],
  feel: "A hardware toggle: the thumb slides across its track with a small tap.",
  usage: {
    imports: "import { Switch } from \"@/echo/switch\";",
    code: "<Switch aria-label=\"Monitor\" defaultChecked />",
  },
  composition: "Switch",
  a11y: [
    "Base UI Switch: `role=\"switch\"` with `aria-checked`. Space toggles it.",
    "The track carries no text — name it with `aria-label`, or `aria-labelledby` pointing at a visible label.",
    "On and off differ by the thumb's position, not by colour alone.",
  ],
  motion: {
    tokens: ["lift", "rebound"],
    reducedMotion: "The thumb jumps to its new side instead of travelling, and does not grow or follow a drag; the track still lights with the state.",
  },
  sound: [
    "`tap` each time it toggles.",
  ],
  antiPatterns: [
    "Always give a Switch an accessible name (aria-label or aria-labelledby) — the track has no text.",
    "Do not use a Switch for actions that need confirmation; it toggles immediately.",
  ],
} as const;
