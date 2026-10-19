import { z } from "zod";

export const badgeProps = z.object({
  variant: z.enum(["neutral", "accent", "lcd", "outline"]).default("neutral").describe("neutral (the default) is plastic; accent wears the lit primary cap; lcd is glowing screen text, for a count or a code; outline is a quiet ring with no fill, in dim text."),
  size: z.enum(["sm", "md"]).default("md").describe("sm or md (the default)."),
});

export const meta = {
  name: "echo-badge",
  title: "Badge",
  description:
    "A small molded/LCD status label. neutral (plastic), accent (the lit primary cap), lcd (glowing screen text), outline. Static; consumes var(--echo-*).",
  props: badgeProps,
  examples: [
    { title: "Status", description: "Default neutral plastic pill.", code: "<Badge>New</Badge>" },
    { title: "LCD count", description: "Glowing screen readout.", code: '<Badge variant="lcd">12</Badge>' },
  ],
  feel: "A small molded pill, or a glowing LCD readout, stuck to whatever it describes.",
  usage: {
    imports: "import { Badge } from \"@/echo/badge\";",
    code: "<Badge>New</Badge>",
  },
  composition: "Badge",
  a11y: [
    "Plain text in a `<span>` — a screen reader reads it as part of the surrounding content, with no role of its own.",
    "Make the text say the whole thing (“3 new”, not a bare “3”) when the badge is read out of context.",
  ],
  antiPatterns: [
    "Do not use accent Badges for non-primary emphasis — accent is the one saturated color; overuse dilutes it.",
    "Do not hardcode colors; the badge recolors with the theme.",
  ],
} as const;
