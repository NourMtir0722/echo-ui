import { z } from "zod";

export const breadcrumbProps = z.object({
  items: z
    .array(z.object({ label: z.string(), href: z.string().optional() }))
    .describe("The trail, root first. The last item is the current page and needs no href."),
  label: z.string().default("Breadcrumb").describe("Name for the nav landmark."),
  separator: z.string().default("/").describe("Separator glyph. Decorative."),
});

export const meta = {
  name: "echo-breadcrumb",
  title: "Breadcrumb",
  description:
    "Where you are in the hierarchy, as an engraved trail. A labelled nav around an ordered list; the last item is the current page, so it is not a link and carries aria-current. Separators are hidden from assistive tech — the list structure is the real separator.",
  props: breadcrumbProps,
  examples: [
    {
      title: "A path",
      description: "Root first; the last entry needs no href.",
      code: '<Breadcrumb items={[\n  { label: "Home", href: "/" },\n  { label: "Device", href: "/device" },\n  { label: "Settings" },\n]} />',
    },
    {
      title: "Custom separator",
      description: "Purely visual; it never reaches the a11y tree.",
      code: '<Breadcrumb separator="›" items={items} />',
    },
  ],
  feel: "A trail of engraved labels back up the hierarchy.",
  usage: {
    imports: "import { Breadcrumb } from \"@/echo/breadcrumb\";",
    code: [
      "<Breadcrumb",
      "  items={[",
      "    { label: \"Home\", href: \"/\" },",
      "    { label: \"Device\", href: \"/device\" },",
      "    { label: \"Settings\" },",
      "  ]}",
      "/>",
    ].join("\n"),
  },
  composition: "Breadcrumb",
  a11y: [
    "A `<nav>` named “Breadcrumb” around an ordered list, so position is announced (“2 of 3”).",
    "The last item is the current page: plain text with `aria-current=\"page\"`, not a link.",
    "Separators are `aria-hidden`; the list carries the structure.",
  ],
  motion: {
    tokens: ["--echo-duration-tick"],
    reducedMotion: "Link hover changes colour without a transition.",
  },
  antiPatterns: [
    "Never link the last item to the current page. A link back to where you already are is a dead control, which is why the last entry renders as text with aria-current.",
    "Never use a breadcrumb for steps in a flow — a trail describes WHERE you are in a hierarchy, not HOW FAR you are through a sequence. That is Steps.",
    "Never truncate the middle of the trail with a bare ellipsis span. If a path is too long, collapse it into a control that can actually expand it; a dead ellipsis loses the path with no way back.",
    "Never rely on the separator to convey structure — it is aria-hidden, and it should be. The ordered list carries the meaning.",
  ],
} as const;
