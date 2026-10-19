import { z } from "zod";
import { typed } from "../../agent/typed";

export const tooltipProps = z.object({
  trigger: typed("ReactNode").optional().describe("The element the tooltip describes. An element becomes the trigger itself, so it keeps its own role and name."),
  side: z.enum(["top", "right", "bottom", "left"]).default("top").describe("Which side of its trigger it shows on: top (the default), bottom, left or right."),
  sideOffset: z.number().default(8).describe("The gap between the trigger and the label, in px. Default 8."),
  delay: z.number().default(400).describe("How long a pointer rests on the trigger before it shows, in ms. Default 400."),
  container: z.unknown().optional().describe("Where the popup mounts; defaults to <body>. Pass an element inside a scoped theme so the popup wears that theme, not the :root one."),
});

export const meta = {
  name: "echo-tooltip",
  title: "Tooltip",
  description:
    "Base UI Tooltip (hover/focus, delay, a11y) skinned as a compact molded chip. Same useGsapPresence bridge as Modal/Popover; no sound.",
  props: tooltipProps,
  examples: [
    {
      title: "Hint",
      description: "Wrap any focusable trigger.",
      code: '<Tooltip trigger={<HardwareButton iconOnly aria-label="Record" icon={<RecIcon />} />}>Record</Tooltip>',
    },
  ],
  feel: "A quiet label that appears after a moment of hovering, and never makes a sound.",
  usage: {
    imports: [
      "import { HardwareButton } from \"@/echo/hardware-button\";",
      "import { Tooltip } from \"@/echo/tooltip\";",
    ].join("\n"),
    code: [
      "<Tooltip trigger={<HardwareButton>Record</HardwareButton>}>",
      "  Start a new take",
      "</Tooltip>",
    ].join("\n"),
  },
  composition: "Tooltip",
  a11y: [
    "Base UI Tooltip: shown on hover after `delay` (400ms by default) and on keyboard focus; Escape hides it.",
    "It describes its trigger — it never replaces the trigger's own name. An icon-only button still needs its `aria-label`.",
    "Touch has no hover: never put the only copy of important information in a tooltip.",
  ],
  motion: {
    tokens: ["summon"],
    reducedMotion: "It fades in and out without moving.",
  },
  antiPatterns: [
    "Never put essential or interactive content in a Tooltip — it is hover/focus-transient and not reachable by touch.",
    "Do not add sound to tooltips; they fire constantly.",
    "The package is `@base-ui/react`, not `@base-ui-components/react`.",
  ],
} as const;
