import { z } from "zod";

export const avatarProps = z.object({
  src: z.string().optional().describe("Image URL. Omit to render initials."),
  name: z.string().describe("Who or what this is; also the accessible name."),
  size: z
    .enum(["xs", "sm", "md", "lg", "xl"])
    .default("md")
    .describe("xs inline with text (a mention, a byline), sm in lists and table rows, md the default, lg a card header, xl a profile header."),
  initials: z.string().optional().describe("Override the derived initials, e.g. a device code."),
  status: z
    .enum(["live", "idle"])
    .optional()
    .describe("Presence LED in the rim: live is lit, idle is an empty socket. Appended to the accessible name."),
  statusLabel: z.string().optional().describe("Override the words announced for status."),
});

export const meta = {
  name: "echo-avatar",
  title: "Avatar",
  description:
    "A person or device as a molded disc — the image seated in a well, or initials engraved into the plastic when there is no image or the image fails to load. The failure case is the whole point: a bare <img> with a broken URL leaves a hole, this falls back.",
  props: avatarProps,
  examples: [
    {
      title: "With an image",
      description: "name still required — it is the accessible name and the fallback source.",
      code: '<Avatar src="/ada.jpg" name="Ada Lovelace" />',
    },
    {
      title: "Initials only",
      description: "Derived from the first and last words.",
      code: '<Avatar name="Ada Lovelace" size="lg" />',
    },
    {
      title: "Presence",
      description: "A lit LED in the rim. Fill-vs-hollow carries the state, so it never rests on colour.",
      code: '<Avatar name="Ada Lovelace" status="live" />',
    },
    {
      title: "Device",
      description: "Override initials when the name is not a person.",
      code: '<Avatar name="Echo One, studio unit" initials="E1" />',
    },
  ],
  feel: "A round inset portrait, or initials on molded plastic, with an optional presence LED that lights and goes dark over a moment.",
  usage: {
    imports: "import { Avatar } from \"@/echo/avatar\";",
    code: "<Avatar src=\"/ada.jpg\" name=\"Ada Lovelace\" />",
  },
  composition: "Avatar",
  a11y: [
    "`role=\"img\"` named by `name` — with the status added (“Ada Lovelace, online”) when `status` is set.",
    "The image and initials inside are `aria-hidden`, so the name is read once.",
    "Presence is shown filled or hollow, not only by colour.",
  ],
  antiPatterns: [
    "Never omit name to make it decorative — an avatar identifies someone, and an unnamed one is a hole in the a11y tree. If it is truly decorative, do not render an avatar.",
    "Never put the name in an adjacent <img alt> as well; the inner image is alt=\"\" on purpose so the wrapper's label is announced once, not twice.",
    "Never use status for anything but presence. A lit LED on a person means they are there — not that they are selected, an admin, or new.",
    "Never stack avatars into an overlapping row without giving the group its own label and count — a pile of individually-named discs reads as noise.",
  ],
} as const;
