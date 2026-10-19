import { z } from "zod";

export const lcdChipProps = z.object({
  value: z.string().describe("The readout — digits, a duration, a count."),
  label: z.string().describe("Machine label beside the value; also the accessible name."),
  glow: z
    .boolean()
    .default(true)
    .describe("Emissive accent value. false renders plain cream text."),
  roll: z
    .boolean()
    .default(false)
    .describe("A new value rolls to its digits, each stepping through the ones in between, instead of flickering over. For a string or number value."),
});

export const meta = {
  name: "echo-lcd-chip",
  title: "LcdChip",
  description:
    "An inline recessed LCD readout: a glowing accent value next to a machine label, sunk into a dark well. The chip form of StatTile — use it inline in a row of controls; use StatTile when the readout is a dashboard cell.",
  props: lcdChipProps,
  examples: [
    {
      title: "Readout",
      description: "Glowing value with a machine label.",
      code: '<LcdChip value="07:42" label="Uptime" />',
    },
    {
      title: "Unlit",
      description: "Cream text — for a value that is present but not live.",
      code: '<LcdChip value="--" label="Signal" glow={false} />',
    },
    {
      title: "In a well",
      description: "Chips read as one instrument cluster inside a screen Panel.",
      code: '<Panel variant="screen"><LcdChip value="128" label="BPM" /><LcdChip value="A♯" label="Key" /></Panel>',
    },
    {
      title: "Rolling digits",
      description: "A new value steps through the digits in between, the way a counter does.",
      code: '<LcdChip value={String(queue)} label="Queue" roll />',
    },
  ],
  feel: "A small emissive screen set into the panel, reading one value. It powers on in steps, and a new value ticks over with a short flicker — or, with roll, steps through the digits in between.",
  usage: {
    imports: "import { LcdChip } from \"@/echo/lcd-chip\";",
    code: "<LcdChip value=\"07:42\" label=\"Uptime\" />",
  },
  composition: "LcdChip",
  a11y: [
    "`role=\"group\"` named by `label`, so the value is read with what it is.",
    "It renders a `span`, so it can sit inside a button, a label or a line of text. Inside a button, name the button with the reading too: a group's name replaces its text in the button's.",
    "The screen face is tabular: digits keep their width as the value changes.",
    "With `roll`, the digits in between are drawn but hidden from assistive technology; the value is said once, as it is.",
  ],
  antiPatterns: [
    "Never put an LcdChip on a raised surface without a well — an emissive readout floating on plastic breaks the material law; nest it in a Panel variant=\"screen\" or the chassis.",
    "Never animate the value with a smooth ease — screens step. Use motion.glitch or swap the text outright; glass moves smooth, pixels move steppy.",
    "Never pass a long sentence as value — the LCD face is tabular digits and short codes, not prose.",
  ],
} as const;
