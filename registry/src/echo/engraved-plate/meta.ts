import { z } from "zod";

export const engravedPlateProps = z.object({
  children: z.string().describe("The engraving. Short — a plate is stamped, not written on."),
  tilt: z
    .number()
    .default(0)
    .describe("Rotation in degrees, as if screwed on slightly off-true."),
  rivets: z.boolean().default(true).describe("Rivets at the plate's short edges."),
});

export const meta = {
  name: "echo-engraved-plate",
  title: "EngravedPlate",
  description:
    "A paper-coloured metal plate with text cut into it and rivets at the edges — the one non-emissive readout in the library. Use it for a fact fixed to the device (a serial, a balance, a rating); use LcdChip for a value that updates while you watch.",
  props: engravedPlateProps,
  examples: [
    {
      title: "Plate",
      description: "Debossed machine text on paper-coloured metal.",
      code: "<EngravedPlate>Owed 4</EngravedPlate>",
    },
    {
      title: "Screwed on off-true",
      description: "A few degrees of tilt reads as a real part, not a label.",
      code: "<EngravedPlate tilt={-5}>Model 002</EngravedPlate>",
    },
    {
      title: "Flush",
      description: "Without rivets the plate reads as inlaid rather than bolted.",
      code: "<EngravedPlate rivets={false}>Serial 4417</EngravedPlate>",
    },
  ],
  feel: "A riveted metal nameplate with the words cut into it.",
  usage: {
    imports: "import { EngravedPlate } from \"@/echo/engraved-plate\";",
    code: "<EngravedPlate>Model 002</EngravedPlate>",
  },
  composition: "EngravedPlate",
  a11y: [
    "Plain text; the rivets are `aria-hidden`.",
    "Engraving lowers contrast on purpose. Use it for names and labels that are also said elsewhere, not for the only copy of something someone needs to read.",
  ],
  antiPatterns: [
    "Never animate the text or swap it on a timer — a plate is stamped once. A value that changes belongs on an LcdChip or a StatTile.",
    "Never put a sentence on it. The engraving is a few machine-cased words; longer copy on paper-coloured metal reads as a sticky note.",
    "Never override the text colour with your own hex — the engraving is var(--echo-accent-pressed) precisely so it stays legible on paper after a reseed.",
  ],
} as const;
