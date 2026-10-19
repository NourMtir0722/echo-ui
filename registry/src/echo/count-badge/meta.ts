import { z } from "zod";

export const countBadgeProps = z.object({
  count: z.number().describe("The number itself."),
  label: z
    .string()
    .describe('What is counted, e.g. "unread messages". The name becomes "3 unread messages".'),
  max: z.number().default(99).describe("Cap the display; above it renders as `${max}+`."),
  showZero: z.boolean().default(false).describe("Render at zero instead of returning null."),
  variant: z
    .enum(["accent", "neutral"])
    .default("accent")
    .describe("A colour choice, not a status — which is why it is a variant and not a tone."),
});

export const meta = {
  name: "echo-count-badge",
  title: "CountBadge",
  description:
    "A number worth noticing — the lit sibling of Badge. Badge names a state; CountBadge counts a thing. It disappears at zero unless told otherwise, caps its face at max while still announcing the true count, and stays round at one digit.",
  props: countBadgeProps,
  examples: [
    {
      title: "Unread count",
      description: 'Announces as "7 unread messages".',
      code: '<CountBadge count={7} label="unread messages" />',
    },
    {
      title: "Capped",
      description: 'Reads "127 unread messages" while showing "99+".',
      code: '<CountBadge count={127} label="unread messages" />',
    },
    {
      title: "On a control",
      description: "Anchor it yourself; the badge does not position itself.",
      code: '<span style={{ position: "relative" }}>\n  <HardwareButton iconOnly aria-label="Inbox" icon={<Inbox />} />\n  <CountBadge count={3} label="unread messages" />\n</span>',
    },
  ],
  feel: "A small counter pinned to a corner, capped so it never outgrows its spot.",
  usage: {
    imports: "import { CountBadge } from \"@/echo/count-badge\";",
    code: "<CountBadge count={7} label=\"unread messages\" />",
  },
  composition: "CountBadge",
  a11y: [
    "`role=\"status\"`, named by the real count and `label` (“127 unread messages”) even when the face shows “99+”.",
    "Being a status region, a change is announced politely.",
  ],
  antiPatterns: [
    'Never pass a bare number as the label. "3" on its own is meaningless in a screen reader\'s element list — the label is what the number counts, not the number again.',
    "Never use it for a state with no quantity — an on/off or severity marker is a Badge or a StatusDot. A count of one is still a count; a count of \"error\" is not.",
    "Never render it at zero by default. A badge that says 0 draws the eye to nothing happening; that is what showZero is for, and it is rarely the right call.",
    "Never raise max to show a huge exact number in the face — a five-digit badge breaks the pill and the round-at-one-digit geometry. Cap it and let the accessible name carry the truth.",
  ],
} as const;
