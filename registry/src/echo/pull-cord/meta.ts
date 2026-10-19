import { z } from "zod";

export const pullCordProps = z.object({
  label: z.string().describe('The switch\'s name, e.g. "Light".'),
  checked: z.boolean().optional(),
  defaultChecked: z.boolean().optional(),
  onCheckedChange: z.function().optional(),
  name: z.string().optional().describe("The switch's name in a form submission."),
  id: z.string().optional().describe("Passed to the switch: its id, for a <label for> or an aria-describedby."),
  disabled: z.boolean().optional(),
  required: z.boolean().optional(),
  length: z.number().optional().describe("How far the cord hangs, px. Defaults to 120."),
  children: z.unknown().optional().describe("What it lights, drawn behind the cord. Reads --echo-pull-on (0 off, 1 on, on a spring)."),
});

export const meta = {
  name: "echo-pull-cord",
  title: "PullCord",
  description:
    "A switch you pull. A real Echo Switch sits at the top and a cord hangs from it with a cap on its end; pull the cap and the cord stretches, clicks at the detent, and the switch changes when you let go past it. A short pull springs back. The Switch is the control — its state, name, focus, keyboard and form value — and the cord is a way to operate it by hand. Anything inside can read --echo-pull-on to light up.",
  props: pullCordProps,
  examples: [
    {
      title: "A lamp",
      description: "Whatever is inside reads --echo-pull-on.",
      code: [
        '<PullCord label="Lamp" checked={on} onCheckedChange={setOn}>',
        '  <span className="lamp" />',
        "</PullCord>",
      ].join("\n"),
    },
  ],
  feel: "It stretches under your hand and gives way at a detent.",
  usage: {
    imports: 'import { PullCord } from "@/echo/pull-cord";',
    code: '<PullCord label="Light" checked={on} onCheckedChange={setOn} />',
  },
  composition: "PullCord → a Switch, and a drawn cord hanging from it with a round cap to pull",
  a11y: [
    "The control is an Echo Switch (role=\"switch\", aria-checked) named by `label`, with the Switch's focus ring, keyboard and form value (`name`).",
    "Space or Enter flips the Switch, and the cord gives a tug; holding the key is one flip.",
    "The cord and its cap are a pointer handle, hidden from assistive tech: everything a pull does, the Switch does.",
    "In forced colors the cap and cord are system-coloured.",
  ],
  motion: {
    tokens: ["springs"],
    reducedMotion: "A flip from the Switch doesn't tug the cord; the cord still hangs by its own weight.",
  },
  sound: ["A pull clicks at the detent and a lighter one as it lets go; a flip from the Switch makes the Switch's own tap (inside a SoundProvider)."],
  antiPatterns: [
    "Never use it for an ordinary setting in a form: it carries a Switch's value, but it's a feature control, for the one toggle a screen is about.",
    "Never put two side by side: which one you pulled stops being obvious.",
  ],
} as const;
