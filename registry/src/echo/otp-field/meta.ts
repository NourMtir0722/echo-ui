import { z } from "zod";
import { textInteropProps } from "../../agent/interop";

export const otpFieldProps = z.object({
  ...textInteropProps,
  label: z.string().optional().describe("Visible eyebrow label; also the group's accessible name. An OTP field needs label, aria-label or aria-labelledby: leaving all three out is a type error."),
  length: z.number().default(6).describe("How many digit windows."),
  value: z.string().optional().describe("Controlled value — the whole code, not one digit."),
  defaultValue: z.string().optional().describe("Uncontrolled initial code."),
  onValueChange: z.function().optional().describe("Fired with the code so far."),
  onComplete: z.function().optional().describe("Fired when the last window is filled. Where a sign-in screen submits."),
  disabled: z.boolean().optional(),
  required: z.boolean().optional(),
  name: z.string().optional().describe("Identifies the code when a form is submitted."),
  mask: z.boolean().default(false).describe("Hide the characters. For a secret, not for a one-time code."),
  description: z.unknown().optional().describe("Help text under the row, linked to the group."),
  error: z.string().optional().describe("What's wrong, in words. While set, the group is invalid and the message shows with a square pip."),
  "aria-label": z.string().optional().describe("Used only when `label` is omitted; a visible label wins."),
  "aria-labelledby": z.string().optional().describe("Used only when `label` is omitted."),
  size: z
    .enum(["sm", "md", "lg"])
    .default("md")
    .describe("Height on the control scale: sm 32px, md 44px, lg 60px, the same as a HardwareButton or Field of that size, so they line up in a row. Defaults to the nearest SizeProvider's size."),
});

export const meta = {
  name: "echo-otp-field",
  title: "OTP field",
  description:
    "The one-time code a sign-in asks for, as a row of lit digit windows — the Field's recessed well cut into six screens, in the LCD voice. Built on Base UI's OTP Field: a pasted code fills the row, arrow keys and Backspace walk it, and the phone can offer the code from an SMS. Composes var(--echo-*).",
  props: otpFieldProps,
  examples: [
    { title: "Six digits", description: "The default.", code: '<OtpField label="Verification code" onComplete={submit} />' },
    { title: "Four digits", description: "Any length.", code: '<OtpField label="PIN" length={4} onComplete={unlock} />' },
    {
      title: "Wrong code",
      description: "`error` marks the group invalid and says what to do.",
      code: '<OtpField label="Verification code" value={code} onValueChange={setCode} error={wrong ? "That code has expired. Ask for a new one." : undefined} />',
    },
  ],
  feel: "Six lit windows. The one you're on sinks into the panel, so the press travels along the row as you type, each digit lands as a small strike, and the finished code runs a ripple down the row.",
  usage: {
    imports: "import { OtpField } from \"@/echo/otp-field\";",
    code: "<OtpField label=\"Verification code\" onComplete={submit} />",
  },
  composition: "OtpField",
  a11y: [
    "One labelled group, not six unlabelled boxes: the visible `label` names the whole row, and each window says which digit it is.",
    "`autocomplete=\"one-time-code\"` is on by construction, so a phone offers the code from an SMS and password managers fill it (WCAG 3.3.8).",
    "Pasting the whole code fills the row — nobody has to retype it digit by digit.",
    "`description` and `error` are linked to the group with `aria-describedby`; `error` marks it invalid. The error is words plus a square pip, never colour alone.",
    "Keyboard: typing a digit moves to the next window; Backspace and the arrow keys walk the row, and a pasted code fills it.",
  ],
  motion: {
    tokens: ["--echo-duration-swap"],
    reducedMotion: "The windows don't sink, take strikes or ripple; only the focus edge fades.",
  },
  antiPatterns: [
    "Don't use it for a password or anything long: it's for a short code, one character per window.",
    "Don't block pasting — it is how most people enter a code they were just sent.",
  ],
} as const;
