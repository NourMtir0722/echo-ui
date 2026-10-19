/**
 * Per-component meta for HardwareButton.
 */
import { z } from "zod";
import { typed } from "../../agent/typed";
import { pressInteropProps } from "../../agent/interop";

export const hardwareButtonProps = z.object({
  ...pressInteropProps,
  variant: z.enum(["primary", "neutral", "ghost"]).default("neutral").describe("primary is the lit cap for the one main action of a decision; neutral is plastic, for the rest; ghost has no cap, for a low-emphasis action (on a drawn device, its label underlined)."),
  size: z
    .enum(["sm", "md", "lg"])
    .default("md")
    .describe("Outer height on the control scale, the same as a Field or Select of that size: sm 32px (toolbars, table rows, inline), md 44px (the default: forms, dialogs, a button beside a field), lg 60px (the one action a screen is built around). Defaults to the nearest SizeProvider's size."),
  fullWidth: z.boolean().default(false).describe("The button takes the full width of the row it's in."),
  icon: typed("ReactNode").optional().describe("Leading icon (a ReactNode)."),
  trailingIcon: typed("ReactNode").optional().describe("Trailing icon (a ReactNode)."),
  iconOnly: z.boolean().default(false).describe("Square cap with no text, so it needs aria-label or aria-labelledby: without one it's a type error."),
  "aria-label": z.string().optional().describe("The button's name when it shows no text. With iconOnly, this or aria-labelledby is required: leaving both out is a type error. A text button is named by its text."),
  "aria-labelledby": z.string().optional().describe("Id of visible text that names the button, instead of aria-label."),
  loading: z.boolean().default(false).describe("Shows the loading dots and stops presses, keeping the label for screen readers."),
  engraved: z
    .boolean()
    .default(false)
    .describe(
      "Debossed label carved into the cap. Buys the carved look at a real cost: " +
        "1.13-1.87:1 on a neutral cap, ~1.05-1.3:1 on a primary one, against AA's 4.5:1. " +
        "Use only where the label is not the only thing telling you what the control " +
        "does. Unsupported with variant=\"primary\", and warns in development.",
    ),
  disabled: z.boolean().default(false),
  caption: z.string().optional().describe("A small machine caption under the cap. It must not repeat the label: say what the label can't, like a shortcut or a state."),
  href: z.string().optional().describe("Renders the cap as a link (<a href>) with the same material, press and sound. Use it whenever the button navigates."),
  target: z.string().optional().describe("With `href`: where to open the link, e.g. \"_blank\"."),
  rel: z.string().optional().describe("With `href`: the link relationship, e.g. \"noopener\"."),
  impact: z
    .boolean()
    .default(false)
    .describe("The press lands in the whole device: the well dips with the bottom-out and a ring of light runs round it. For the one action a screen is built around, not every button."),
  fill: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .describe("How full the cap is, 0–1: the primary plastic fills it from the start edge, like a level. For a cap that is also a quantity (a timer running down, a note playing). Say the quantity in the label too."),
  held: z
    .boolean()
    .optional()
    .describe("Holds the cap down from outside, with its click, the way a real key going down would; false lets it come home. For a drawn keyboard that follows the typing. It moves the cap only: it never clicks the button or sends an event."),
});

export const meta = {
  name: "echo-hardware-button",
  title: "HardwareButton",
  description:
    "A molded cap in a recessed well with real press travel and sound. primary/neutral/ghost; sm/md/lg on the one control scale (32/44/60px outer, so it lines up with a Field of the same size); fullWidth, icon slots, loading, engraved. It presses like a key switch (useCapPhysics), with the clicks on the mechanism; plastic color from createEchoTheme.",
  props: hardwareButtonProps,
  examples: [
    {
      title: "Primary record button",
      description: "The one place hardware turns accent.",
      code: '<HardwareButton variant="primary" onClick={record}>Record</HardwareButton>',
    },
    {
      title: "Beside a field",
      description: "The same size is the same height, so an inline form lines up.",
      code: '<Field aria-label="Email" placeholder="name@example.com" />\n<HardwareButton variant="primary">Invite</HardwareButton>',
    },
    {
      title: "The screen's main action",
      description: "lg for the one action a screen is built around; fullWidth to take the row.",
      code: '<HardwareButton variant="primary" size="lg" fullWidth type="submit">Sign in</HardwareButton>',
    },
    {
      title: "Icon-only, accessible",
      description: "Always give icon-only buttons an aria-label.",
      code: '<HardwareButton iconOnly aria-label="Play" icon={<PlayIcon />} />',
    },
    {
      title: "The one action that matters",
      description: "impact carries the press into the device. Keep it for the single action a screen is built around.",
      code: '<HardwareButton variant="primary" impact onClick={record}>Record</HardwareButton>',
    },
    {
      title: "Loading",
      description: "Loading disables interaction and shows the dot pulse.",
      code: "<HardwareButton loading>Saving</HardwareButton>",
    },
    {
      title: "A cap that is a quantity",
      description: "`fill` pours the primary plastic in from the start edge. Say the quantity in the label too: the fill alone isn't read aloud.",
      code: "<HardwareButton fill={left / total} onClick={pause}>\n  {`Pause, ${left}s left`}\n</HardwareButton>",
    },
    {
      title: "Keys that follow the typing",
      description: "`held` holds a cap down from outside, with its click, as a real key goes down. It moves the cap only: it never presses the button.",
      code: "<>\n  {keys.map((key: string) => (\n    <HardwareButton key={key} held={down.has(key)} onClick={() => type(key)}>\n      {key}\n    </HardwareButton>\n  ))}\n</>",
    },
  ],
  feel: "A key switch in a recessed well: it resists, gives and clicks onto its seam, keeps sinking while you hold it, and snaps home faster than it went down, harder the longer you held.",
  usage: {
    imports: "import { HardwareButton } from \"@/echo/hardware-button\";",
    code: [
      "<HardwareButton variant=\"primary\" onClick={save}>",
      "  Save",
      "</HardwareButton>",
    ].join("\n"),
  },
  composition: "HardwareButton",
  a11y: [
    "A native `<button>`, or an `<a>` when `href` is set, so focus, Enter and Space work as they always do.",
    "Space and Enter give the same press travel and sound as a pointer.",
    "The click fires the moment you press, like any button: the stroke is only the picture catching up.",
    "`iconOnly` has no visible text: give it an `aria-label`.",
    "`sm` is 32px, above the 24px minimum target; on a touch screen it grows to 44px.",
    "`loading` sets `aria-busy` and disables the button; the label stays in the accessibility tree underneath the dots.",
    "`engraved` lowers the label's contrast well below AA. Use it only where the label is not the only thing saying what the button does.",
  ],
  motion: {
    tokens: ["lift", "light"],
    reducedMotion: "The cap does not travel, the well does not dip, the hover glint stops, and the loading dots hold still.",
  },
  sound: [
    "`press` as the cap lands on its seam, `release` as it tops out on the way home, brighter the longer it was held.",
  ],
  antiPatterns: [
    "Never ship an icon-only button without an aria-label — there is no accessible name otherwise.",
    "Do not set `transform` on the cap or its well in CSS — useCapPhysics/GSAP owns transform; you'll fight the press.",
    "Do not hardcode plastic colors; the cap composes var(--echo-*) so retheming works.",
    "Engraved labels need contrast headroom — avoid on sm ghost buttons.",
    "Don't make every button lg: it's for the one action a screen is built around. A form's buttons are md, a toolbar's sm.",
    "Do not put `impact` on every button. It marks the one action a screen is built around; everywhere, it marks nothing.",
  ],
} as const;
