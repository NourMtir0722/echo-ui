import { z } from "zod";
import { interopProps } from "../../agent/interop";

export const selectProps = z.object({
  ...interopProps,
  options: z
    .array(z.object({ value: z.string(), label: z.string() }))
    .describe("The choices. `value` is what you get back; `label` is what is shown."),
  value: z.string().optional().describe("Controlled value."),
  defaultValue: z.string().optional().describe("Uncontrolled initial value."),
  onValueChange: z.function().optional().describe("Fired with the newly selected value."),
  placeholder: z.string().default("Select…").describe("Shown while nothing is selected."),
  disabled: z.boolean().optional(),
  "aria-label": z.string().optional().describe("Names the trigger. This or aria-labelledby is required: leaving both out is a type error."),
  "aria-labelledby": z.string().optional().describe("Id of the visible label, when there is one."),
  container: z.unknown().optional().describe("Where the list mounts; defaults to <body>. Pass an element inside a scoped theme so the list wears that theme, not the :root one."),
  size: z
    .enum(["sm", "md", "lg"])
    .default("md")
    .describe("Height on the control scale: sm 32px, md 44px, lg 60px, the same as a HardwareButton or Field of that size, so they line up in a row. Defaults to the nearest SizeProvider's size."),
});

export const meta = {
  name: "echo-select",
  title: "Select",
  description:
    "Base UI Select (typeahead, keyboard, a11y) skinned as an Echo dropdown — a molded cap trigger and a floating panel with a lit dot on the selected option. CSS fade in and out (Base UI Select cannot hold a node for a GSAP exit); sound.select on change.",
  props: selectProps,
  examples: [
    {
      title: "Basic",
      description: "Options as {value,label}.",
      code: '<Select aria-label="Session length" defaultValue="25" options={[{ value: "25", label: "25 minutes" }, { value: "50", label: "50 minutes" }]} />',
    },
  ],
  feel: "A molded dropdown whose list unfolds from the cap. The cap presses like the library's buttons: it lifts toward you, gives, and lands on its seam as the list opens.",
  usage: {
    imports: "import { Select } from \"@/echo/select\";",
    code: [
      "<Select",
      "  aria-label=\"Session length\"",
      "  defaultValue=\"25\"",
      "  options={[",
      "    { value: \"25\", label: \"25 minutes\" },",
      "    { value: \"50\", label: \"50 minutes\" },",
      "  ]}",
      "/>",
    ].join("\n"),
  },
  composition: "Select",
  a11y: [
    "Base UI Select: the trigger opens a listbox. Arrow keys move, typing jumps to a matching option, Enter or Space chooses, Escape closes.",
    "Name it with `aria-label` or `aria-labelledby`.",
    "Focus returns to the trigger when the list closes.",
  ],
  motion: {
    tokens: ["--echo-duration-pop", "--echo-duration-swap"],
    reducedMotion: "The list appears with a short fade and does not slide, and the cap does not travel when pressed.",
  },
  sound: [
    "`select` when an option is chosen.",
  ],
  antiPatterns: [
    "Give the Select an accessible name (aria-label or aria-labelledby).",
    "Do not use a Select for a handful of peer views — that is Tabs/Segmented; Select is for many options.",
    "The package is `@base-ui/react`, not `@base-ui-components/react`.",
  ],
} as const;
