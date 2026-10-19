import { z } from "zod";

export const itemProps = z.object({
  title: z.unknown().describe("The row's name. With href or onClick it is also the link or button."),
  description: z.unknown().optional().describe("A line under the title."),
  media: z.unknown().optional().describe("What you recognise it by, at the start: an Avatar, an icon, or one small control (a done Checkbox) that stays its own target."),
  trailing: z.unknown().optional().describe("What trails it: a time, a CountBadge, a Switch."),
  href: z.string().optional().describe("The whole row goes here."),
  onClick: z.function().optional().describe("The whole row does this."),
  swipeActions: z
    .array(z.object({ label: z.string(), onSelect: z.function() }))
    .optional()
    .describe("Actions behind the row: a swipe toward the start reveals them, and so does Tab. Each is a real button."),
  size: z.enum(["sm", "md"]).default("md").describe("sm for dense lists."),
  truncate: z.boolean().default(false).describe("One line each for the title and description, ending in an ellipsis, for a list whose rhythm matters more than every word (file names). Off, the text wraps."),
  as: z.enum(["div", "li"]).default("div").describe("li inside a list (<Stack as=\"ul\">)."),
});

export const meta = {
  name: "echo-item",
  title: "Item",
  description:
    "The row every list is made of: media to recognise it by, a title and a line under it, and what trails it. Consecutive Items are ruled by a hairline. The title and description wrap onto more lines when they need them, so a plan's features read whole; truncate keeps each to one line. href or onClick makes the whole row one target. swipeActions sit behind the row: swipe it toward the start and they slide into view, and Tab reaches each one, sliding the row open the same way.",
  props: itemProps,
  examples: [
    {
      title: "A member list",
      description: "In a list, as li.",
      code: [
        '<Stack as="ul" gap={0}>',
        '  <Item as="li" media={<Avatar name="Ada Lovelace" size="sm" />} title="Ada Lovelace" description="Owner" trailing="2m" />',
        '  <Item as="li" media={<Avatar name="Alan Turing" size="sm" />} title="Alan Turing" description="Editor" />',
        "</Stack>",
      ].join("\n"),
    },
    {
      title: "Swipe to archive",
      description: "A real button behind the row; Tab reaches it too.",
      code: '<Item title="Weekly report" description="From Ada" swipeActions={[{ label: "Archive", onSelect: archive }]} />',
    },
  ],
  feel: "A ruled row that slides aside under your thumb to show what's behind it, and springs back when you let it go short.",
  usage: {
    imports: 'import { Item } from "@/echo/item";\nimport { Switch } from "@/echo/switch";',
    code: '<Item title="Backups" description="Nightly" trailing={<Switch aria-label="Backups" />} />',
  },
  composition: "Item → a surface row (media, text, trailing) over a tray of actions",
  a11y: [
    "Swipe actions are real buttons with their own names; Tab reaches them and focusing one slides the row open, so the gesture is never the only way.",
    "An interactive row is one link or button named by its title.",
    "Trailing controls stay separate targets above the row's link.",
    "Actions carry their meaning in words (\"Delete file\"), never in a colour.",
  ],
  motion: {
    tokens: ["springs"],
    reducedMotion: "The row jumps open or shut instead of sliding.",
  },
  sound: ["`tap` as the row snaps open or shut, and when an action is pressed, inside a SoundProvider."],
  antiPatterns: [
    "Never put the only way to do something in swipeActions without also offering it somewhere else a mouse user will see.",
    "Never colour a destructive swipe action red: say it in the label, and confirm it (ConfirmButton, AlertDialog).",
  ],
} as const;
