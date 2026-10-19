import { z } from "zod";

export const shortcutMapProps = z.object({
  shortcuts: z
    .array(z.object({ keys: z.array(z.string()), label: z.string() }))
    .describe('Each shortcut: its keys in the order they\'re held (["Cmd", "K"]) and what it does.'),
  label: z.string().default("Keyboard shortcuts").describe("The list's accessible name."),
  board: z.boolean().default(true).describe("Draw the keyboard over the list."),
});

export const meta = {
  name: "echo-shortcut-map",
  title: "ShortcutMap",
  description:
    "The \"Keyboard shortcuts\" sheet a desktop app opens with ?: the list of what each shortcut does, and above it the keyboard drawn in Kbd caps. Point at a shortcut and its keys light on the board; press keys on your own keyboard and the drawn ones go down with them. The list is the content; the board is a picture of it.",
  props: shortcutMapProps,
  examples: [
    {
      title: "What ? opens",
      description: "The board over the list; put it in a Sheet or a Modal.",
      code: '<ShortcutMap\n  shortcuts={[\n    { keys: ["Cmd", "K"], label: "Search everything" },\n    { keys: ["C"], label: "New issue" },\n    { keys: ["?"], label: "Show shortcuts" },\n  ]}\n/>',
    },
    {
      title: "The list alone",
      description: "Without the board, for a narrow panel.",
      code: '<ShortcutMap board={false} shortcuts={[{ keys: ["Cmd", "Enter"], label: "Send" }]} />',
    },
  ],
  feel: "A keyboard printed on the back of the manual, lighting up as you read.",
  usage: {
    imports: 'import { ShortcutMap } from "@/echo/shortcut-map";',
    code: '<ShortcutMap shortcuts={[{ keys: ["Cmd", "K"], label: "Search" }]} />',
  },
  composition: "ShortcutMap\n  the board: rows of Kbd caps\n  the list: each shortcut's Kbd keys and what it does",
  a11y: [
    "The list is a named list; each item reads its keys and then what they do.",
    "The drawn keyboard is hidden from assistive technology: everything on it is in the list.",
    "Lighting a shortcut's keys is a pointer extra; nothing is only on the board.",
    "Keys people write as Cmd, Command or Meta all find ⌘; Ctrl, Alt or Option, Shift and Enter find theirs.",
    "Too narrow for a keyboard (a phone, or very large text), the board goes and the list stands alone.",
  ],
  antiPatterns: [
    "Never make the board the only place a shortcut is written: the list is the content.",
    "Never list shortcuts that don't work where the sheet opens: show the ones for this screen.",
  ],
} as const;
