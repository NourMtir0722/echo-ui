"use client";

/** The live preview on /docs/table: the data mode, sorted, selectable, and filtered by a search Field. */
import { useState } from "react";
import { Field } from "@registry/echo/field";
import { Table, type TableColumn } from "@registry/echo/table";

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

const clock = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

const COLUMNS: TableColumn<Take>[] = [
  { key: "take", header: "Take", rowHeader: true, sortable: true },
  { key: "input", header: "Input", sortable: true, numeric: true },
  { key: "length", header: "Length", sortable: true, numeric: true, value: (t) => t.seconds, cell: (t) => clock(t.seconds) },
];

export default function Preview() {
  const [query, setQuery] = useState("");
  return (
    <div style={{ display: "grid", gap: "var(--echo-space-6)", inlineSize: "min(100%, 34rem)" }}>
      <Field label="Search takes" type="search" value={query} onValueChange={setQuery} />
      <Table
        caption="Recent takes"
        columns={COLUMNS}
        rows={TAKES}
        getRowId={(t) => t.id}
        selectable
        filter={query}
        defaultSort={{ column: "take", direction: "ascending" }}
      />
    </div>
  );
}
