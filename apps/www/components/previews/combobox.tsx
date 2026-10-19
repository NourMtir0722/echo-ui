"use client";

/** The live preview on /docs/combobox. */
import { Combobox } from "@registry/echo/combobox";

const COUNTRIES = ["Argentina", "Australia", "Brazil", "Canada", "Denmark", "Egypt", "France", "Germany", "Japan", "Kenya", "Mexico", "Norway", "Portugal", "Tunisia", "Vietnam"].map((c) => ({ value: c.toLowerCase(), label: c }));

const PEOPLE = [
  { value: "ada", label: "Ada Lovelace" },
  { value: "alan", label: "Alan Turing" },
  { value: "grace", label: "Grace Hopper" },
  { value: "katherine", label: "Katherine Johnson" },
];

const LABELS = ["bug", "design", "docs", "motion"].map((l) => ({ value: l, label: l }));

export default function Preview() {
  return (
    <div style={{ display: "grid", gap: 18, width: "min(380px, 100%)" }}>
      <Combobox label="Country" options={COUNTRIES} placeholder="Start typing" />
      <Combobox label="Assignees" options={PEOPLE} multiple defaultValue={["ada"]} />
      <Combobox label="Labels" options={LABELS} multiple creatable placeholder="Type to add" />
    </div>
  );
}
