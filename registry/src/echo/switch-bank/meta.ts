import { z } from "zod";
import { interopProps } from "../../agent/interop";

const axis = z.array(z.object({ value: z.string(), label: z.string() }));

export const switchBankProps = z.object({
  ...interopProps,
  label: z.string().describe('What the bank sets: the table\'s caption ("Notifications").'),
  hideLabel: z.boolean().default(false).describe("Hide the caption visually; it still names the table."),
  columns: axis.describe("The columns: the channels, roles or days."),
  rows: axis.describe("The rows: the events, resources or times."),
  value: z.array(z.string()).optional().describe('What\'s on, as "row:column" keys (controlled).'),
  defaultValue: z.array(z.string()).optional(),
  onValueChange: z.function().optional().describe('Called with every "row:column" key that\'s on.'),
  disabled: z.boolean().default(false),
});

export const meta = {
  name: "echo-switch-bank",
  title: "SwitchBank",
  description:
    "Settings that come in a grid (notifications by event and channel, permissions by role and resource, a schedule by day) as a bank of Switches in a Table, one where each row meets each column. A Checkbox in each column header flips the whole column and shows a dash when it's mixed. A real table, so every Switch is read with its row and column.",
  props: switchBankProps,
  examples: [
    {
      title: "Notifications",
      description: "Events by channel.",
      code: '<SwitchBank\n  label="Notifications"\n  columns={[{ value: "email", label: "Email" }, { value: "push", label: "Push" }, { value: "sms", label: "SMS" }]}\n  rows={[{ value: "mentions", label: "Mentions" }, { value: "replies", label: "Replies" }]}\n  defaultValue={["mentions:email", "mentions:push"]}\n/>',
    },
    {
      title: "Controlled",
      description: "The keys that are on, in your state.",
      code: '<SwitchBank label="Permissions" columns={roles} rows={resources} value={grants} onValueChange={setGrants} />',
    },
  ],
  feel: "A bank of switches on a panel: flip one, or flip a whole column at once.",
  usage: {
    imports: 'import { SwitchBank } from "@/echo/switch-bank";',
    code: '<SwitchBank label="Notifications" columns={[{ value: "email", label: "Email" }]} rows={[{ value: "mentions", label: "Mentions" }]} />',
  },
  composition: "SwitchBank\n  Table\n    a Checkbox in each column header\n    a row header for each row\n    a Switch where each row meets each column",
  a11y: [
    "A `table` captioned by `label`, with column and row headers, so a screen reader reads each Switch with where it sits.",
    "Every Switch is also named by its column and row (\"Push, Mentions\"), for anyone moving by Tab.",
    "Each column's Checkbox is named \"All\" and the column, and is mixed when only some of the column is on.",
    "`name` submits every key that's on with a form.",
  ],
  motion: {
    tokens: ["springs"],
    reducedMotion: "Switches and Checkboxes change without travel, as they always do.",
  },
  sound: ["Each Switch and Checkbox clicks as it always does, inside a SoundProvider."],
  antiPatterns: [
    "Never use a SwitchBank for settings that don't form a grid: a list of Switches in rows reads better.",
    "Never let it grow past what fits: more than five columns is a table people scroll sideways through; split it.",
  ],
} as const;
