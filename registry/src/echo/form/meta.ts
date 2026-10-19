import { z } from "zod";

export const formProps = z.object({
  children: z.unknown().describe("The fields, fieldsets and the submit button."),
  onSubmit: z.function().optional().describe("Called with the form's values by field name; a name used more than once gives an array. The browser doesn't validate (noValidate): do it here."),
  errors: z.record(z.string(), z.string().optional()).optional().describe("Field name → what's wrong: from your validation or your server. Pass the same message to each field's own error."),
  showSummary: z.boolean().default(false).describe("Show the summary: true after a submit that came back with errors, false once they're fixed."),
  summaryTitle: z.string().optional().describe('The summary\'s heading. Default "There\'s a problem" / "There are N problems".'),
  "aria-label": z.string().optional().describe("Names the form, so it's listed as a landmark."),
});

export const meta = {
  name: "echo-form",
  title: "Form",
  description:
    "A form that fails well. Give it errors (field name → message) and pass the same message to each field's error. When a submit comes back with errors, a summary opens at the top: how many things need fixing, each a link that takes focus to its field, and the summary takes focus so it's heard first. A native form (noValidate: you validate in onSubmit), whose values arrive as an object.",
  props: formProps,
  examples: [
    {
      title: "The validation pattern",
      description: "Validate on submit; the same errors go to the fields and the summary.",
      code: [
        "const [errors, setErrors] = useState({} as Record<string, string>);",
        "const [tried, setTried] = useState(false);",
        "<Form",
        "  errors={errors}",
        "  showSummary={tried}",
        "  onSubmit={(values) => {",
        "    const next = validate(values);",
        "    setErrors(next);",
        "    setTried(Object.keys(next).length > 0);",
        "  }}",
        ">",
        '  <Field id="email" name="email" label="Email" error={errors.email} />',
        '  <HardwareButton type="submit" variant="primary">Create account</HardwareButton>',
        "</Form>",
      ].join("\n"),
    },
  ],
  feel: "When it fails, it tells you once, at the top, how many things need fixing, and takes you to each one.",
  usage: {
    imports: 'import { Form } from "@/echo/form";',
    code: "<Form onSubmit={save}>{fields}</Form>",
  },
  composition: "Form → a native form, with a summary (a list of links to the invalid fields) when a submit fails",
  a11y: [
    "The summary is an alert that takes focus when it opens, so a screen reader hears how many problems there are first.",
    "Each problem is a link; following it moves focus to that field.",
    "Every field still shows its own message and is marked invalid, so a person who skips the summary finds the problem where it is.",
    "Give the form an aria-label and it's listed as a landmark.",
    "Keyboard: each problem in the summary is a Tab stop; Enter on it moves focus to that field.",
  ],
  antiPatterns: [
    "Never validate as someone types their first character: validate on submit, then re-check as they fix.",
    "Never show the summary without the same message on the field: people arrive at fields, not only at the summary.",
    "Never disable the submit button until the form is valid: nobody can find out why it won't go.",
  ],
} as const;
