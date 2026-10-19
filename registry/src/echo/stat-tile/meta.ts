import { z } from "zod";

export const statTileProps = z.object({
  value: z.string().describe("The readout value."),
  unit: z.string().optional().describe("The unit, set small after the value (\"ms\", \"%\"): say it here, not in the value."),
  glow: z
    .boolean()
    .default(true)
    .describe("Emissive accent value. Quiet the routine tiles and light the one being watched — six lit readouts side by side make the accent mean 'a number' rather than 'this one'."),
  label: z.string().describe("Machine label; also the group's accessible name."),
  roll: z
    .boolean()
    .default(false)
    .describe("A new value rolls to its digits, each stepping through the ones in between, instead of flickering over. For a string or number value."),
});

export const meta = {
  name: "echo-stat-tile",
  title: "StatTile",
  description:
    "A recessed LCD readout: a glowing value over a machine label, seated in a dark well. Static; consumes var(--echo-*).",
  props: statTileProps,
  examples: [
    { title: "Metric", description: "Value + unit + label.", code: '<StatTile value="42" unit="ms" label="Latency" />' },
    {
      title: "Rolling digits",
      description: "A new reading steps through the digits in between, the way a counter does.",
      code: '<StatTile value={String(requests)} unit="rps" label="Requests" roll />',
    },
  ],
  feel: "One number on an emissive screen, with its unit and what it measures engraved underneath. It powers on in steps the first time it scrolls into view, and a new reading ticks over with a short flicker, the way a segment display updates — or, with roll, steps through the digits in between.",
  usage: {
    imports: "import { StatTile } from \"@/echo/stat-tile\";",
    code: "<StatTile value=\"42\" unit=\"ms\" label=\"Latency\" />",
  },
  composition: "StatTile",
  a11y: [
    "`role=\"group\"` named by `label`, so the value, unit and label are read together as one reading.",
    "It does not announce changes. For a value that updates live and matters, announce significant changes separately.",
    "With `roll`, the digits in between are drawn but hidden from assistive technology; the value is said once, as it is.",
  ],
  antiPatterns: [
    "Do not leave every tile glowing on a dashboard. The accent marks the one reading that matters; a row of six lit tiles marks nothing. Pass glow={false} to the rest.",
    "Never animate the value with a smooth ease — LCD/pixel elements move steppy (motion.glitch), not glassy.",
    "Always pass a label; it is the tile's accessible name.",
  ],
} as const;
