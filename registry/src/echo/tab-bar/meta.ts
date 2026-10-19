import { z } from "zod";

export const tabBarProps = z.object({
  label: z.string().describe("Names the navigation landmark."),
  items: z
    .array(z.object({ label: z.string(), href: z.string(), icon: z.unknown(), badge: z.number().optional() }))
    .describe("Four or five destinations: a label, an href, an icon, a count."),
  current: z.string().optional().describe("The href of the page you're on."),
  fixed: z.boolean().default(true).describe("Pinned to the bottom of the viewport, or in the flow."),
  renderLink: z.function().optional().describe("Render each link through your router."),
});

export const meta = {
  name: "echo-tab-bar",
  title: "TabBar",
  description:
    "A phone app's bottom navigation as a dock: a molded slab floating clear of the screen's edges, a recessed track along it, and one raised cap seated under the destination you're on. Every destination has an LED socket; the current one's is lit, and its icon with it. Go somewhere else and the cap lifts, travels there on a spring and settles back in. A count on any with news, clear of the home indicator. Four or five destinations; more belong in SideNav.",
  props: tabBarProps,
  examples: [
    {
      title: "Four destinations",
      description: "The current one is lit.",
      code: '<TabBar label="Main" current="/today" items={[\n  { label: "Today", href: "/today", icon: <PlayIcon /> },\n  { label: "Library", href: "/library", icon: <PlayIcon /> },\n  { label: "Inbox", href: "/inbox", icon: <PlayIcon />, badge: 2 },\n  { label: "You", href: "/you", icon: <PlayIcon /> },\n]} />',
    },
  ],
  feel: "A dock under the thumb: the cap you're sitting in lifts out of its track and slides to where you go.",
  usage: {
    imports: 'import { TabBar } from "@/echo/tab-bar";',
    code: '<TabBar label="Main" items={items} current={pathname} />',
  },
  composition: "TabBar → a nav landmark with a list of links",
  a11y: [
    "A `nav` landmark named by `label`; the current link has `aria-current=\"page\"`.",
    "Each destination is a link at least 56px tall, labelled by its words (the icon is decoration).",
    "A count is read as \"2 new\".",
    "Pinned to the bottom, it keeps clear of the home indicator (the safe-area inset, which a phone reports once the page's viewport meta has `viewport-fit=cover`).",
  ],
  motion: {
    tokens: ["springs", "--echo-duration-swap"],
    reducedMotion: "The cap moves straight to the new place, with no lift or travel, and a pressed link doesn't sink.",
  },
  sound: ["`tap` on a destination, inside a SoundProvider."],
  antiPatterns: [
    "Never put more than five destinations in a TabBar.",
    "Never use icons without labels: a row of icons is a guessing game.",
    "Never put actions in it (a compose button): that's a floating HardwareButton, not a place.",
  ],
} as const;
