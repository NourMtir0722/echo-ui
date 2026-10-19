"use client";

/**
 * Table's data mode: give it `columns` and `rows`, and it sorts, selects,
 * filters and windows them, in the same recessed well as a table laid out by
 * hand.
 *
 * - **Sort:** a sortable column's header is a button; its LED pips light the
 *   direction, and the header carries `aria-sort`. Controlled (`sort` and
 *   `onSortChange`) or not (`defaultSort`).
 * - **Select:** `selectable` puts a Checkbox on every row and one in the
 *   header that selects every row shown, and reads "some" when some are.
 *   Controlled (`selected`) or not (`defaultSelected`), by row id.
 * - **Filter:** `filter` is the query (the builder's own search Field sets
 *   it); a row stays when any of its column values contains it.
 * - **Size:** row heights from the control scale (`sm`, `md`, `lg`).
 * - **Height:** a table with its own `height` scrolls inside the well, and
 *   its header stays at the top.
 * - **Virtual rows:** with `virtual`, only the rows in view are drawn. Every
 *   row is exactly one control height, so nothing is measured: the window is
 *   arithmetic, and there's no dependency.
 * - **Empty and loading:** a row that says so, and a table that's busy.
 * - **Row actions** end each row; **`onRowPress`** makes the row a press,
 *   through a real button in its label cell.
 * - **Motion:** rows that move slide to their new place and new rows fade in
 *   (FLIP); a pressed row gives under the hand. Neither under reduced motion.
 *
 * What changes is said in a polite live region: the sort, how many rows a
 * filter leaves, and loading.
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type HTMLAttributes, type MouseEvent, type ReactNode } from "react";
import gsap from "gsap";
import { useSoundOptional } from "echo-ui-core/sound";
import { timing, useReducedMotionRef } from "echo-ui-core/tactile";
import { Checkbox } from "../checkbox";
import type { CellAlign, TableSize } from "./table";

const cx = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(" ");

export type SortDirection = "ascending" | "descending";

export interface TableSort {
  /** The `key` of the column. */
  column: string;
  direction: SortDirection;
}

/** What a column holds for a row: what's sorted, filtered and, without a `cell`, shown. */
export type CellValue = string | number | Date | null | undefined;

export interface TableColumn<Row> {
  /** The column's id, and the row field it reads when there's no `value`. */
  key: string;
  /** The column's name: its heading, its sort button's name, and what the sort is announced by. */
  header: string;
  /** The value for a row. Default: `row[key]`. */
  value?: (row: Row) => CellValue;
  /** How the cell shows. Default: the value as text. */
  cell?: (row: Row) => ReactNode;
  sortable?: boolean;
  align?: CellAlign;
  /** Tabular figures and end alignment. */
  numeric?: boolean;
  /** This column names the row: its cells are row headers, and a row's checkbox is named by it. */
  rowHeader?: boolean;
  /** Include it when filtering. Default true. */
  filterable?: boolean;
}

export interface TableDataProps<Row> extends Omit<HTMLAttributes<HTMLTableElement>, "children"> {
  /** What this table is. Required — it names the table and its scroll region. */
  caption: string;
  /** Hide the caption visually. It still names the table and its region. */
  hideCaption?: boolean;
  /** Faint bands on alternate rows. */
  striped?: boolean;
  /** Row height from the control scale. Default `md`. */
  size?: TableSize;
  columns: readonly TableColumn<Row>[];
  rows: readonly Row[];
  /** A stable id for a row: what selection is kept by. */
  getRowId: (row: Row) => string;
  /** The sort, controlled. `null` is unsorted. */
  sort?: TableSort | null;
  defaultSort?: TableSort | null;
  onSortChange?: (sort: TableSort) => void;
  /** A Checkbox on every row, and a select-all in the header. */
  selectable?: boolean;
  /** Selected row ids, controlled. */
  selected?: readonly string[];
  defaultSelected?: readonly string[];
  onSelectedChange?: (selected: string[]) => void;
  /** A query: rows whose values contain it stay. */
  filter?: string;
  /** Your own filter, instead of "any value contains the query". */
  filterRows?: (row: Row, query: string) => boolean;
  /** The table's own height (a number is pixels): it scrolls inside, with its header at the top. */
  height?: number | string;
  /** Draw only the rows in view. Needs `height`. */
  virtual?: boolean;
  /** Rows are on their way: placeholder rows, and a busy table. */
  loading?: boolean;
  /** What an empty table says. */
  empty?: ReactNode;
  /** The end of each row: its actions (a Menu, ghost HardwareButtons). */
  rowActions?: (row: Row) => ReactNode;
  /** Make each row a press: its label cell becomes a button, and a click anywhere on the row presses it. */
  onRowPress?: (row: Row) => void;
}

const STEP: Record<TableSize, string> = { sm: "compact", md: "default", lg: "large" };
const DEFAULT_HEIGHT: Record<TableSize, number> = { sm: 32, md: 44, lg: 60 };
/** Rows drawn beyond the view on each side, so a quick scroll doesn't show the gap. */
const OVERSCAN = 6;
/** Above this many rows, moves are not animated: the FLIP costs more than it shows. */
const MOST_ANIMATED = 200;
const LOADING_ROWS = 5;

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

function compare(a: CellValue, b: CellValue): number {
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
  if (typeof a === "number" && typeof b === "number") return a - b;
  return collator.compare(String(a), String(b));
}

const text = (value: CellValue) => (value == null ? "" : value instanceof Date ? value.toLocaleDateString() : String(value));

/** Nothing in a row's own controls presses the row: they have jobs of their own. */
const INTERACTIVE = "button, a, input, select, textarea, [role='checkbox'], [role='button'], [role='menuitem']";

export function TableData<Row>({
  caption,
  hideCaption,
  striped,
  size = "md",
  columns,
  rows,
  getRowId,
  sort: sortProp,
  defaultSort = null,
  onSortChange,
  selectable,
  selected: selectedProp,
  defaultSelected = [],
  onSelectedChange,
  filter = "",
  filterRows,
  height,
  virtual,
  loading,
  empty,
  rowActions,
  onRowPress,
  className,
  ...rest
}: TableDataProps<Row>) {
  const sound = useSoundOptional();
  const reduced = useReducedMotionRef();
  const [innerSort, setInnerSort] = useState<TableSort | null>(defaultSort);
  const sort = sortProp === undefined ? innerSort : sortProp;
  const [innerSelected, setInnerSelected] = useState<readonly string[]>(defaultSelected);
  const selectedIds = selectedProp ?? innerSelected;
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const [said, setSaid] = useState("");

  const valueOf = (column: TableColumn<Row>, row: Row): CellValue =>
    column.value ? column.value(row) : ((row as Record<string, unknown>)[column.key] as CellValue);
  const labelColumn = columns.find((c) => c.rowHeader) ?? columns[0];
  const labelOf = (row: Row) => (labelColumn ? text(valueOf(labelColumn, row)) : getRowId(row)) || getRowId(row);

  // The rows as shown: filtered, then sorted (a stable sort, empty values last either way).
  const query = filter.trim().toLowerCase();
  const shown = useMemo(() => {
    const kept = query
      ? rows.filter((row) =>
          filterRows
            ? filterRows(row, filter)
            : columns.some((c) => c.filterable !== false && text(valueOf(c, row)).toLowerCase().includes(query)),
        )
      : [...rows];
    const by = sort && columns.find((c) => c.key === sort.column);
    if (!by) return kept;
    const sign = sort.direction === "ascending" ? 1 : -1;
    return kept
      .map((row, index) => ({ row, index, value: valueOf(by, row) }))
      .sort((a, b) => {
        if (a.value == null || b.value == null) return a.value == null ? (b.value == null ? a.index - b.index : 1) : -1;
        return sign * compare(a.value, b.value) || a.index - b.index;
      })
      .map((entry) => entry.row);
    // valueOf reads only `columns`, already a dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, columns, sort, query, filter, filterRows]);

  // Said when it changes, not on arrival: loading starting and ending, and what a filter leaves.
  const before = useRef({ loading, query });
  useEffect(() => {
    const was = before.current;
    before.current = { loading, query };
    if (loading && !was.loading) setSaid("Loading rows.");
    else if (!loading && was.loading) setSaid(`${shown.length} rows.`);
    else if (!loading && query !== was.query) setSaid(query ? `${shown.length} of ${rows.length} rows.` : `${rows.length} rows.`);
  }, [loading, query, shown.length, rows.length]);

  /* ----------------------------------------------------------------- sort */

  const setSort = (column: TableColumn<Row>) => {
    const next: TableSort =
      sort?.column === column.key
        ? { column: column.key, direction: sort.direction === "ascending" ? "descending" : "ascending" }
        : { column: column.key, direction: "ascending" };
    if (sortProp === undefined) setInnerSort(next);
    onSortChange?.(next);
    sound?.play("select");
    setSaid(`Sorted by ${column.header}, ${next.direction}.`);
  };

  /* ------------------------------------------------------------ selection */

  const setSelected = (next: string[]) => {
    if (selectedProp === undefined) setInnerSelected(next);
    onSelectedChange?.(next);
  };
  const shownIds = shown.map(getRowId);
  const allShown = shownIds.length > 0 && shownIds.every((id) => selectedSet.has(id));
  const someShown = !allShown && shownIds.some((id) => selectedSet.has(id));
  const selectAll = (on: boolean) => {
    const others = selectedIds.filter((id) => !shownIds.includes(id));
    setSelected(on ? [...others, ...shownIds] : others);
  };
  const selectRow = (id: string, on: boolean) =>
    setSelected(on ? [...selectedIds.filter((s) => s !== id), id] : selectedIds.filter((s) => s !== id));

  /* ------------------------------------------------ the window (virtual) */

  const scroll = useRef<HTMLDivElement>(null);
  const [rowHeight, setRowHeight] = useState(DEFAULT_HEIGHT[size]);
  const [view, setView] = useState({ top: 0, height: 0 });
  useLayoutEffect(() => {
    const el = scroll.current;
    if (!el) return;
    // The row height is the size's control token: read, not measured.
    const px = parseFloat(getComputedStyle(el).getPropertyValue(`--echo-control-${STEP[size]}`));
    if (px) setRowHeight(px);
    if (!virtual) return;
    let frame = 0;
    const read = () => {
      frame = 0;
      setView({ top: el.scrollTop, height: el.clientHeight });
    };
    const soon = () => {
      if (!frame) frame = requestAnimationFrame(read);
    };
    read();
    el.addEventListener("scroll", soon, { passive: true });
    const resized = new ResizeObserver(soon);
    resized.observe(el);
    return () => {
      el.removeEventListener("scroll", soon);
      resized.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, [size, virtual]);
  const windowed = !!virtual && !loading;
  const start = windowed ? Math.max(0, Math.floor(view.top / rowHeight) - OVERSCAN) : 0;
  const end = windowed ? Math.min(shown.length, start + Math.ceil((view.height || 600) / rowHeight) + 2 * OVERSCAN) : shown.length;
  const drawn = shown.slice(start, end);

  /* --------------------------------------------------------------- motion */

  const rowEls = useRef(new Map<string, HTMLTableRowElement>());
  const tops = useRef(new Map<string, number>());
  const order = drawn.map(getRowId).join("\u0000");
  const lastOrder = useRef(order);
  useLayoutEffect(() => {
    // Windowed rows come and go with the scroll: there's nothing to slide, and nothing worth measuring.
    if (windowed) return;
    const table = scroll.current?.querySelector("table");
    const origin = table?.getBoundingClientRect().top ?? 0;
    const now = new Map([...rowEls.current].map(([id, el]) => [id, el.getBoundingClientRect().top - origin]));
    const was = tops.current;
    tops.current = now;
    const moved = lastOrder.current !== order;
    lastOrder.current = order;
    if (!moved || !was.size || reduced.current || now.size > MOST_ANIMATED) return;
    for (const [id, el] of rowEls.current) {
      const from = was.get(id);
      if (from === undefined) {
        gsap.fromTo(el, { opacity: 0, y: -6 }, { opacity: 1, y: 0, ...timing("summon"), clearProps: "opacity,transform" });
        continue;
      }
      const dy = from - (now.get(id) ?? from);
      if (dy) gsap.fromTo(el, { y: dy }, { y: 0, ...timing("travel"), overwrite: "auto", clearProps: "transform" });
    }
  });

  const press = (row: Row) => {
    sound?.play("tap");
    onRowPress?.(row);
  };
  const onRowClick = (row: Row) => (event: MouseEvent<HTMLTableRowElement>) => {
    if (!onRowPress || (event.target as Element).closest(INTERACTIVE)) return;
    press(row);
  };

  /* ---------------------------------------------------------------- draw */

  const columnCount = columns.length + (selectable ? 1 : 0) + (rowActions ? 1 : 0);
  const scrollStyle: CSSProperties | undefined = height === undefined ? undefined : { maxHeight: typeof height === "number" ? `${height}px` : height };

  return (
    <div
      ref={scroll}
      className="echo-table__scroll"
      role="region"
      aria-label={caption}
      tabIndex={0}
      style={scrollStyle}
      data-height={height === undefined ? undefined : ""}
    >
      <table
        className={cx("echo-table", className)}
        data-striped={striped ? "" : undefined}
        data-size={size}
        data-sticky={height === undefined ? undefined : ""}
        data-virtual={windowed ? "" : undefined}
        aria-busy={loading || undefined}
        aria-rowcount={windowed ? shown.length + 1 : undefined}
        {...rest}
      >
        <caption className={cx("echo-table__caption", hideCaption && "echo-table__sr")}>{caption}</caption>
        <thead className="echo-table__head">
          <tr className="echo-table__row" aria-rowindex={windowed ? 1 : undefined}>
            {selectable ? (
              <th className="echo-table__header-cell echo-table__select" scope="col">
                <Checkbox
                  aria-label="Select every row shown"
                  checked={allShown}
                  indeterminate={someShown}
                  onCheckedChange={(on) => selectAll(on)}
                />
              </th>
            ) : null}
            {columns.map((column) => {
              const active = sort?.column === column.key ? sort.direction : undefined;
              const align = column.align ?? (column.numeric ? "end" : "start");
              return (
                <th
                  key={column.key}
                  className="echo-table__header-cell"
                  data-align={align}
                  scope="col"
                  aria-sort={active}
                >
                  {column.sortable ? (
                    <button type="button" className="echo-table__sort" onClick={() => setSort(column)} data-active={active}>
                      <span>{column.header}</span>
                      <span className="echo-table__pips" aria-hidden>
                        <i data-lit={active === "ascending" ? "" : undefined} />
                        <i data-lit={active === "descending" ? "" : undefined} />
                      </span>
                    </button>
                  ) : (
                    column.header
                  )}
                </th>
              );
            })}
            {rowActions ? (
              <th className="echo-table__header-cell echo-table__actions" scope="col">
                <span className="echo-table__sr">Actions</span>
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody className="echo-table__body">
          {loading ? (
            Array.from({ length: LOADING_ROWS }, (_, i) => (
              <tr key={`loading-${i}`} className="echo-table__row echo-table__loading" aria-hidden>
                {Array.from({ length: columnCount }, (_, j) => (
                  <td key={j} className="echo-table__cell">
                    <span className="echo-table__skeleton" style={{ "--echo-table-skeleton": `${55 + ((i * 7 + j * 13) % 40)}%` } as CSSProperties} />
                  </td>
                ))}
              </tr>
            ))
          ) : shown.length === 0 ? (
            <tr className="echo-table__row">
              <td className="echo-table__cell echo-table__empty" colSpan={columnCount}>
                {query ? `Nothing matches “${filter.trim()}”.` : (empty ?? "Nothing here yet.")}
              </td>
            </tr>
          ) : (
            <>
              {start > 0 ? (
                <tr className="echo-table__spacer" aria-hidden style={{ height: start * rowHeight }}>
                  <td colSpan={columnCount} />
                </tr>
              ) : null}
              {drawn.map((row, i) => {
                const id = getRowId(row);
                const on = selectedSet.has(id);
                return (
                  <tr
                    key={id}
                    ref={(el) => {
                      if (el) rowEls.current.set(id, el);
                      else rowEls.current.delete(id);
                    }}
                    className="echo-table__row"
                    aria-rowindex={windowed ? start + i + 2 : undefined}
                    data-selected={on ? "" : undefined}
                    data-pressable={onRowPress ? "" : undefined}
                    onClick={onRowPress ? onRowClick(row) : undefined}
                  >
                    {selectable ? (
                      <td className="echo-table__cell echo-table__select">
                        <Checkbox aria-label={`Select ${labelOf(row)}`} checked={on} onCheckedChange={(next) => selectRow(id, next)} />
                      </td>
                    ) : null}
                    {columns.map((column) => {
                      const align = column.align ?? (column.numeric ? "end" : "start");
                      const content = column.cell ? column.cell(row) : text(valueOf(column, row));
                      const pressable = onRowPress && column === labelColumn;
                      const inner = pressable ? (
                        <button type="button" className="echo-table__press" onClick={() => press(row)}>
                          {content}
                        </button>
                      ) : (
                        content
                      );
                      return column.rowHeader ? (
                        <th key={column.key} className="echo-table__header-cell" scope="row" data-align={align}>
                          {inner}
                        </th>
                      ) : (
                        <td key={column.key} className="echo-table__cell" data-align={align} data-numeric={column.numeric ? "" : undefined}>
                          {inner}
                        </td>
                      );
                    })}
                    {rowActions ? <td className="echo-table__cell echo-table__actions">{rowActions(row)}</td> : null}
                  </tr>
                );
              })}
              {end < shown.length ? (
                <tr className="echo-table__spacer" aria-hidden style={{ height: (shown.length - end) * rowHeight }}>
                  <td colSpan={columnCount} />
                </tr>
              ) : null}
            </>
          )}
        </tbody>
      </table>
      <p className="echo-table__sr" role="status" aria-live="polite">
        {said}
      </p>
    </div>
  );
}
