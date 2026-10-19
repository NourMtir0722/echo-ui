/**
 * Per-component meta for Modal.
 */
import { z } from "zod";
import { typed } from "../../agent/typed";

export const modalProps = z.object({
  trigger: typed("ReactNode").optional().describe("What opens the modal. An element (e.g. a HardwareButton) becomes the trigger itself; text is wrapped in a plain trigger."),
  title: typed("ReactNode").optional().describe("The dialog title — also its accessible name. Always pass one."),
  description: typed("ReactNode").optional().describe("One line under the title, announced with it."),
  footer: typed("ReactNode").optional().describe("Actions row under the body, e.g. confirm and cancel buttons."),
  size: z.enum(["sm", "md", "lg"]).default("md").describe("The panel's width: sm 22rem, md (the default) 30rem, lg 42rem, each held inside a narrow screen."),
  showClose: z.boolean().default(true).describe("Show the × in the corner. Default true; turn it off only when the dialog's own actions close it."),
  defaultOpen: z.boolean().default(false),
  container: z.unknown().optional().describe("Where the popup mounts; defaults to <body>. Pass an element inside a scoped theme so the popup wears that theme, not the :root one."),
});

export const meta = {
  name: "echo-modal",
  title: "Modal",
  description:
    "Base UI Dialog (focus trap, Esc, scroll-lock, a11y) skinned as an Echo device panel. Enter uses motion.summon; exit is a GSAP tween that completes before unmount via useGsapPresence + actionsRef. sound.transition on open.",
  props: modalProps,
  examples: [
    {
      title: "Basic modal",
      description: "A trigger plus title/description/body.",
      code: [
        "<Modal",
        '  trigger={<HardwareButton>Settings</HardwareButton>}',
        '  title="Settings"',
        '  description="Tune the device."',
        ">",
        "  <p>Body content…</p>",
        "</Modal>",
      ].join("\n"),
    },
    {
      title: "With footer actions",
      description: "Footer for confirm/cancel.",
      code: '<Modal trigger="Delete" title="Are you sure?" footer={<HardwareButton variant="primary">Confirm</HardwareButton>} />',
    },
  ],
  feel: "A device panel that swells out of a small pill in the middle of the room, like an island opening, and gathers back into it when dismissed.",
  usage: {
    imports: [
      "import { HardwareButton } from \"@/echo/hardware-button\";",
      "import { Modal } from \"@/echo/modal\";",
    ].join("\n"),
    code: [
      "<Modal",
      "  trigger={<HardwareButton>Settings</HardwareButton>}",
      "  title=\"Settings\"",
      "  description=\"Tune the device.\"",
      ">",
      "  <p>Body content…</p>",
      "</Modal>",
    ].join("\n"),
  },
  composition: "Modal",
  a11y: [
    "Base UI Dialog: `role=\"dialog\"` and `aria-modal`, named by `title` and described by `description`.",
    "Focus moves into the panel, stays there while it is open, and returns to the trigger when it closes. The page behind cannot scroll.",
    "Escape or a click on the backdrop closes it.",
  ],
  motion: {
    tokens: ["island", "summon", "follow"],
    reducedMotion: "The panel fades in and out without blooming from its pill; the backdrop fades faster.",
  },
  sound: [
    "`transition` when it opens.",
  ],
  antiPatterns: [
    "Do not add a CSS transition to the popup — GSAP owns its transform/opacity; a CSS transition will fight it.",
    "Do not skip actionsRef when animating exit with JS — Base UI can't detect GSAP and will unmount too early.",
    "The package is `@base-ui/react`, not `@base-ui-components/react` (agents have stale training data).",
  ],
} as const;
