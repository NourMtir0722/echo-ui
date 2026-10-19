/**
 * Table. Rows of data in a recessed screen well.
 *
 * Two ways in, one component:
 *
 * - **Compound**, for content you lay out yourself:
 *     <Table caption="…">
 *       <Table.Head><Table.Row><Table.HeaderCell>…</Table.HeaderCell></Table.Row></Table.Head>
 *       <Table.Body><Table.Row><Table.Cell>…</Table.Cell></Table.Row></Table.Body>
 *     </Table>
 * - **Data**, for rows Table can sort, select, filter and window for you:
 *     <Table caption="…" columns={columns} rows={rows} getRowId={(r) => r.id} />
 *   (table-data.tsx, a client component; this file stays usable from a
 *   server component when it's given children).
 *
 * Two a11y decisions worth keeping:
 *
 * 1. The caption is required and rendered as a real <caption>. A table
 *    without one is an unlabelled grid of numbers to anyone not looking at it.
 * 2. A wide table scrolls inside a container that is a labelled, FOCUSABLE
 *    region. An overflow container that cannot take focus is unreachable by
 *    keyboard — axe flags exactly this, and it is easy to ship without
 *    noticing because a mouse hides the problem.
 *
 * Consumes only var(--echo-*) via table.css.
 */
import type { HTMLAttributes, ReactElement, ReactNode, TdHTMLAttributes, ThHTMLAttributes } from "react";
import { TableData, type TableDataProps } from "./table-data";
import "./table.css";

const cx = (...c: (string | undefined)[]) => c.filter(Boolean).join(" ");

export type CellAlign = "start" | "end";

/** Row height, from the control scale: `sm` 32px for dense screens, `md` 44px, `lg` 60px (at default density). */
export type TableSize = "sm" | "md" | "lg";

export interface TableProps extends HTMLAttributes<HTMLTableElement> {
  /** What this table is. Required — it names the table and its scroll region. */
  caption: string;
  /** Hide the caption visually. It still names the table and its region. */
  hideCaption?: boolean;
  /**
   * Alternate rows carry a faint band. Off by default — the rules already
   * separate rows; stripes earn their place on wide tables, where the eye has
   * to carry a row across a long gap.
   */
  striped?: boolean;
  /** Each row's height, from the control scale. Left out, rows are as tall as their content. */
  size?: TableSize;
  children?: ReactNode;
}

/*
 * `Row` defaults to `any` for rows TypeScript can't read (JSON, say): with
 * nothing to infer from, it would be `unknown`, and `getRowId={(row) => row.id}`
 * wouldn't compile. Typed rows are inferred as usual.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function TableRoot<Row = any>(props: TableProps | TableDataProps<Row>): ReactElement {
  if ("columns" in props) return <TableData {...props} />;
  const { caption, hideCaption, striped, size, className, children, ...rest } = props;
  return (
    <div
      className="echo-table__scroll"
      role="region"
      aria-label={caption}
      // Keyboard users must be able to reach and scroll a wide table.
      tabIndex={0}
    >
      <table className={cx("echo-table", className)} data-striped={striped ? "" : undefined} data-size={size} {...rest}>
        <caption className={cx("echo-table__caption", hideCaption ? "echo-table__sr" : undefined)}>
          {caption}
        </caption>
        {children}
      </table>
    </div>
  );
}

function TableHead({ className, ...rest }: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cx("echo-table__head", className)} {...rest} />;
}

function TableBody({ className, ...rest }: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cx("echo-table__body", className)} {...rest} />;
}

function TableRow({ className, ...rest }: HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cx("echo-table__row", className)} {...rest} />;
}

/**
 * `align` shadows the deprecated HTML presentation attribute, which only
 * accepts left/right/center. Omitting it lets the prop take the logical
 * start/end values instead — and the legacy attribute is not worth keeping.
 */
export interface HeaderCellProps extends Omit<ThHTMLAttributes<HTMLTableCellElement>, "align"> {
  align?: CellAlign;
  /** "col" (default) for a column heading, "row" for a leading row label. */
  scope?: "col" | "row";
}

function TableHeaderCell({ className, align = "start", scope = "col", ...rest }: HeaderCellProps) {
  return (
    <th
      className={cx("echo-table__header-cell", className)}
      data-align={align}
      scope={scope}
      {...rest}
    />
  );
}

export interface CellProps extends Omit<TdHTMLAttributes<HTMLTableCellElement>, "align"> {
  align?: CellAlign;
  /** Tabular figures and end alignment for numbers. */
  numeric?: boolean;
}

function TableCell({ className, align, numeric, ...rest }: CellProps) {
  return (
    <td
      className={cx("echo-table__cell", className)}
      data-align={align ?? (numeric ? "end" : "start")}
      data-numeric={numeric ? "" : undefined}
      {...rest}
    />
  );
}

export const Table = Object.assign(TableRoot, {
  Head: TableHead,
  Body: TableBody,
  Row: TableRow,
  HeaderCell: TableHeaderCell,
  Cell: TableCell,
});
