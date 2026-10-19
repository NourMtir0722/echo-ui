import { z } from "zod";
import { pressInteropProps } from "../../agent/interop";

export const ledKeyProps = z.object({
  ...pressInteropProps,
  children: z.string().describe("The key's legend — machine-cased in the skin."),
  lit: z
    .boolean()
    .default(false)
    .describe("Light the LED and breathe it. False is dead plastic."),
  litLabel: z
    .string()
    .optional()
    .describe(
      "What the lit LED means, announced as visually hidden text. For a key that toggles its own state, use aria-pressed instead.",
    ),
  size: z
    .enum(["sm", "md", "lg"])
    .default("md")
    .describe("Height on the control scale: sm 32px, md 44px, lg 60px, the same as a HardwareButton or Field of that size, so they line up in a row. Defaults to the nearest SizeProvider's size."),
});

export const meta = {
  name: "echo-led-key",
  title: "LedKey",
  description:
    "A molded pill key with an indicator LED that breathes while lit. The latching sibling of HardwareButton: use it when the key's own state is part of the answer (armed, monitoring, recording), not for a command that fires and forgets.",
  props: ledKeyProps,
  examples: [
    {
      title: "Latching key",
      description:
        "A key that toggles its own state says so with aria-pressed — the LED is then the visual half of the same fact.",
      code: "<LedKey lit={armed} aria-pressed={armed} onClick={() => setArmed(!armed)}>Arm</LedKey>",
    },
    {
      title: "Reporting something else",
      description:
        "When the LED reports what the device is doing rather than the key's own state, litLabel is what carries it to a screen reader.",
      code: '<LedKey lit={recording} litLabel="Recording">Rec</LedKey>',
    },
    {
      title: "Idle",
      description: "Unlit is dead plastic — the same two-state LED as StatusDot.",
      code: "<LedKey>Snooze +5</LedKey>",
    },
    {
      title: "A row of keys",
      description: "Keys read as one transport when they share a well row.",
      code: '<div style={{ display: "flex", gap: 12 }}><LedKey lit litLabel="Recording">Rec</LedKey><LedKey>Play</LedKey></div>',
    },
  ],
  feel: "A molded key with an indicator LED that breathes while it is lit.",
  usage: {
    imports: "import { LedKey } from \"@/echo/led-key\";",
    code: [
      "<LedKey lit={armed} aria-pressed={armed} onClick={() => setArmed(!armed)}>",
      "  Arm",
      "</LedKey>",
    ].join("\n"),
  },
  composition: "LedKey",
  a11y: [
    "A native `<button>`: Enter and Space press it, with the same travel and sound as a pointer.",
    "For an on/off key, pass `aria-pressed` alongside `lit` so the state is announced.",
    "`litLabel` adds visually hidden text for what the lit LED means (“Recording”) — the LED alone is only colour.",
  ],
  motion: {
    tokens: ["lift", "light"],
    reducedMotion: "The key does not travel, and the lit LED stops breathing and holds steady.",
  },
  sound: [
    "`press` as the key lands on its seam, `release` as it tops out on the way home, brighter the longer it was held.",
  ],
  antiPatterns: [
    "Never let the LED be the only carrier of state — pass litLabel (or aria-pressed when the key toggles itself) so the lit key announces what it means; a colour is not a message.",
    "Never pass both aria-pressed and litLabel — one says the key is on, the other says the device is; using both leaves a screen reader with two answers to one question.",
    "Never use LedKey for a fire-and-forget command (Save, Send, Delete). An LED promises a state that persists after the press; HardwareButton is the cap for actions.",
    "Never render more than one lit key to mean one exclusive choice — that is a Segmented or a RadioGroup, which say so structurally.",
  ],
} as const;
