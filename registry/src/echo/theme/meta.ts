/**
 * Per-component meta. echo-theme is the token/theme foundation;
 * its "props" are the seed schema (Layer 1) rather than React props.
 */
import { EchoSeedSchema } from "./seed-schema";

export const meta = {
  name: "echo-theme",
  title: "Theme Engine",
  description:
    "createEchoTheme(seed) → { css, values, report }. One OKLCH derivation turns a ~6-value seed into the full semantic-role set. Users touch only the seed; components consume only the roles.",
  props: EchoSeedSchema,
  examples: [
    {
      title: "Default theme",
      description: "Inject the default device look at :root.",
      code: [
        "const { css } = createEchoTheme();",
        "// <style>{css}</style> or inject into document head",
      ].join("\n"),
    },
    {
      title: "Retheme by seed",
      description: "One color in, the whole device relights, with nothing of the default left in it.",
      code: 'const { css, values } = createEchoTheme({ accent: "#3D8EF0" });',
    },
    {
      title: "Scoped theme",
      description: "Scope variables to a class instead of :root.",
      code: 'createEchoTheme({ accent: "#F2674E" }, { selector: ".coral-device" });',
    },
    {
      title: "What contrast corrected",
      description: "The seed can ask for text no one can read; the theme moves it to AA and says so, in `report`.",
      code: 'const { report } = createEchoTheme({ paper: "#2A2A2A", chassis: "#26222B" });\n// report.corrected: ["text (→ 9.04:1)", "text-dim (→ 6.41:1)"]',
    },
    {
      title: "A light device",
      description: "A pale chassis makes a light device: a light page, caps with their own bevel, screens of paper glass printed in ink, the accent lit at 3:1 with its text and focus ring a step deeper (accent-ink), the same primary cap with a light label (primary-cap-ink), and shadows in the body's own colour. The chassis decides; there's no mode to set.",
      code: 'const { values } = createEchoTheme({ chassis: "#EBEBEB", paper: "#1D1D1D", accent: "#0594F9" });\n// values.polarity: "light"',
    },
    {
      title: "Pill keys, crisp boxes",
      description: "`radius` sets the corners of boxes, panels and fields; `pills` makes buttons and segments pills whatever they are, the way a spec sheet draws pill keys on square-cornered tables. Unset, pills come with radius 1, as they always have.",
      code: 'const { css } = createEchoTheme({ radius: 0.3, pills: true });\n// --echo-cap-round: 1, and the panels keep their crisp corners',
    },
    {
      title: "A drawn device",
      description: "`render: \"drawn\"` draws the same parts in the ink instead of molding and lighting them, the way a spec sheet draws a key: every part outlined at one weight (`--echo-line`, `--echo-line-width`), hollow on the body, raised parts standing on a hard ink edge they travel down when pressed. Nothing glows, so what a molded device lights is solid ink; the primary key is the paper key that stands highest, and the accent stays the seed's own colour as the fill for what's on. Every contrast guarantee holds. Molded is the default, and a molded device renders exactly as it did.",
      code: 'const { css } = createEchoTheme({ chassis: "#FBFBFB", paper: "#050505", accent: "#D3F44F", render: "drawn" });\n// --echo-drawn: 1; --echo-line-width: 1.5px; --echo-primary-cap-top: #d3f44f',
    },
    {
      title: "What's hard to read, past AA",
      description: "The WCAG 2 ratio overrates bright colour on a dark ground. `report.readability` measures every text role on every ground in APCA, a dark device's cap against its body, and what changes for people with colour blindness: a `fail` is hard to read for anyone, a `note` is under comfortable. Lit text on a dark device is already lifted to read.",
      code: 'const { report } = createEchoTheme({ accent: "#0A33E3", chassis: "#030529" });\n// report.readability: [{ kind: "text", level: "note", message: "dim text (#…) reads at APCA Lc 5… on the cap; small text reads well from 60." }, …]',
    },
    {
      title: "When the accent moves",
      description: "On a molded device every accent is held to one lightness, so a lit cap reads the same whatever the seed, and an acid yellow comes out olive. `report.accent` says what it became. A drawn device keeps the seed's colour as its fill, so nothing is reported.",
      code: 'const { report } = createEchoTheme({ accent: "#F1FF01" });\n// report.accent: { from: "#F1FF01", to: "#929b00" }',
    },
  ],
  feel: "Pick one colour and the whole device relights around it — plastic, glow and screen stay the same material in a new hue.",
  usage: {
    imports: "import { createEchoTheme } from \"echo-ui-core/theme\";",
    code: [
      "const { css } = createEchoTheme({ accent: \"#3D8EF0\" });",
      "return <style>{css}</style>;",
    ].join("\n"),
  },
  antiPatterns: [
    "Never hardcode hex in component CSS — consume var(--echo-*) so themes propagate.",
    "Never write a box-shadow by hand — take a recipe, var(--echo-shadow-well) and the rest, so it follows the key light and the finish.",
    "Do not read the seed inside components; components see only Layer 3 roles.",
    "Do not bypass createEchoTheme to hand-write role values — you lose the WCAG-AA contrast guardrail.",
  ],
} as const;
