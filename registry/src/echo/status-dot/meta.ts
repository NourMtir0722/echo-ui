import { z } from "zod";

export const statusDotProps = z.object({
  on: z.boolean().default(true).describe("Filled, lit socket vs dead, hollow one."),
  label: z
    .string()
    .optional()
    .describe(
      'Accessible name for the state (e.g. "Online"). Required unless `decorative` is set.',
    ),
  decorative: z
    .boolean()
    .optional()
    .describe(
      "Adjacent visible text already states the state, so the dot is hidden from assistive " +
        "tech. Exactly one of `label` or `decorative` is required — a dot that has neither " +
        "signals nothing to anybody.",
    ),
});

export const meta = {
  name: "echo-status-dot",
  title: "StatusDot",
  description:
    "A tiny LED socket, filled and blooming or hollow and dead. State is carried by fill-vs-hollow and by a 5.25:1 luminance step, not by hue, so it survives protan/deuteran/tritan and greyscale. Requires `label` or `decorative`. Consumes var(--echo-*).",
  props: statusDotProps,
  examples: [
    { title: "With text", description: "Adjacent text carries the state, so say so.", code: "<StatusDot on decorative /> Recording" },
    { title: "Standalone", description: "The dot is the only signal.", code: '<StatusDot on={false} label="Offline" />' },
  ],
  feel: "A tiny LED: lit, or dead. It lights and goes dark over a moment, like a lamp, not in a single frame.",
  usage: {
    imports: "import { StatusDot } from \"@/echo/status-dot\";",
    code: "<StatusDot on={false} label=\"Offline\" />",
  },
  composition: "StatusDot",
  a11y: [
    "With `label`, it is `role=\"img\"` named by the label — use that when the dot is the only signal.",
    "With `decorative`, it is hidden from assistive technology — use that when the text next to it already says the state.",
    "One of the two is required; an unlabelled dot warns in development.",
    "On and off differ by shape and brightness, not only by colour.",
  ],
  antiPatterns: [
    "Never encode more than on/off — an LED has two states; for tones use Badge.",
    "Never leave a dot with neither `label` nor `decorative` — that is a state signalled to nobody.",
    "Never restore hue as the only state difference; the fill/hollow step is what survives colour-vision deficiency.",
  ],
} as const;
