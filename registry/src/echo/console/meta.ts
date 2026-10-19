import { z } from "zod";

export const consoleScreenProps = z.object({
  embedded: z
    .boolean()
    .default(false)
    .describe("This screen is inside another page: the title drops to <h2> and AppShell drops its landmarks, so the page keeps one <h1> and one <main>."),
  product: z.string().default("ECHO ONE").describe("Name on the rail and the plate."),
  takes: z
    .array(z.object({ id: z.string(), name: z.string(), length: z.string(), peak: z.string() }))
    .optional()
    .describe("Table rows. Defaults to a demo session."),
  levels: z.array(z.number()).optional().describe("Level history, oldest first, on a fixed 0..100 scale."),
  channels: z.array(z.string()).optional().describe("Channels down the left rail."),
});

export const meta = {
  name: "echo-console",
  title: "Console screen",
  description:
    "A device dashboard as a front panel: AppShell, six StatTile readouts, an LED level matrix in a Panel, status lights, a takes Table and Pagination. Proves density and data at scale — whether the material language still holds when nothing on the screen has room.",
  props: consoleScreenProps,
  examples: [
    {
      title: "With your own data",
      description: "Every list is a prop; the screen owns only which channel and page are selected.",
      code: "<ConsoleScreen product=\"STUDIO A\" takes={takes} levels={levels} channels={channels} />",
    },
  ],
  feel: "A dense front panel: six readouts, a meter, a channel list — and the material still holds when nothing has room.",
  usage: {
    imports: "import { ConsoleScreen } from \"@/echo/console\";",
    code: "<ConsoleScreen product=\"STUDIO A\" takes={takes} levels={levels} channels={channels} />",
  },
  composition: "ConsoleScreen\n  AppShell\n  EngravedPlate\n  StatusDot\n  Segmented\n  Panel\n  StatTile\n  LcdChip\n  Chart\n  Table\n  Badge\n  Menu\n  Pagination",
  a11y: [
    "Built on AppShell, so it gets its landmarks and skip link.",
    "The selected channel carries `aria-current`, not only a lit rail.",
    "The readouts are named groups and the chart is an image with a spoken summary; the takes are a real table.",
    "The screen owns the page's `<h1>`. Inside another page, pass `embedded`: headings drop a level and AppShell drops its landmarks.",
  ],
  antiPatterns: [
    "Do not embed this screen in another page without `embedded`. It owns the page's <h1>, so a preview or a marketing page that renders it ends up with two first-level headings, and a screen-reader user's outline of the page stops making sense.",
    "Do not let the level matrix rescale itself. Without a fixed `max` the ceiling is the largest value present, so a new peak silently shrinks all the history behind it — the one thing a live readout must not do.",
    "Do not report a take's state with the badge colour alone. The badge carries the word; colour alone is lost on anyone with a colour-vision deficiency, on a screen reader, and in greyscale.",
    "Do not put the session's destructive actions in the rail menu without a confirm. A menu item fires on the first click — send anything that discards a take through an AlertDialog.",
    "Do not add axes and tooltips to the Chart to make this feel more like a dashboard. It is a device readout; the moment it needs hit-testing, the screen wants a real charting library beside it, not a heavier Chart.",
  ],
} as const;
