import { z } from "zod";

export const linkProps = z.object({
  href: z.string().describe("Where it goes."),
  children: z.unknown().describe("The link text: say where it goes, not \"click here\"."),
  external: z.boolean().default(false).describe("Opens in a new tab and says so, to the eye and to a screen reader."),
  tone: z.enum(["default", "muted"]).default("default").describe("muted for a link among quiet text: dim words, the same underline."),
  render: z.unknown().optional().describe("Your router's link element, e.g. <NextLink href=\"/docs\" />; it gets the href, class and children."),
  onClick: z.function().optional(),
  "aria-current": z.enum(["page", "step", "location", "true"]).optional(),
});

export const meta = {
  name: "echo-link",
  title: "Link",
  description:
    "Inline text that goes somewhere. The words stay in the text colour and the accent is the underline, because accent-coloured text on the chassis is under AA. external opens a new tab and says so; render takes your router's link so navigation stays the router's.",
  props: linkProps,
  examples: [
    {
      title: "In a sentence",
      description: "The words say where it goes.",
      code: '<p>\n  Read the <Link href="/docs/theming">theming guide</Link> first.\n</p>',
    },
    {
      title: "External",
      description: "An arrow for the eye, \"opens in a new tab\" for a screen reader.",
      code: '<Link href="https://base-ui.com" external>Base UI</Link>',
    },
  ],
  feel: "Readable words with the accent drawn under them; reach for it and the underline thickens toward the text.",
  usage: {
    imports: 'import { Link } from "@/echo/link";',
    code: '<Link href="/docs">Docs</Link>',
  },
  composition: "Link → an <a> (or your router's link) with the underline",
  a11y: [
    "A real `<a href>`, so it's announced as a link, opens in a new tab with the browser's own gestures, and shows its URL.",
    "The words keep text contrast; the accent is only the underline, and it's an underline, so a link never depends on colour alone.",
    "`external` adds \"(opens in a new tab)\" for screen readers and `rel=\"noopener noreferrer\"`.",
    "In forced colors it takes the system link colour.",
  ],
  motion: {
    tokens: ["--echo-duration-tick"],
    reducedMotion: "The underline changes without easing.",
  },
  antiPatterns: [
    "Never use a Link for an action that doesn't navigate: that's a button.",
    "Never colour the link text with the accent: it fails contrast on the chassis.",
    "Never write \"click here\": the link text is what a screen reader lists.",
  ],
} as const;
