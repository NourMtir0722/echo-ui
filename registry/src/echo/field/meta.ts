import { z } from "zod";
import { textInteropProps } from "../../agent/interop";

export const fieldProps = z.object({
  ...textInteropProps,
  label: z.string().optional().describe("Visible eyebrow label; also the input's accessible name. A field needs label, aria-label or aria-labelledby: leaving all three out is a type error."),
  placeholder: z.string().optional().describe("A hint, never a substitute for the label."),
  value: z.string().optional().describe("Controlled value."),
  defaultValue: z.string().optional().describe("Uncontrolled initial value."),
  onValueChange: z.function().optional().describe("Fired with the input's new string value."),
  mono: z.boolean().default(false).describe("Render the value in the machine (mono) voice — codes, timers, serials."),
  disabled: z.boolean().optional(),
  type: z.string().default("text").describe("Native input type."),
  id: z.string().optional(),
  name: z.string().optional().describe("Identifies the field when a form is submitted."),
  autoComplete: z
    .string()
    .optional()
    .describe('What the value is, for autofill: "email", "current-password", "one-time-code". Set it on any field asking for the user\'s own information (WCAG 1.3.5).'),
  required: z.boolean().optional().describe("Marks the field required, for the browser and assistive tech."),
  description: z.unknown().optional().describe("Help text under the field, linked to the input so a screen reader reads it after the name."),
  error: z
    .string()
    .optional()
    .describe("What's wrong, in words. While set, the field is invalid: the message shows with a square pip, is linked to the input, and the input gets aria-invalid. Clear it when fixed."),
  "aria-label": z.string().optional().describe("Used only when `label` is omitted; a visible label wins."),
  "aria-labelledby": z.string().optional().describe("Used only when `label` is omitted."),
  "aria-describedby": z.string().optional().describe("Ids of other text that describes the field, read after its own description and error."),
  size: z
    .enum(["sm", "md", "lg"])
    .default("md")
    .describe("Height on the control scale: sm 32px, md 44px, lg 60px, the same as a HardwareButton or Field of that size, so they line up in a row. Defaults to the nearest SizeProvider's size."),
  start: z.unknown().optional().describe('Engraved into the well before the text: a search icon, a currency sign, "https://". Decoration: say the same in the label.'),
  end: z.unknown().optional().describe('In the well after the text: a unit ("ms"), or a small control (clear, show password) as a size="sm" iconOnly HardwareButton with its own name.'),
});

export const meta = {
  name: "echo-field",
  title: "Field",
  description:
    "A text input sunk into a recessed well. The inner edge lights in the accent on focus; a mono eyebrow label and an optional machine (mono) value voice. Composes var(--echo-*).",
  props: fieldProps,
  examples: [
    {
      title: "Search",
      description: "An icon engraved at the start, a clear key at the end.",
      code: '<Field\n  aria-label="Search"\n  start={<SearchIcon />}\n  end={<HardwareButton size="sm" iconOnly aria-label="Clear search" icon={<ClearIcon />} />}\n/>',
    },
    {
      title: "A unit",
      description: "The unit sits in the well after the number.",
      code: '<Field label="Timeout (ms)" defaultValue="250" end="ms" mono />',
    },
    { title: "Basic", description: "Labelled text input.", code: '<Field label="Name" placeholder="Ada Lovelace" />' },
    { title: "Machine voice", description: "Mono value for codes/timers.", code: '<Field label="Session code" placeholder="000-000" mono />' },
    { title: "Controlled", description: "Drive it from state.", code: "<Field label=\"Query\" value={q} onValueChange={setQ} />" },
    {
      title: "Help text and an error",
      description: "Both are linked to the input. The error shows while `error` is set; clear it when the value is fixed.",
      code: '<Field\n  label="Email"\n  type="email"\n  autoComplete="email"\n  description="We only use it to send the session link."\n  error={valid ? undefined : "Enter an email address, like ada@example.com."}\n  value={email}\n  onValueChange={setEmail}\n/>',
    },
  ],
  feel: "A recessed well you type into. Clicking presses it into the device, each key lands as a small strike on the surface, and the caret glides after your letters with a little weight. Its edge lights while it has focus.",
  usage: {
    imports: "import { Field } from \"@/echo/field\";",
    code: "<Field label=\"Name\" placeholder=\"Ada Lovelace\" />",
  },
  composition: "Field",
  a11y: [
    "`start` is decoration, hidden from assistive tech: whatever it says (\"search\", a currency) belongs in the label too. A control in `end` is its own button with its own name.",
    "`label` renders a real `<label>` tied to the input. With no visible label, pass `aria-label` or `aria-labelledby`.",
    "A native `<input>`; `type` passes through, so `email`, `password` and `search` keep their keyboard and autofill behaviour.",
    "A placeholder is not a label — it disappears as soon as someone types.",
    "`description` and `error` are linked with `aria-describedby`, and `error` sets `aria-invalid`, through Base UI's Field. The error is words plus a square pip, never colour alone.",
    "Set `autoComplete` on a field that asks for the user's own information (`email`, `name`, `current-password`), so autofill works and the purpose is machine-readable (WCAG 1.3.5).",
  ],
  motion: {
    tokens: ["--echo-duration-swap"],
    reducedMotion: "The well doesn't press in or take strikes, and the caret is the browser's own. Only the focus edge's colour fades in.",
  },
  antiPatterns: [
    "Don't show an error as a red border or colour alone. Pass `error` with words that say what to fix; that's what gets read out.",
    "The lit focus edge is the one accent; do not tint the well or the text with it.",
  ],
} as const;
