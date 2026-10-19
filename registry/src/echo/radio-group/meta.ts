import { z } from "zod";
import { interopProps } from "../../agent/interop";

export const radioGroupProps = z.object({
  ...interopProps,
  value: z.string().optional().describe("Controlled selected value."),
  defaultValue: z.string().optional().describe("Uncontrolled initial value."),
  onValueChange: z.function().optional().describe("Fired with the newly selected value."),
  orientation: z
    .enum(["horizontal", "vertical"])
    .default("horizontal")
    .describe("Lay the options out in a row or a stack."),
  disabled: z.boolean().default(false),
  name: z.string().optional().describe("Identifies the field when a form is submitted."),
  "aria-label": z.string().optional().describe("Names the group, since its options only name themselves. This or aria-labelledby is required: leaving both out is a type error."),
  "aria-labelledby": z.string().optional().describe("Id of the visible heading or label that names the group."),
});

export const meta = {
  name: "echo-radio-group",
  title: "RadioGroup",
  description:
    "One choice from a small set: each option is a recessed hole beside its label, and the chosen one lights a pip inside its hole. Base UI owns roving focus, arrow-key selection, and form semantics; Echo owns the material. Compound API: RadioGroup with RadioGroup.Item children.",
  props: radioGroupProps,
  examples: [
    {
      title: "Pick a mode",
      description: "The group needs an accessible name; each item names itself.",
      code: '<RadioGroup defaultValue="meter" aria-label="Panel mode">\n  <RadioGroup.Item value="meter">Meter</RadioGroup.Item>\n  <RadioGroup.Item value="log">Log</RadioGroup.Item>\n</RadioGroup>',
    },
    {
      title: "Stacked",
      description: "Vertical when the labels are long or the list is more than three.",
      code: '<RadioGroup orientation="vertical" defaultValue="a" aria-label="Output">…</RadioGroup>',
    },
  ],
  feel: "A row of pips, one lit — like the mode lamps on a front panel. Pressing one deepens its hole on the same stroke as the library's keys, and the lit pip sinks with it.",
  usage: {
    imports: "import { RadioGroup } from \"@/echo/radio-group\";",
    code: [
      "<RadioGroup defaultValue=\"meter\" aria-label=\"Panel mode\">",
      "  <RadioGroup.Item value=\"meter\">Meter</RadioGroup.Item>",
      "  <RadioGroup.Item value=\"log\">Log</RadioGroup.Item>",
      "</RadioGroup>",
    ].join("\n"),
  },
  composition: "RadioGroup\n  RadioGroup.Item",
  a11y: [
    "Base UI RadioGroup: a `radiogroup` of `radio` items, each labelled by its own text.",
    "Tab enters the group at the checked item; arrow keys move the selection.",
    "Name the group with `aria-label` or `aria-labelledby`.",
  ],
  motion: {
    tokens: ["--echo-duration-swap"],
    reducedMotion: "The pip lights without a transition.",
  },
  sound: [
    "`select` when the choice changes.",
  ],
  antiPatterns: [
    "Never use a RadioGroup for two mutually exclusive states that are really on/off — that is a Switch. Radios are for three or more genuine alternatives.",
    "Never leave the group unnamed: pass aria-label or aria-labelledby to the group itself. Naming only the items tells a screen-reader user what the options are but never what the question was.",
    "Never wrap RadioGroup.Item in a <label> — the item already renders the role=radio button and takes its accessible name from its own children; a wrapping label associates with nothing and adds a second hit target that does not select.",
    "Never use it where only one option can ever be valid — a radio group that cannot be changed is a readout, so use an LcdChip or StatTile.",
  ],
} as const;
