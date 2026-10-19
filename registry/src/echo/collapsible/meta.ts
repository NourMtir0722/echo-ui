import { z } from "zod";

export const collapsibleProps = z.object({
  title: z.string().describe('The row\'s label: what opening it shows ("Advanced settings").'),
  children: z.unknown().describe("What it shows when open."),
  open: z.boolean().optional().describe("Controlled open state."),
  defaultOpen: z.boolean().default(false).describe("Open to begin with, uncontrolled."),
  onOpenChange: z.function().optional(),
  disabled: z.boolean().default(false),
});

export const meta = {
  name: "echo-collapsible",
  title: "Collapsible",
  description:
    "One disclosure on its own: a ruled row with a title and a chevron that opens a panel. For \"show more\", advanced settings or a single FAQ row, without Accordion's group rules. Built on Base UI Collapsible; closed content stays findable with the browser's find-in-page, which opens it.",
  props: collapsibleProps,
  examples: [
    {
      title: "Advanced settings",
      description: "Tucks away what most people never change.",
      code: '<Collapsible title="Advanced settings">\n  <NumberField label="Buffer" defaultValue={256} />\n</Collapsible>',
    },
    {
      title: "Controlled",
      description: "Open it from elsewhere, or remember it.",
      code: '<Collapsible title="Details" open={open} onOpenChange={setOpen}>{details}</Collapsible>',
    },
  ],
  feel: "A ruled row whose chevron turns over with a little weight; the panel slides open under it without jolting what's below.",
  usage: {
    imports: 'import { Collapsible } from "@/echo/collapsible";',
    code: '<Collapsible title="Advanced settings">{content}</Collapsible>',
  },
  composition: "Collapsible → a trigger row and a panel (Base UI Collapsible)",
  a11y: [
    "The row is a button with `aria-expanded`, controlling the panel.",
    "Enter and Space open and close it.",
    "Closed content is `hidden=\"until-found\"`: find-in-page can match it and opens the panel.",
  ],
  motion: {
    tokens: ["pop"],
    reducedMotion: "The panel opens and closes at once; the chevron turns without moving.",
  },
  sound: ["`tap` as it opens or closes, inside a SoundProvider."],
  antiPatterns: [
    "Never put the only copy of something required inside a closed Collapsible.",
    "Don't stack several to build a list: that's an Accordion, which keeps them as one group.",
  ],
} as const;
