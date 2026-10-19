import { z } from "zod";

/**
 * The documented shape of the interop set every control accepts.
 *
 * `echo-ui-core`'s `EchoInterop` is the TYPE; this is the same decision for
 * the docs, so a control cannot accept a prop the docs have never heard of —
 * which `props-parity.test.ts` enforces per item.
 *
 * It is spread FIRST into each meta, so an item that has something more
 * specific to say about a prop can redeclare it and win.
 */
export const interopProps = {
  id: z.string().optional().describe("The element's id, so a <label for> or an aria-describedby can reach it."),
  name: z.string().optional().describe("The field's name in a form submission, and the key react-hook-form registers."),
  disabled: z.boolean().optional(),
  required: z.boolean().optional(),
  readOnly: z.boolean().optional(),
  autoFocus: z.boolean().optional().describe("Focus this control when it mounts. One per page, at most."),
  onBlur: z.function().optional().describe("Fired on focus loss. react-hook-form validates onTouched and onBlur with it."),
  onFocus: z.function().optional().describe("Fired when the control takes focus."),
  onKeyDown: z.function().optional().describe("Keyboard handling you own — Enter to send, Escape to clear. Runs before Echo's."),
};

/** What a control you type into documents on top of the above. */
export const textInteropProps = {
  ...interopProps,
  placeholder: z.string().optional().describe("The greyed hint shown while the field is empty. Never a substitute for a label."),
  autoComplete: z.string().optional().describe('What the value is, for autofill and assistive tech — "email", "one-time-code". WCAG 1.3.5.'),
  inputMode: z.string().optional().describe('Which on-screen keyboard a phone offers: "numeric", "email", "tel", …'),
  maxLength: z.number().optional(),
  minLength: z.number().optional(),
  pattern: z.string().optional().describe("A regular expression the value must match for the field to be valid."),
};

/** What a button documents on top of the base set. */
export const pressInteropProps = {
  ...interopProps,
  onClick: z.function().optional(),
  type: z.string().optional().describe('"button" (default), "submit" or "reset".'),
  form: z.string().optional().describe("The id of the form this button submits, when it sits outside it."),
  value: z.string().optional().describe("Submitted with the form when this button is the one pressed."),
  title: z.string().optional().describe("The browser's own hover tooltip. Never the accessible name."),
  onPointerDown: z.function().optional().describe("Runs before Echo's own tactile handler, so the sound lands with the finger."),
  onPointerUp: z.function().optional(),
};
