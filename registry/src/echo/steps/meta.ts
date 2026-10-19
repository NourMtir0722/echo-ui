import { z } from "zod";

export const stepsProps = z.object({
  steps: z.array(z.string()).describe("Station labels, in order."),
  current: z.number().describe("0-based index of the current step."),
  label: z.string().describe("Name for the group, e.g. \"Setup\". Required."),
  completeLabel: z
    .string()
    .default("completed")
    .describe("Word appended for screen readers on finished steps."),
});

export const meta = {
  name: "echo-steps",
  title: "Steps",
  description:
    "How far through a sequence you are, as LED stations wired together: done stations stay lit but dim, the current one blooms, upcoming ones are dead plastic. An ordered list inside a labelled group, with aria-current on the current station and the done state stated in text — a colour is not a message.",
  props: stepsProps,
  examples: [
    {
      title: "Setup flow",
      description: "current is a 0-based index, so 1 means the second station.",
      code: '<Steps label="Setup" current={1} steps={["Connect", "Calibrate", "Done"]} />',
    },
    {
      title: "Finished",
      description: "Past the end marks every station complete.",
      code: '<Steps label="Setup" current={3} steps={["Connect", "Calibrate", "Done"]} />',
    },
  ],
  feel: "Stations along a lit wire — how far you are through a sequence.",
  usage: {
    imports: "import { Steps } from \"@/echo/steps\";",
    code: "<Steps label=\"Setup\" current={1} steps={[\"Connect\", \"Calibrate\", \"Done\"]} />",
  },
  composition: "Steps",
  a11y: [
    "A group named by `label` around an ordered list; the current station has `aria-current=\"step\"`.",
    "Finished stations say so in text (`completeLabel`, “completed” by default), not only with a lit pip.",
    "Stations are not interactive; Steps shows progress, it does not navigate.",
  ],
  antiPatterns: [
    "Never use Steps for navigation between arbitrary sections — it promises a sequence with a direction. Somewhere you can move around freely is Tabs.",
    "Never let the lit pip be the only signal that a step is done. It is why completeLabel exists: the state reaches a screen reader as words, not as a colour.",
    "Never render more than about five stations in a row — the labels collapse and the wire stops reading as progress. Long sequences want a count (\"Step 3 of 12\") instead.",
    "Never make the stations clickable without also handling the case where a later step is not yet reachable; a station that looks navigable and silently does nothing is worse than a plain indicator.",
  ],
} as const;
