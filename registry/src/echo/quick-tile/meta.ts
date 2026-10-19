import { z } from "zod";
import { interopProps } from "../../agent/interop";

export const quickTileProps = z.object({
  ...interopProps,
  label: z.string().describe("What it switches: the tile's name and its accessible name."),
  icon: z.unknown().describe("The glyph on the tile."),
  status: z.string().optional().describe('A line of state under the name: "Home network", "Until 7:00".'),
  checked: z.boolean().optional().describe("On (controlled)."),
  defaultChecked: z.boolean().default(false),
  onCheckedChange: z.function().optional().describe("Called with the new state."),
  shape: z.enum(["square", "wide"]).default("square").describe("square is a glyph over a name; wide sets them side by side, with the state line."),
  onMore: z.function().optional().describe("Shows a small key for the details, and calls this when it's pressed."),
  disabled: z.boolean().default(false),
});

export const meta = {
  name: "echo-quick-tile",
  title: "QuickTile",
  description:
    "A quick-settings tile, as in a phone's control centre: a big molded key with a glyph, a name and a line of state. Press it to switch the thing on or off; on, it's the lit cap and its socket glows. It presses like every Echo key. A switch for assistive tech, with the state line as its description; details open from a separate key, never from holding the tile down.",
  props: quickTileProps,
  examples: [
    {
      title: "A control centre",
      description: "Square tiles and a wide one with its state.",
      code: '<Grid columns={2} gap={5}>\n  <QuickTile label="Wi-Fi" icon={<WifiIcon />} status="Home network" shape="wide" defaultChecked />\n  <QuickTile label="Focus" icon={<MoonIcon />} />\n</Grid>',
    },
    {
      title: "With details",
      description: "A small key for the settings behind it.",
      code: '<QuickTile label="Bluetooth" icon={<BluetoothIcon />} status="2 devices" shape="wide" onMore={() => open("bluetooth")} />',
    },
  ],
  feel: "A chunky backlit key: it lights up when the thing is on.",
  usage: {
    imports: 'import { QuickTile } from "@/echo/quick-tile";',
    code: '<QuickTile label="Wi-Fi" icon={<WifiIcon />} />',
  },
  composition: "QuickTile\n  the tile (a role=\"switch\" button): the glyph, a StatusDot, the name and the state line\n  HardwareButton (details, with onMore)",
  a11y: [
    "A `role=\"switch\"` button named by `label`, with `aria-checked` for its state and the state line as its description.",
    "Details are a separate button named with the tile (\"Wi-Fi settings\"), so nothing is hidden behind a long press.",
    "On is carried by the lit cap and by the socket, and in forced colors by the system highlight colour, never by colour alone.",
    "Keyboard: Tab reaches the tile and then its Details button; Enter or Space turns the tile on or off.",
  ],
  motion: {
    tokens: ["springs"],
    reducedMotion: "The tile presses without travel.",
  },
  sound: ["The key's press and release, inside a SoundProvider."],
  antiPatterns: [
    "Never use a QuickTile in a form: it's for switching something on right now; a setting saved with a form is a Switch.",
    "Never put a long label on a square tile: a word or two; the state line says the rest.",
  ],
} as const;
