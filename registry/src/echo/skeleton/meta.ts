import { z } from "zod";

export const skeletonProps = z.object({
  variant: z.enum(["text", "block", "circle"]).default("text").describe("text (the default) is lines of text, the last one short; block is a rectangle, for an image or a card; circle is a round stand-in, for an avatar."),
  width: z.union([z.string(), z.number()]).optional().describe("CSS width; numbers are px."),
  height: z.union([z.string(), z.number()]).optional().describe("CSS height; numbers are px."),
  lines: z.number().default(1).describe("Text lines; the last renders short."),
  label: z
    .string()
    .optional()
    .describe("Announce the wait. Pass ONCE per loading region, on the outermost skeleton."),
});

export const meta = {
  name: "echo-skeleton",
  title: "Skeleton",
  description:
    "The shape of content that has not arrived: a recess in the chassis with a slow sheen crossing it. Every skeleton is aria-hidden by default — the wait is announced once, by the region that owns it, via the label prop. Reduced motion holds the sheen still rather than looping forever.",
  props: skeletonProps,
  examples: [
    {
      title: "A paragraph",
      description: "The last line renders short, the way real text ends.",
      code: '<Skeleton lines={3} label="Loading article" />',
    },
    {
      title: "A media block",
      description: "Match the real element's box so nothing jumps on arrival.",
      code: '<Skeleton variant="block" height={180} />',
    },
    {
      title: "An avatar row",
      description: "One label on the region; the rest stay silent.",
      code: '<div role="status" aria-busy aria-label="Loading people">\n  <Skeleton variant="circle" height={36} />\n  <Skeleton width={140} />\n</div>',
    },
  ],
  feel: "The shape of what is coming, with a slow sheen passing over it.",
  usage: {
    imports: "import { Skeleton } from \"@/echo/skeleton\";",
    code: "<Skeleton lines={3} label=\"Loading article\" />",
  },
  composition: "Skeleton",
  a11y: [
    "With `label`, it is `role=\"status\"` with `aria-busy`, and announces what is loading.",
    "Without a label its shapes are `aria-hidden`: use that when something else already says the region is loading.",
  ],
  motion: {
    tokens: [],
    reducedMotion: "The sheen stops; the shapes hold at a steady tone.",
  },
  antiPatterns: [
    "Never label every skeleton. A dozen boxes each announcing \"Loading\" is unusable; one busy region owns the wait and the rest are decoration.",
    "Never let a skeleton outlive its request. A skeleton that never resolves reads as a broken layout, not as pending — show an EmptyState or a Banner when the fetch fails.",
    "Never draw a skeleton in a shape the real content will not take. The entire value is that nothing moves when the data lands; a wrong-sized placeholder is worse than a spinner.",
    "Never use a skeleton for an action's progress — that is Loader or Progress. Skeletons stand in for CONTENT, not for work.",
  ],
} as const;
