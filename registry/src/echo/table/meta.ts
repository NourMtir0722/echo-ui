import { z } from "zod";
import { typed } from "../../agent/typed";

const sortShape = z.object({ column: z.string(), direction: z.enum(["ascending", "descending"]) });

export const tableProps = z.object({
  caption: z
    .string()
    .describe("What the table is. Required; names both the table and its scroll region."),
  hideCaption: z
    .boolean()
    .default(false)
    .describe("Hide the caption visually. It still names the table."),
  striped: z
    .boolean()
    .default(false)
    .describe("Faint bands on alternate rows. For wide tables; the rules already separate rows."),
  size: z
    .enum(["sm", "md", "lg"])
    .optional()
    .describe("Row height from the control scale: sm 32px for dense screens, md 44px, lg 60px. Default md with `columns`; content height without."),
  columns: typed("TableColumn[]")
    .optional()
    .describe("Data mode: `{ key, header, value?, cell?, sortable?, align?, numeric?, rowHeader?, filterable? }` for each column. With `rows`, Table draws the head and body itself."),
  rows: z.array(z.unknown()).optional().describe("Data mode: the rows, in any shape; columns read them."),
  getRowId: z.function().optional().describe("Data mode: a stable id for a row. Selection is kept by it."),
  sort: sortShape.nullable().optional().describe("The sort, controlled: `{ column, direction }`, or null for none."),
  defaultSort: sortShape.nullable().optional().describe("The sort to start with, uncontrolled."),
  onSortChange: z.function().optional().describe("Called with the new sort when a header is pressed."),
  selectable: z
    .boolean()
    .default(false)
    .describe("A Checkbox on every row, and one in the header that selects every row shown (and reads 'some' when some are)."),
  selected: z.array(z.string()).optional().describe("Selected row ids, controlled."),
  defaultSelected: z.array(z.string()).optional().describe("Selected row ids to start with, uncontrolled."),
  onSelectedChange: z.function().optional().describe("Called with every selected row id."),
  filter: z.string().optional().describe("A query: rows with a value containing it stay. Set it from your own search Field."),
  filterRows: z.function().optional().describe("Your own filter, instead of 'any value contains the query'."),
  height: z
    .union([z.number(), z.string()])
    .optional()
    .describe("The table's own height (a number is pixels). It scrolls inside, and its header stays at the top."),
  virtual: z
    .boolean()
    .default(false)
    .describe("Draw only the rows in view, for thousands of rows. Needs `height`; each row is one line at the size's height."),
  loading: z.boolean().default(false).describe("Rows are on their way: placeholder rows, and a busy table."),
  empty: typed("ReactNode").optional().describe("What an empty table says. A filtered one says what matched nothing."),
  rowActions: z.function().optional().describe("The end of each row: `(row) => …` its actions (ghost HardwareButtons, a Menu)."),
  onRowPress: z
    .function()
    .optional()
    .describe("Makes each row a press: its label cell becomes a button, and a click anywhere else on the row presses it."),
});

export const meta = {
  name: "echo-table",
  title: "Table",
  description:
    "Rows of data in a recessed screen well. A real <table> with a real <caption>, compound parts for a table you lay out yourself, and a data mode for one you don't: given columns and rows it sorts (LED pips and aria-sort), selects (Checkbox, with a select-all that can read 'some'), filters, keeps its header at the top, windows thousands of rows, and shows loading and empty rows. Rows that move slide to their new place.",
  props: tableProps,
  examples: [
    {
      title: "Sort, select and filter",
      description:
        "Give it columns and rows. Pressing a sortable header sorts by it; `selectable` adds the checkboxes; `filter` comes from your own search Field.",
      code: [
        "const columns = [",
        '  { key: "take", header: "Take", rowHeader: true, sortable: true },',
        '  { key: "input", header: "Input", sortable: true },',
        '  { key: "length", header: "Length", numeric: true, sortable: true },',
        "];",
        "",
        "<>",
        '  <Field label="Search takes" type="search" value={query} onValueChange={setQuery} />',
        "  <Table",
        '    caption="Recent takes"',
        "    columns={columns}",
        "    rows={takes}",
        "    getRowId={(take) => take.id}",
        "    selectable",
        "    filter={query}",
        '    defaultSort={{ column: "take", direction: "ascending" }}',
        "  />",
        "</>",
      ].join("\n"),
    },
    {
      title: "Thousands of rows",
      description: "With a height and `virtual`, only the rows in view are drawn. The header stays at the top.",
      code: '<Table caption="Events" columns={columns} rows={events} getRowId={(e) => e.id} height={480} virtual size="sm" />',
    },
    {
      title: "Loading and empty",
      description: "Placeholder rows while the data is on its way; your own words when there's none.",
      code: '<Table caption="Invoices" columns={columns} rows={invoices ?? []} getRowId={(i) => i.id} loading={!invoices} empty="No invoices yet." />',
    },
    {
      title: "Row actions, and a row that opens",
      description: "`rowActions` ends each row; `onRowPress` makes the row a press, through a real button in its label cell.",
      code: '<Table caption="Projects" columns={columns} rows={projects} getRowId={(p) => p.id} onRowPress={(p) => open(p.id)} rowActions={(p) => <HardwareButton size="sm" variant="ghost" onClick={() => archive(p.id)}>Archive</HardwareButton>} />',
    },
    {
      title: "A readout you lay out yourself",
      description: "Numeric cells align to the end (the right, in left-to-right text) and use tabular figures.",
      code: '<Table caption="Recent takes">\n  <Table.Head>\n    <Table.Row>\n      <Table.HeaderCell>Take</Table.HeaderCell>\n      <Table.HeaderCell align="end">Length</Table.HeaderCell>\n    </Table.Row>\n  </Table.Head>\n  <Table.Body>\n    <Table.Row>\n      <Table.Cell>Room tone</Table.Cell>\n      <Table.Cell numeric>02:41</Table.Cell>\n    </Table.Row>\n  </Table.Body>\n</Table>',
    },
    {
      title: "Caption carried by the surrounding heading",
      description: "Hide it visually; it still names the table and its scroll region.",
      code: '<Table caption="Recent takes" hideCaption>…</Table>',
    },
  ],
  feel: "A readout ruled into rows: the numbers line up, the rules stay quiet, and a sorted column's pip lights up.",
  usage: {
    imports: 'import { Table } from "@/echo/table";',
    code: [
      "<Table",
      '  caption="Recent takes"',
      "  columns={[",
      '    { key: "take", header: "Take", rowHeader: true, sortable: true },',
      '    { key: "length", header: "Length", numeric: true, sortable: true },',
      "  ]}",
      "  rows={takes}",
      "  getRowId={(take) => take.id}",
      "  selectable",
      "/>",
    ].join("\n"),
  },
  composition:
    "Table (data: columns + rows)\n\nTable (compound)\n  Table.Head\n    Table.Row\n      Table.HeaderCell\n  Table.Body\n    Table.Row\n      Table.HeaderCell\n      Table.Cell",
  a11y: [
    "A real `<table>` with a required `caption`. `hideCaption` hides it visually but keeps it as the table's name.",
    "The table sits in a scroll region named by the caption and reachable by Tab, so a wide or tall table can be scrolled from the keyboard.",
    "A sortable column's header is a button: Enter or Space sorts by it, and again reverses it. The sorted column carries `aria-sort`, and the new sort is said aloud (\"Sorted by Length, descending\").",
    "Every row's Checkbox is named by its row (\"Select Room tone\"); the header's selects every row shown, and reads as mixed when only some are.",
    "What a filter leaves is said aloud (\"3 of 12 rows\"), and so is loading; a loading table is `aria-busy`.",
    "With `virtual`, the table carries `aria-rowcount` and each drawn row its `aria-rowindex`, so position is announced out of the whole.",
    "`onRowPress` puts a real button in the row's label cell: the keyboard presses the row there, and a click anywhere else on the row does too.",
    "Use `rowHeader` (or `scope=\"row\"` on a leading HeaderCell) so each row is announced by its label.",
  ],
  motion: {
    tokens: ["travel", "summon"],
    reducedMotion: "Rows take their new places at once and new rows appear without fading; a pressed row doesn't dip, and loading rows don't pulse.",
  },
  sound: ["The select click when a header sorts, a tap when a row is pressed, and the Checkbox's own click, inside a SoundProvider."],
  antiPatterns: [
    "Never use a table for layout. These are real table semantics, and a screen reader will announce rows and columns for something that has neither.",
    "Never drop the caption to save space: use hideCaption. An uncaptioned table is an unlabelled grid of numbers to anyone not looking at it, and its scroll region loses its name too.",
    "Never remove the tabIndex from the scroll container. An overflow region that cannot take focus is unreachable by keyboard; a mouse hides the bug completely.",
    "Never mix numeric and text cells in one column and set numeric on only some: the column stops aligning, which is the entire reason to mark numbers at all.",
    "Never sort or filter the rows yourself and in Table at once: give Table all the rows, and let `sort` and `filter` say how they show.",
    "Never set `virtual` without `height`: with nothing to scroll, there's no window, and every row is drawn anyway.",
    "Never give a row press a click handler on the row alone: `onRowPress` puts the button in the label cell, which is what the keyboard reaches.",
  ],
} as const;
