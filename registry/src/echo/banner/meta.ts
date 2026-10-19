import { z } from "zod";

export const bannerProps = z.object({
  title: z.string().describe("The condition, stated plainly."),
  children: z.string().optional().describe("Supporting detail."),
  tone: z
    .enum(["info", "active", "warn", "danger"])
    .default("info")
    .describe("Echo's one status vocabulary: info, active (happening now), warn, danger."),
  icon: z.string().optional().describe("Leading icon. Decorative — the title carries meaning."),
  tag: z
    .union([z.string(), z.literal(false)])
    .optional()
    .describe("The LCD tag on the right. Defaults to the tone in words; false hides it."),
  onDismiss: z.function().optional().describe("Render a dismiss control."),
  dismissLabel: z.string().optional().describe("Name of the dismiss button. Defaults to \"Dismiss\" plus the title."),
  live: z
    .boolean()
    .default(false)
    .describe("Announce when the banner appears dynamically. danger becomes an alert."),
});

export const meta = {
  name: "echo-banner",
  title: "Banner",
  description:
    "A persistent inline message strip. Toast is transient and reports what just happened; Banner stays and describes a condition still true. Built as a piece of the device: a molded strip, a status LED in a recessed well, and an LCD tag that names the tone. Severity is carried by the LED's shape and the tag's words rather than by red/amber/green — Echo has one accent, and inventing hues the seed does not own would break on a reseed.",
  props: bannerProps,
  examples: [
    {
      title: "Standing condition",
      description: "Rendered with the page — ordinary content, no live region.",
      code: '<Banner title="Offline mode" tone="warn">Changes sync when the device reconnects.</Banner>',
    },
    {
      title: "Appeared in response",
      description: "live makes danger an alert and everything else a polite status.",
      code: '<Banner live tone="danger" title="Upload failed" onDismiss={retry}>The file exceeds the size limit.</Banner>',
    },
  ],
  feel: "A molded strip with an LED in a recessed well and an LCD tag that names the tone.",
  usage: {
    imports: "import { Banner } from \"@/echo/banner\";",
    code: [
      "<Banner title=\"Offline mode\" tone=\"warn\">",
      "  Changes sync when the device reconnects.",
      "</Banner>",
    ].join("\n"),
  },
  composition: "Banner",
  a11y: [
    "Silent by default. `live` makes it a live region: `role=\"alert\"` for `tone=\"danger\"`, `role=\"status\"` for the rest.",
    "Only set `live` on a banner that appears in response to something; one that is on the page from the start should not announce.",
    "The tone is spelled out in the LCD tag (Info, Live, Warn, Error), not carried by colour alone.",
    "With `onDismiss`, a close button appears, named “Dismiss” plus the title (“Dismiss Offline mode”) unless you pass `dismissLabel`.",
    "Keyboard: Tab reaches the dismiss button; Enter or Space dismisses the banner.",
  ],
  motion: {
    tokens: ["--echo-duration-tick"],
    reducedMotion: "The dismiss button's hover change is instant.",
  },
  antiPatterns: [
    "Never set live on a banner that renders with the page. Announcing it on load interrupts the reader for something they were going to reach anyway; live is for banners that APPEAR.",
    "Never use a Banner for something that just happened and is already over — that is a Toast. A banner describes a condition that is still true.",
    'Never rely on tone alone to convey severity. The strip reads as "more urgent" by luminance, which is not a message; say the severity in the title.',
    "Never stack more than one or two banners. Three standing conditions at once means the screen has a structural problem that a fourth banner will not fix.",
  ],
} as const;
