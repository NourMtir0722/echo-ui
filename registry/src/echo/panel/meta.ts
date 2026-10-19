import { z } from "zod";

export const panelProps = z.object({
  variant: z
    .enum(["raised", "screen"])
    .default("raised")
    .describe("raised = molded plastic card; screen = recessed dark LCD well."),
  pressable: z
    .boolean()
    .default(false)
    .describe("The surface answers a press like water: a wave runs out from where you pressed, bigger for a longer press, and a key press on a control on it sends one from that control. Decoration only; at rest it looks like any Panel."),
});

export const meta = {
  name: "echo-panel",
  title: "Panel",
  description:
    "The two halves of the device material law as a container: raised molded plastic (things you touch) or a recessed dark screen (things you read). Consumes var(--echo-*).",
  props: panelProps,
  examples: [
    { title: "Card", description: "Raised plastic card.", code: "<Panel>Settings</Panel>" },
    {
      title: "Screen",
      description: "Recessed LCD well for readouts.",
      code: '<Panel variant="screen"><StatTile value="42" label="Latency" /></Panel>',
    },
    {
      title: "Pressable",
      description: "The surface answers a press with a wave; the controls on it keep their own names.",
      code: '<Panel pressable><HardwareButton>Start</HardwareButton></Panel>',
    },
  ],
  feel: "Either raised molded plastic you can set things on, or a recessed dark screen you look into. Pressable, it gives like water: a wave runs out from where you pressed.",
  usage: {
    imports: "import { Panel } from \"@/echo/panel\";",
    code: "<Panel>Settings</Panel>",
  },
  composition: "Panel",
  a11y: [
    "A plain `<div>` with no role — it groups visually, not semantically. Give it a heading inside, or a landmark around it, when the grouping matters to a screen reader.",
    "`variant=\"screen\"` is a dark ground: its content must use the text roles, which are contrast-checked against it.",
    "`pressable` adds no role and takes no focus: the wave is decoration, hidden from assistive tech and dropped in forced colors. Keep what the press does on a real control on the Panel.",
  ],
  motion: {
    tokens: [],
    reducedMotion: "With pressable, no wave runs.",
  },
  sound: ["With pressable, a soft thud when you press the surface itself, deeper for a longer press, inside a SoundProvider. A control on it makes its own sound instead."],
  antiPatterns: [
    "Never make a pressable Panel the only way to do something: it's a surface, not a button. Put the action on a control.",
    "Never put raised controls directly on another raised Panel without a well — plastic sits in recesses, not on plateaus.",
    "Never give the screen variant a background of your own: its field is the theme's, dark glass on a dark device, paper glass on a light one, flat on a drawn one.",
  ],
} as const;
