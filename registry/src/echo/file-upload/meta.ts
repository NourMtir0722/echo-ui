import { z } from "zod";
import { interopProps } from "../../agent/interop";

export const fileUploadProps = z.object({
  ...interopProps,
  label: z.string().optional().describe("Visible eyebrow label; also the name of the group the tray and its files are in. A file upload needs label, aria-label or aria-labelledby: leaving all three out is a type error."),
  accept: z.string().optional().describe('The file types it takes, as a file input\'s accept: "image/*", ".pdf", "text/csv". A file of another type is refused, and says why.'),
  multiple: z.boolean().optional().describe("Take more than one file. Without it, a new file replaces the one there."),
  maxSize: z.number().optional().describe("The largest file it takes, in bytes. A bigger one is refused, and says why."),
  maxFiles: z.number().optional().describe("How many files it holds at most. One past it is refused, and says why."),
  upload: z
    .function()
    .optional()
    .describe("Uploads one file: (file, report, signal). Call report with 0 to 1 as it goes, stop when signal aborts, resolve when done, and throw to fail; the error's message is shown on its row. Without it, the files are held for a form."),
  onFilesChange: z.function().optional().describe("Called with every row whenever one changes: added, progressing, uploaded, failed or removed."),
  name: z.string().optional().describe("Without `upload`, a form submits the files under this name."),
  required: z.boolean().optional().describe("Accepted with every control, and says nothing on a tray, as on a button. A form that needs a file checks for one, and says so in error."),
  size: z
    .enum(["sm", "md", "lg"])
    .default("md")
    .describe("Row height on the control scale: sm 32px, md 44px, lg 60px; the tray is twice that. Defaults to the nearest SizeProvider's size."),
  description: z.unknown().optional().describe("Help under the tray, linked to it: what it takes, and how much."),
  error: z.string().optional().describe("What's wrong, in words. While set, the field is invalid, and the message is linked to the tray."),
  locale: z.string().optional().describe('Whose words for sizes ("2.4 MB"), as a BCP 47 tag. Default: the browser\'s.'),
  "aria-label": z.string().optional().describe("Used only when `label` is omitted; a visible label wins."),
  "aria-labelledby": z.string().optional().describe("Used only when `label` is omitted."),
  "aria-describedby": z.string().optional().describe("Ids of other text that describes the tray, read after its own description and error."),
});

export const meta = {
  name: "echo-file-upload",
  title: "FileUpload",
  description:
    "A recessed tray you press to choose files or drop them on; its inner edge lights while files are over it. Each file becomes a row with a Progress strip while it goes up, and a key to cancel, retry or remove it. It has no upload code: your handler uploads, and reports progress.",
  props: fileUploadProps,
  examples: [
    {
      title: "Upload with progress",
      description: "Your handler uploads each file and reports how far it's got; throw to fail it, and the message shows on its row.",
      code: '<FileUpload\n  label="Attachments"\n  multiple\n  accept="image/*,.pdf"\n  maxSize={10_000_000}\n  description="Images or PDFs, up to 10 MB each."\n  upload={(file, report, signal) => sendFile(file, report, signal)}\n/>',
    },
    {
      title: "In a form",
      description: "Without `upload` it holds the files, and the form submits them.",
      code: '<form action="/avatar" method="post" encType="multipart/form-data">\n  <FileUpload label="Avatar" name="avatar" accept="image/*" />\n</form>',
    },
  ],
  feel: "A tray set into the device. Files dropped on it light its edge, and each one sits in a row of its own, its strip filling as it goes up.",
  usage: {
    imports: 'import { FileUpload } from "@/echo/file-upload";',
    code: '<FileUpload label="Attachments" multiple upload={sendFile} />',
  },
  composition: "FileUpload → Field's frame → a tray (a button) + a hidden file input → a row per file: name, status, Progress, HardwareButton keys",
  a11y: [
    "The tray is a real button: Enter or Space opens the file dialog, so dropping is never the only way in.",
    "The field is a group named by its label; `description` and `error` are linked to the tray, and `error` sets `aria-invalid` on it.",
    "What happens to each file is said aloud: added, uploaded, failed with its reason, refused with its reason, cancelled or removed.",
    "Each row's Progress strip is named by its file, and each key says what it does to which file (\"Cancel report.pdf\"). A key that goes with its row hands focus to the tray; Retry hands it to the row's other key.",
    "A refused file says why in words (its type, its size, one too many), with a square pip, never colour alone.",
  ],
  motion: {
    tokens: ["--echo-duration-swap"],
    reducedMotion: "Rows appear without sliding in; the tray's edge still changes colour as files come over it.",
  },
  sound: ["The select click when files are added, and the error tone when one is refused or fails, inside a SoundProvider."],
  antiPatterns: [
    "Don't make dropping the only way to add a file: the tray is a button for a reason.",
    "Don't show a failure as a red row alone: throw an Error whose message says what went wrong, and it's shown in words.",
    "Don't keep uploading after a cancel: stop when the signal aborts.",
  ],
} as const;
