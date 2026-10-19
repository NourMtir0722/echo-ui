"use client";

import { useState } from "react";
import { Field } from "@registry/echo/field";
import { HardwareButton } from "@registry/echo/hardware-button";
import { Table, type TableColumn } from "@registry/echo/table";

/**
 * A test fixture for Table's data mode: sort, select, filter, row actions and
 * a row press on one table; two thousand rows windowed on another; and a
 * loading and an empty one. tests/table.spec.ts drives it.
 */
interface Take {
  id: string;
  take: string;
  input: number;
  seconds: number;
}

const TAKES: Take[] = [
  { id: "t1", take: "Room tone", input: 1, seconds: 161 },
  { id: "t2", take: "Vocal pass", input: 2, seconds: 67 },
  { id: "t3", take: "Guitar DI", input: 3, seconds: 753 },
  { id: "t4", take: "Kick close", input: 4, seconds: 212 },
  { id: "t5", take: "Overheads", input: 5, seconds: 348 },
];

const COLUMNS: TableColumn<Take>[] = [
  { key: "take", header: "Take", rowHeader: true, sortable: true },
  { key: "input", header: "Input", sortable: true, numeric: true },
  { key: "seconds", header: "Seconds", sortable: true, numeric: true },
];

interface Event {
  id: string;
  name: string;
  at: number;
}

const EVENTS: Event[] = Array.from({ length: 2000 }, (_, i) => ({ id: `e${i}`, name: `Event ${String(i + 1).padStart(4, "0")}`, at: i }));
const EVENT_COLUMNS: TableColumn<Event>[] = [
  { key: "name", header: "Event", rowHeader: true },
  { key: "at", header: "Index", numeric: true },
];

export default function TableFixture() {
  const [query, setQuery] = useState("");
  const [pressed, setPressed] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  return (
    <main style={{ padding: "var(--echo-space-10)", display: "grid", gap: "var(--echo-space-10)", maxWidth: 720 }}>
      <h1>Table fixture</h1>
      <section style={{ display: "grid", gap: "var(--echo-space-6)" }}>
        <Field label="Search takes" type="search" value={query} onValueChange={setQuery} />
        <Table
          id="takes"
          caption="Recent takes"
          columns={COLUMNS}
          rows={TAKES}
          getRowId={(t) => t.id}
          selectable
          selected={selected}
          onSelectedChange={setSelected}
          filter={query}
          onRowPress={(t) => setPressed(t.take)}
          rowActions={(t) => (
            <HardwareButton size="sm" variant="ghost" aria-label={`Delete ${t.take}`} onClick={() => setPressed(`delete ${t.take}`)}>
              Delete
            </HardwareButton>
          )}
        />
        <p id="pressed">{pressed}</p>
        <p id="selected">{selected.join(",")}</p>
      </section>
      <Table id="events" caption="Events" columns={EVENT_COLUMNS} rows={EVENTS} getRowId={(e) => e.id} height={320} virtual size="sm" />
      <Table id="loading" caption="Invoices" columns={COLUMNS} rows={[]} getRowId={(t) => t.id} loading />
      <Table id="empty" caption="Drafts" columns={COLUMNS} rows={[]} getRowId={(t) => t.id} empty="No drafts yet." />
    </main>
  );
}
