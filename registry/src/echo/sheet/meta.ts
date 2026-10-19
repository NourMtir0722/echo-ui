import { z } from "zod";

/**
 * Only what ECHO adds. Open state, modality, snap points and the swipe
 * mechanics are Base UI's Drawer unchanged.
 */
export const sheetProps = z.object({
  side: z
    .enum(["left", "right", "top", "bottom"])
    .default("right")
    .describe(
      "Edge the sheet is pinned to AND the direction it swipes away — one decision, so they cannot drift apart.",
    ),
  "Content.title": z
    .unknown()
    .describe("Accessible name for the panel. A drawer without one is an unlabelled region."),
  "Content.description": z.unknown().describe("What the panel is for, under the title."),
  "Content.showClose": z.boolean().default(true).describe("Show the corner close control."),
  "Content.container": z.unknown().optional().describe("Where the panel mounts; defaults to <body>. Pass an element inside a scoped theme so the panel wears that theme, not the :root one."),
});

export const meta = {
  name: "echo-sheet",
  title: "Sheet",
  description:
    "A molded chassis panel that slides in from an edge — the console side panel and the mobile nav. Built on Base UI's Drawer, so it carries swipe-to-dismiss and a backdrop that tracks the swipe rather than a Dialog translated sideways. sound.transition on open. Compound API.",
  props: sheetProps,
  examples: [
    {
      title: "Side panel",
      description: "Defaults to the right edge, swiping right to dismiss.",
      code: [
        "<Sheet>",
        "  <Sheet.Trigger>Channels</Sheet.Trigger>",
        '  <Sheet.Content title="Channels" description="Pick an input to monitor.">',
        "    …",
        "  </Sheet.Content>",
        "</Sheet>",
      ].join("\n"),
    },
    {
      title: "Mobile nav",
      description: "From the left, where a hamburger button lives.",
      code: [
        '<Sheet side="left">',
        "  <Sheet.Trigger>Menu</Sheet.Trigger>",
        '  <Sheet.Content title="Navigate">…</Sheet.Content>',
        "</Sheet>",
      ].join("\n"),
    },
    {
      title: "Bottom sheet",
      description: "Swipes down. Good for a one-handed action list on a phone.",
      code: '<Sheet side="bottom"><Sheet.Content title="Export">…</Sheet.Content></Sheet>',
    },
  ],
  feel: "A panel that slides in from the edge and can be swiped back out. Its trigger, close key and actions press like the library's keys.",
  usage: {
    imports: "import { Sheet } from \"@/echo/sheet\";",
    code: [
      "<Sheet>",
      "  <Sheet.Trigger>Channels</Sheet.Trigger>",
      "  <Sheet.Content title=\"Channels\" description=\"Pick an input to monitor.\">",
      "    …",
      "  </Sheet.Content>",
      "</Sheet>",
    ].join("\n"),
  },
  composition: "Sheet\n  Sheet.Trigger\n  Sheet.Content\n    Sheet.Close",
  a11y: [
    "Base UI Drawer: a modal dialog named by `title` and described by `description`.",
    "Focus is trapped inside while open and returns to the trigger when it closes. Escape or a click on the backdrop closes it.",
    "Swiping it away is a touch extra; every way of closing it also works from the keyboard.",
  ],
  motion: {
    tokens: ["--echo-duration-pop"],
    reducedMotion: "The panel and backdrop fade instead of sliding, and its keys do not travel when pressed.",
  },
  sound: [
    "`transition` when it opens.",
  ],
  antiPatterns: [
    "Always pass a title. Without one the panel is an unlabelled region, and a screen-reader user is dropped into content with no idea what opened.",
    "Do not put a form that needs a confirm-or-cancel decision in a Sheet — a sheet can be swiped away mid-edit by design. That is a Modal, which cannot.",
    "Do not stack sheets. A second sheet over the first leaves no way back except dismissing both, and the swipe gesture becomes ambiguous.",
    "Do not use a Sheet where a Popover would do. A sheet takes the whole edge of the screen and a backdrop; a small anchored panel does not need either.",
  ],
} as const;
