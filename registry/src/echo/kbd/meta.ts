import { z } from "zod";

export const kbdProps = z.object({
  children: z.unknown().describe("The key legend — one key per cap, so ⌘ and K are two Kbds, not one."),
});

export const meta = {
  name: "echo-kbd",
  title: "Kbd",
  description: "A molded keycap for keyboard hints — a tiny cap that never presses. Uses the <kbd> element.",
  props: kbdProps,
  examples: [
    { title: "Shortcut", description: "Show a key.", code: "<Kbd>⌘</Kbd> <Kbd>K</Kbd>" },
  ],
  feel: "A tiny keycap that shows which key to reach for, and goes down when that key does on your keyboard.",
  usage: {
    imports: "import { Kbd } from \"@/echo/kbd\";",
    code: "<Kbd>⌘</Kbd> <Kbd>K</Kbd>",
  },
  composition: "Kbd",
  a11y: [
    "A native `<kbd>` element.",
    "Symbols like ⌘ and ⌥ are read inconsistently by screen readers; where it matters, say the shortcut in words nearby too.",
  ],
  antiPatterns: ["Do not use Kbd for interactive buttons — it is a label; use HardwareButton for actions."],
} as const;
