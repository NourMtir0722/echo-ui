import { z } from "zod";

const item: z.ZodType<unknown> = z.lazy(() =>
  z.object({
    label: z.string(),
    href: z.string().optional(),
    icon: z.unknown().optional(),
    badge: z.number().optional(),
    items: z.array(item).optional(),
  }),
);

export const sideNavProps = z.object({
  label: z.string().describe('Names the navigation landmark ("Main", "Workspace").'),
  groups: z
    .array(z.object({ label: z.string().optional(), items: z.array(item) }))
    .describe("Groups of items: each a label, an href, an icon, a badge count, or nested items that fold open."),
  current: z.string().optional().describe("The href of the page you're on: it gets aria-current and the rail."),
  collapsed: z.boolean().default(false).describe("Folded to its icons; labels show as tips on hover or focus."),
  onNavigate: z.function().optional().describe("Called after a link is followed (close a mobile sheet here)."),
  renderLink: z.function().optional().describe("Render each link through your router: (props) => <NextLink {...props} />."),
});

export const meta = {
  name: "echo-side-nav",
  title: "SideNav",
  description:
    "The navigation down the side of an app: groups under machine-voice headings, items with an icon and a count, nested items that fold away (and open by themselves around the current page), and one lit rail that travels to where you are as a drop. collapsed folds it to its icons. Closed and data-driven; renderLink hands links to your router.",
  props: sideNavProps,
  examples: [
    {
      title: "An app's sidebar",
      description: "Groups, icons, counts and a nested section.",
      code: [
        "<SideNav",
        '  label="Main"',
        '  current="/inbox"',
        "  groups={[",
        '    { items: [{ label: "Inbox", href: "/inbox", badge: 3 }, { label: "Drafts", href: "/drafts" }] },',
        '    { label: "Projects", items: [{ label: "Echo", items: [{ label: "Board", href: "/echo/board" }, { label: "Docs", href: "/echo/docs" }] }] },',
        "  ]}",
        "/>",
      ].join("\n"),
    },
  ],
  feel: "A column of quiet links with one light down its edge; move and the light runs to where you went.",
  usage: {
    imports: 'import { SideNav } from "@/echo/side-nav";',
    code: '<SideNav label="Main" groups={groups} current={pathname} />',
  },
  composition: "SideNav → a nav landmark of grouped lists, nested groups as Collapsibles, one travelling rail",
  a11y: [
    "A `nav` landmark named by `label`; each group is a list named by its heading.",
    "The current link has `aria-current=\"page\"`; the rail is decoration.",
    "A nested group is a button with `aria-expanded`; it opens by itself when it holds the current page.",
    "Folded, every link keeps its name; the tip shows it on hover and on keyboard focus.",
    "A badge is read as \"3 new\".",
  ],
  motion: {
    tokens: ["--echo-duration-pop", "--echo-ease-pop"],
    reducedMotion: "The rail jumps to the current link; folding and opening are instant.",
  },
  sound: ["`tap` when a link is followed, inside a SoundProvider."],
  antiPatterns: [
    "Never nest more than two levels: past that it's a Tree, not navigation.",
    "Never put actions (buttons that don't navigate) in the list; they belong in a toolbar or the page.",
  ],
} as const;
