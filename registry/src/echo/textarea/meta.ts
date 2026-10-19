import { z } from "zod";
import { textInteropProps } from "../../agent/interop";

export const textareaProps = z.object({
  ...textInteropProps,
  label: z.string().optional().describe("Visible eyebrow label; also the accessible name. A textarea needs label, aria-label or aria-labelledby: leaving all three out is a type error."),
  value: z.string().optional().describe("Controlled value."),
  defaultValue: z.string().optional().describe("Uncontrolled initial value."),
  onValueChange: z.function().optional().describe("Fired with the new string value."),
  mono: z.boolean().default(false).describe("Machine (mono) voice — logs, patch notes, codes."),
  autosize: z.boolean().default(true).describe("Grow to fit the content instead of scrolling."),
  rows: z.number().default(3).describe("Rows shown before it grows; the fixed height when autosize is off."),
  maxRows: z.number().optional().describe("Stop growing here and scroll. Rows, not pixels."),
  disabled: z.boolean().optional(),
  placeholder: z.string().optional().describe("A hint, never a substitute for the label."),
  name: z.string().optional().describe("Identifies the field when a form is submitted."),
  description: z.unknown().optional().describe("Help text under the textarea, linked to it so a screen reader reads it after the name."),
  error: z
    .string()
    .optional()
    .describe("What's wrong, in words. While set, the message shows with a square pip, is linked to the textarea, and the textarea gets aria-invalid."),
  "aria-label": z.string().optional().describe("Used only when `label` is omitted; a visible label wins."),
  "aria-labelledby": z.string().optional().describe("Used only when `label` is omitted."),
});

export const meta = {
  name: "echo-textarea",
  title: "Textarea",
  description:
    "Field's recessed well, multi-line and autosizing. The height is measured from the browser's own layout rather than counted from newlines, so it stays right when lines wrap and when the container resizes. Same well, same focus glow, same eyebrow label as Field.",
  props: textareaProps,
  examples: [
    {
      title: "Autosizing note",
      description: "Grows with the content; three rows to start.",
      code: '<Textarea label="Session note" placeholder="What happened in this take?" />',
    },
    {
      title: "Capped growth",
      description: "Grows to eight rows, then scrolls inside the well.",
      code: '<Textarea label="Log" mono maxRows={8} defaultValue={log} />',
    },
    {
      title: "Fixed height",
      description: "autosize={false} keeps it exactly `rows` tall.",
      code: '<Textarea label="Notes" autosize={false} rows={6} />',
    },
    {
      title: "Help text and an error",
      description: "Linked to the textarea, like Field's.",
      code: '<Textarea\n  label="Session note"\n  description="Kept with the take."\n  error={note ? undefined : "Write a note before saving."}\n  value={note}\n  onValueChange={setNote}\n/>',
    },
  ],
  feel: "A deeper well that grows with what you write, then scrolls inside itself. Clicking presses it into the device, each key lands as a small strike, and the caret glides along the line after your letters.",
  usage: {
    imports: "import { Textarea } from \"@/echo/textarea\";",
    code: "<Textarea label=\"Session note\" placeholder=\"What happened in this take?\" />",
  },
  composition: "Textarea",
  a11y: [
    "`label` renders a real `<label>` tied to the textarea; otherwise pass `aria-label` or `aria-labelledby`.",
    "`description` and `error` are linked with `aria-describedby`, and `error` sets `aria-invalid`, through Base UI's Field.",
    "A native `<textarea>`: every text-editing key works. Past `maxRows` it scrolls, and it is already focusable, so the scroll is reachable by keyboard.",
  ],
  motion: {
    tokens: ["--echo-duration-swap"],
    reducedMotion: "The well doesn't press in or take strikes, the caret is the browser's own, and the focus transition is removed.",
  },
  antiPatterns: [
    "Do not use a Textarea for one line of text. The taller well promises more room than the field wants, and people write to fill it. That is Field.",
    "Do not set a `height` on the input. Autosize writes that property every time the value changes, so anything you set is overwritten on the next keystroke — cap it with maxRows instead.",
    "Do not re-enable the resize grip while autosize is on. Dragging it sets an inline height the next measurement throws away, which reads as the handle being broken.",
    "Always pass a label. A recessed well with a placeholder looks labelled and is not — the placeholder vanishes the moment anyone types.",
  ],
} as const;
