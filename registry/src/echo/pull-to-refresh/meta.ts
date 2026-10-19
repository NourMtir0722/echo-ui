import { z } from "zod";

export const pullToRefreshProps = z.object({
  onRefresh: z.function().describe("Reload. The list holds at the detent, with the Loader's lights, until the promise settles."),
  children: z.unknown().describe("The scrolling content: usually a list of Items."),
  label: z.string().default("list").describe('What is refreshed, for the button and the status: "tasks" gives "Refresh tasks" and "Tasks up to date".'),
  threshold: z.number().default(64).describe("How far to pull, in px, before letting go refreshes."),
  disabled: z.boolean().default(false).describe("Turn the gesture off. The Refresh button still works."),
  className: z.string().optional().describe("A class on the scroller."),
});

export const meta = {
  name: "echo-pull-to-refresh",
  title: "PullToRefresh",
  description:
    "A scrolling list you pull down from the top to reload: the content follows your finger with a rubber band, a molded key turns as you pull and clicks at the detent, and the list holds there with the Loader's lights until onRefresh settles. A real Refresh button and one status make it work without the gesture.",
  props: pullToRefreshProps,
  examples: [
    {
      title: "A list that reloads",
      description: "Give it the height to scroll in; it holds at the detent until your promise settles.",
      code: [
        '<div style={{ height: 480 }}>',
        '  <PullToRefresh label="tasks" onRefresh={() => refetch()}>',
        '    <Stack as="ul" gap={0}>{items}</Stack>',
        "  </PullToRefresh>",
        "</div>",
      ].join("\n"),
    },
  ],
  feel: "The top of the list is on a spring: pull it and it stretches, a key rises in the gap and clicks when you've pulled far enough, and it holds there, lit, until the new rows land.",
  usage: {
    imports: 'import { PullToRefresh } from "@/echo/pull-to-refresh";',
    code: '<PullToRefresh label="tasks" onRefresh={refetch}>{list}</PullToRefresh>',
  },
  composition: "PullToRefresh (the scroll region)\n  Refresh button (shown on focus)\n  status\n  indicator key → Loader while refreshing\n  your content",
  a11y: [
    "The pull is a gesture, so it is never the only way: the region's first tab stop is a real \"Refresh {label}\" button, visually hidden until it has keyboard focus.",
    "One status, on the page from the start, says \"Refreshing tasks…\" and then \"Tasks up to date\"; the indicator itself is decoration.",
    "Only a downward pull from the very top counts; a sideways drag (a row's swipe actions) or an upward one (a scroll) is left alone.",
    "A pull that ends over a row doesn't click the row.",
  ],
  motion: {
    tokens: [],
    reducedMotion: "The content still follows the finger (that is the gesture), but it jumps home and to the detent instead of springing.",
  },
  sound: ["`select` as the pull passes the detent, `notify` when the refresh finishes, inside a SoundProvider."],
  antiPatterns: [
    "Do not make pull-to-refresh the only way to reload. The component has the button; don't hide it with CSS.",
    "Do not put it around a page that already scrolls: it is the scroller, so give it a height (a flex child, a fixed-height app body).",
    "Do not refresh on a timer and also ask people to pull. Pick one: a pull that does nothing new teaches people it is broken.",
  ],
} as const;
