import { z } from "zod";

export const sizeProps = z.object({
  size: z.enum(["sm", "md", "lg"]).describe("The size every control inside takes, unless it's given its own."),
  children: z.unknown().optional(),
});

export const meta = {
  name: "echo-size",
  title: "SizeProvider",
  description:
    "One size scale for everything with a height: sm, md and lg are the control heights (32, 44 and 60px at default density), so a button, a field and a select of the same size line up in a row. Wrap a toolbar, a filter bar or a card footer in SizeProvider and every control inside takes that size; a size passed to a control wins. Controls read it with useControlSize.",
  props: sizeProps,
  examples: [
    {
      title: "A dense toolbar",
      description: "Every control inside is sm without saying so.",
      code: [
        '<SizeProvider size="sm">',
        '  <Field aria-label="Search" placeholder="Search" />',
        "  <HardwareButton>Filter</HardwareButton>",
        "</SizeProvider>",
      ].join("\n"),
    },
    {
      title: "A field and its button",
      description: "The same size is the same height.",
      code: ['<Field label="Invite" placeholder="name@example.com" />', "<HardwareButton>Send</HardwareButton>"].join("\n"),
    },
  ],
  feel: "Controls that sit in a row line up, because a size means one height everywhere.",
  usage: {
    imports: 'import { SizeProvider } from "@/echo/size";',
    code: '<SizeProvider size="sm">{toolbar}</SizeProvider>',
  },
  composition: "SizeProvider → context read by every sized control",
  a11y: [
    "Adds no element and no role.",
    "sm is 32px, above the 24px minimum target; on a touch screen sm buttons grow to a 44px target.",
  ],
  antiPatterns: [
    "Never use size for global density: that's the density setting, which scales every step.",
    "Never make the one action a screen is built around sm: give it lg.",
  ],
} as const;
