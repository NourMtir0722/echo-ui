import { z } from "zod";

export const budOffProps = z.object({
  onArrive: z.function().optional().describe("When the drop lands: update what it landed in here."),
  size: z.number().optional().describe("The drop's radius, px. Defaults to 10."),
});

export const meta = {
  name: "echo-bud-off",
  title: "useBudOff",
  description:
    "A drop of the primary plastic buds out of one element, flies to another and is swallowed by it, which swells as it lands — so the eye follows cause to effect. Its front leads and its tail lags, so it draws out on its own. Returns a function, budOff(from, to, options): from is the element the drop buds out of, to the one it lands in, and the options are below. budOff returns a function that calls the drop off before it lands: it's gone and onArrive never runs, for when what it was flying to is reset first.",
  props: budOffProps,
  examples: [
    {
      title: "Into a count",
      description: "Show the new number when the drop gets there.",
      code: [
        "const budOff = useBudOff();",
        "budOff(button, badge, { onArrive: () => setShown((n: number) => n + 1) });",
      ].join("\n"),
    },
    {
      title: "Call it off",
      description: "Reset before the drop lands, and it never arrives.",
      code: [
        "const cancel = budOff(button, badge, { onArrive: () => setShown((n: number) => n + 1) });",
        "// …the count is reset while it flies:",
        "cancel();",
      ].join("\n"),
    },
  ],
  feel: "Something leaves the thing you pressed and lands where it counts.",
  usage: {
    imports: 'import { useBudOff } from "@/echo/bud-off";',
    code: [
      "const budOff = useBudOff();",
      "const send = (e: React.MouseEvent<HTMLButtonElement>) =>",
      "  budOff(e.currentTarget, outbox.current!, { onArrive: () => setSent((n: number) => n + 1) });",
    ].join("\n"),
  },
  composition: "useBudOff → a drawn drop over the page, removed when it lands",
  a11y: [
    "The drop is decoration (aria-hidden): whatever it means has to be said by what it lands in.",
    "It never takes focus and never blocks the pointer.",
  ],
  motion: {
    tokens: ["springs"],
    reducedMotion: "No drop: onArrive runs at once.",
  },
  sound: ["A soft gulp as it lands, inside a SoundProvider."],
  antiPatterns: [
    "Never make the drop the only sign something happened: update what it lands in.",
    "Never fire it on something the user didn't do: cause and effect is the point.",
  ],
} as const;
