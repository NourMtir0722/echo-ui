import { z } from "zod";
import { typed } from "../../agent/typed";

export const popoverProps = z.object({
  trigger: typed("ReactNode").optional().describe("What opens the popover. An element becomes the trigger itself; text is wrapped in a plain trigger."),
  title: typed("ReactNode").optional().describe("Heading inside the popover, and its accessible name."),
  side: z.enum(["top", "right", "bottom", "left"]).default("bottom").describe("Which side of its trigger it opens on: bottom (the default), top, left or right."),
  align: z.enum(["start", "center", "end"]).default("center").describe("Where along that side it lines up with the trigger: start, center (the default) or end."),
  sideOffset: z.number().default(8).describe("The gap between the trigger and the panel, in px. Default 8."),
  container: z.unknown().optional().describe("Where the popup mounts; defaults to <body>. Pass an element inside a scoped theme so the popup wears that theme, not the :root one."),
  open: z.boolean().optional().describe("Open, controlled. Leave it out and the trigger opens and closes it."),
  onOpenChange: z.function().optional().describe("Called with true or false as it opens or closes: from its trigger, Escape, a press outside, or a change to `open`."),
  initialFocus: z.unknown().optional().describe("A ref to what takes focus as it opens (a date picker's chosen day). Default: the first thing in it that can take focus."),
  anchor: z.unknown().optional().describe("A ref to what it's placed against: a whole field rather than the key in it. Default: its trigger."),
  "aria-label": z.string().optional().describe("Names the popup when it has no `title`, so a screen reader says what it is and not only \"dialog\"."),
});

export const meta = {
  name: "echo-popover",
  title: "Popover",
  description:
    "Base UI Popover (anchoring, focus, dismiss, a11y) skinned as an Echo panel. Same useGsapPresence bridge as Modal (summon enter, GSAP exit before unmount), sound.select on open.",
  props: popoverProps,
  examples: [
    {
      title: "Basic",
      description: "A trigger with a titled panel.",
      code: '<Popover trigger={<HardwareButton>Info</HardwareButton>} title="Details">\n  <p>Anchored content.</p>\n</Popover>',
    },
    {
      title: "Controlled",
      description: "Close it from inside: pass `open` and `onOpenChange`, and it still animates out.",
      code: '<Popover\n  open={open}\n  onOpenChange={setOpen}\n  trigger={<HardwareButton>Filters</HardwareButton>}\n  title="Filters"\n>\n  <HardwareButton onClick={() => setOpen(false)}>Apply</HardwareButton>\n</Popover>',
    },
  ],
  feel: "A small glass panel anchored to its button, holding more than a tooltip can.",
  usage: {
    imports: [
      "import { HardwareButton } from \"@/echo/hardware-button\";",
      "import { Popover } from \"@/echo/popover\";",
    ].join("\n"),
    code: [
      "<Popover trigger={<HardwareButton>Info</HardwareButton>} title=\"Details\">",
      "  <p>Anchored content.</p>",
      "</Popover>",
    ].join("\n"),
  },
  composition: "Popover",
  a11y: [
    "Base UI Popover: the trigger is a button that toggles a dialog-like popup, named by `title`.",
    "Focus moves into the popup when it opens. Escape or a click outside closes it and returns focus to the trigger.",
    "Unlike a Tooltip it is reachable by touch and can hold interactive content.",
  ],
  motion: {
    tokens: ["summon"],
    reducedMotion: "It fades in and out without moving.",
  },
  sound: [
    "`select` when it opens.",
  ],
  antiPatterns: [
    "Do not add a CSS transition to the popup — GSAP owns its transform/opacity.",
    "Do not use a Popover where a Tooltip fits (hover hints) — Popover takes focus and traps dismissal.",
    "The package is `@base-ui/react`, not `@base-ui-components/react`.",
  ],
} as const;
