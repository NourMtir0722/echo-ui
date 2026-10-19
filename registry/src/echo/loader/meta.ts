import { z } from "zod";

export const loaderProps = z.object({
  dot: z.number().positive().default(9).describe("Dot diameter in px."),
  label: z.string().default("Loading").describe("Accessible status text."),
});

export const meta = {
  name: "echo-loader",
  title: "Loader",
  description:
    "Three accent LEDs breathing in sequence — the device thinking. role=status; reduced motion holds the dots steady. Consumes var(--echo-*).",
  props: loaderProps,
  examples: [
    { title: "Default", description: "Inline loading indicator.", code: "<Loader />" },
    { title: "Small", description: "Fits inside a button or chip.", code: '<Loader dot={6} label="Saving" />' },
  ],
  feel: "Three dots pulsing in turn — the device is thinking.",
  usage: {
    imports: "import { Loader } from \"@/echo/loader\";",
    code: "<Loader label=\"Saving\" />",
  },
  composition: "Loader",
  a11y: [
    "`role=\"status\"` named by `label`, so it is announced when it appears.",
    "Remove it as soon as the work is done — it is announced when it appears, and a loader left on screen says the wait is still going."
  ],
  motion: {
    tokens: [],
    reducedMotion: "The dots stop pulsing and hold at a steady glow.",
  },
  antiPatterns: [
    "Never spin it — Echo has no spinners; the device pulses, it doesn't rotate.",
    "Never stack Loader with skeletons in the same region; pick one loading voice per surface.",
  ],
} as const;
