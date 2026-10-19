import { z } from "zod";
import { interopProps } from "../../agent/interop";

const ends = z.array(z.object({ value: z.string(), label: z.string() }));

export const patchBayProps = z.object({
  ...interopProps,
  label: z.string().describe('What\'s being connected: the group\'s accessible name ("Import columns").'),
  sources: ends.describe("What you have: the left column."),
  targets: ends.describe("Where it can go: the right column."),
  sourcesLabel: z.string().default("From").describe("The heading over the sources."),
  targetsLabel: z.string().default("To").describe("The heading over the targets."),
  value: z.record(z.string(), z.string().nullable()).optional().describe("Where each source goes: its target's value, or null for nowhere (controlled)."),
  defaultValue: z.record(z.string(), z.string().nullable()).optional(),
  onValueChange: z.function().optional().describe("Called with where every source goes."),
  disabled: z.boolean().default(false),
});

export const meta = {
  name: "echo-patch-bay",
  title: "PatchBay",
  description:
    "Connecting things to things, the way a studio patches its gear: sockets down one side for what you have, sockets down the other for where it goes, and a cable between each connected pair. For mapping an import's columns to fields, routing events to channels, inputs to outputs. Each source has a Select that says where it goes, and that's the real control; the cables draw what the Selects say, and with a pointer you can drag one from socket to socket.",
  props: patchBayProps,
  examples: [
    {
      title: "Map an import",
      description: "The file's columns on the left, your fields on the right.",
      code: '<PatchBay\n  label="Import columns"\n  sourcesLabel="In your file"\n  targetsLabel="Fields"\n  sources={[{ value: "e-mail", label: "E-mail" }, { value: "name", label: "Full name" }]}\n  targets={[{ value: "email", label: "Email" }, { value: "first", label: "First name" }]}\n  defaultValue={{ "e-mail": "email" }}\n/>',
    },
    {
      title: "Controlled",
      description: "The mapping in your state.",
      code: '<PatchBay label="Routing" sources={events} targets={channels} value={routes} onValueChange={setRoutes} />',
    },
  ],
  feel: "Plugging cables into a patch panel: they drop into place and sway once.",
  usage: {
    imports: 'import { PatchBay } from "@/echo/patch-bay";',
    code: '<PatchBay label="Import columns" sources={[{ value: "e-mail", label: "E-mail" }]} targets={[{ value: "email", label: "Email" }]} />',
  },
  composition: "PatchBay\n  the sources: a name, a Select (where it goes) and a socket per row\n  the targets: a socket and a name per row\n  the cables",
  a11y: [
    "A group named by `label`. Each source has a Select named \"<source> goes to\", which is the whole control: keys, screen readers and forms use it.",
    "The target column and the cables are a picture of what the Selects say, hidden from assistive technology.",
    "Dragging a cable is a pointer extra; on a narrow screen the cables go and the Selects stay.",
    "`name` submits each connection as name[source] with a form.",
    "Keyboard: Tab reaches each source's Select, which opens with Enter, Space or the arrow keys and chooses with Enter, like any Select.",
  ],
  motion: {
    tokens: ["springs"],
    reducedMotion: "Cables appear hanging at rest, without dropping or swaying.",
  },
  sound: ["The select click when a cable connects, and a tap when one comes out, inside a SoundProvider."],
  antiPatterns: [
    "Never use a PatchBay for a list with one obvious answer each: a column of Selects is plainer.",
    "Never make the cables the only way to connect: they draw the Selects; the Selects are the control.",
  ],
} as const;
