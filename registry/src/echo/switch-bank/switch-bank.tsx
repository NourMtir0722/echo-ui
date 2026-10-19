"use client";

/**
 * SwitchBank. Settings that come in a grid (notifications by event and
 * channel, permissions by role and resource, a schedule by day) as a bank of
 * Switches in a Table: a column header for each channel, a row header for
 * each event, and one Switch where they cross. A Checkbox in each column's
 * header flips the whole column, and shows a dash when the column is mixed.
 *
 * It's a real table, so a screen reader reads each Switch with its row and
 * column, and every Switch is also named with both ("Push, Mentions").
 */
import { forwardRef, useState } from "react";
import type { EchoInterop } from "echo-ui-core/types";
import { Table } from "../table";
import { Switch } from "../switch";
import { Checkbox } from "../checkbox";
import "./switch-bank.css";

export interface SwitchBankAxis {
  value: string;
  label: string;
}

/** Which switches are on, as "row:column" keys: "mentions:push". */
export type SwitchBankValue = readonly string[];

export interface SwitchBankProps extends EchoInterop {
  /** What the bank sets: the table's caption ("Notifications"). */
  label: string;
  /** Hide the caption visually; it still names the table. */
  hideLabel?: boolean;
  /** The columns: the channels, roles or days. */
  columns: readonly SwitchBankAxis[];
  /** The rows: the events, resources or times. */
  rows: readonly SwitchBankAxis[];
  /** What's on, as "row:column" keys (controlled). */
  value?: SwitchBankValue;
  defaultValue?: SwitchBankValue;
  onValueChange?: (value: string[]) => void;
}

const keyOf = (row: string, column: string) => `${row}:${column}`;

/**
 * `forwardRef`, not a `ref` prop — see the note on `Field`. The ref lands on
 * the first Switch, where a form library puts focus.
 */
export const SwitchBank = forwardRef<HTMLButtonElement, SwitchBankProps>(function SwitchBank(
  { label, hideLabel, columns, rows, value, defaultValue, onValueChange, disabled, name, ...interop },
  ref,
) {
  const [inner, setInner] = useState<SwitchBankValue>(defaultValue ?? []);
  const on = new Set(value ?? inner);
  const set = (next: Set<string>) => {
    const list = [...next];
    if (value === undefined) setInner(list);
    onValueChange?.(list);
  };
  const flip = (key: string, to: boolean) => {
    const next = new Set(on);
    if (to) next.add(key);
    else next.delete(key);
    set(next);
  };
  const flipColumn = (column: string, to: boolean) => {
    const next = new Set(on);
    for (const row of rows) {
      if (to) next.add(keyOf(row.value, column));
      else next.delete(keyOf(row.value, column));
    }
    set(next);
  };

  return (
    <div className="echo-switch-bank" {...interop}>
      <Table caption={label} hideCaption={hideLabel}>
        <Table.Head>
          <Table.Row>
            <Table.HeaderCell>
              <span className="echo-switch-bank__corner">{label}</span>
            </Table.HeaderCell>
            {columns.map((column) => {
              const count = rows.filter((row) => on.has(keyOf(row.value, column.value))).length;
              return (
                <Table.HeaderCell key={column.value} align="start">
                  <span className="echo-switch-bank__column">
                    <Checkbox
                      checked={count === rows.length}
                      indeterminate={count > 0 && count < rows.length}
                      onCheckedChange={(checked) => flipColumn(column.value, checked)}
                      disabled={disabled}
                      aria-label={`All ${column.label}`}
                    />
                    <span>{column.label}</span>
                  </span>
                </Table.HeaderCell>
              );
            })}
          </Table.Row>
        </Table.Head>
        <Table.Body>
          {rows.map((row, r) => (
            <Table.Row key={row.value}>
              <Table.HeaderCell scope="row">{row.label}</Table.HeaderCell>
              {columns.map((column, c) => {
                const key = keyOf(row.value, column.value);
                return (
                  <Table.Cell key={column.value}>
                    <Switch
                      ref={r === 0 && c === 0 ? ref : undefined}
                      checked={on.has(key)}
                      onCheckedChange={(checked) => flip(key, checked)}
                      disabled={disabled}
                      aria-label={`${column.label}, ${row.label}`}
                    />
                  </Table.Cell>
                );
              })}
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
      {name ? [...on].map((key) => <input key={key} type="hidden" name={name} value={key} />) : null}
    </div>
  );
});
