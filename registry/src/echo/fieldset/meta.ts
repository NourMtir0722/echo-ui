import { z } from "zod";

export const fieldsetProps = z.object({
  legend: z.string().describe("The group's name, said before each field inside."),
  description: z.unknown().optional().describe("A line under the legend."),
  children: z.unknown().describe("The fields."),
  disabled: z.boolean().default(false).describe("Disable every control inside at once."),
});

export const meta = {
  name: "echo-fieldset",
  title: "Fieldset",
  description:
    "A named group of fields (a shipping address, notification settings): a legend in the section voice, an optional description, and the fields under it. disabled turns off every control inside. Built on Base UI Fieldset.",
  props: fieldsetProps,
  examples: [
    {
      title: "An address",
      description: "The legend is said before each field.",
      code: '<Fieldset legend="Shipping address">\n  <Field label="Street" name="street" />\n  <Field label="City" name="city" />\n</Fieldset>',
    },
  ],
  feel: "A ruled section of a form with its name at the top.",
  usage: {
    imports: 'import { Fieldset } from "@/echo/fieldset";',
    code: '<Fieldset legend="Contact">{fields}</Fieldset>',
  },
  composition: "Fieldset → a fieldset with a legend (Base UI Fieldset)",
  a11y: [
    "A real `<fieldset>` with a `<legend>`: screen readers give the group's name with the first field they reach in it.",
    "`disabled` disables every control inside, the way a native fieldset does.",
  ],
  antiPatterns: [
    "Never use a Fieldset for a single field: its label is enough.",
    "Never put a Fieldset's legend in a heading instead: the legend is what ties the name to the fields.",
  ],
} as const;
