"use client";

import { useState, type FormEvent } from "react";
import { DateField } from "@registry/echo/date-field";

/**
 * A test fixture for DateField: typed and stepped in three locales, and
 * in Arabic and Hebrew on a right-to-left page, limits said in words, an error, disabled and read-only, and
 * a form it submits its ISO date to. tests/date-field.spec.ts drives it.
 */
export default function DateFieldChecks() {
  const [birthday, setBirthday] = useState("");
  const [start, setStart] = useState("2026-09-28");
  const [sent, setSent] = useState("");
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSent(String(new FormData(event.currentTarget).get("due") ?? ""));
  };

  return (
    <main style={{ display: "grid", gap: 24, maxWidth: 360, padding: 24 }}>
      <section id="us">
        <DateField label="Date of birth" locale="en-US" value={birthday} onValueChange={setBirthday} />
        <output id="us-value">{birthday || "none"}</output>
      </section>

      <section id="gb">
        <DateField label="Arrival" locale="en-GB" defaultValue="2024-01-31" />
      </section>

      <section id="de">
        <DateField label="Datum" locale="de" />
      </section>

      <section id="rtl" dir="rtl">
        <DateField label="Departure" locale="ar-EG" defaultValue="2026-03-15" />
      </section>

      <section id="he" dir="rtl">
        <DateField label="Return" locale="he-IL" defaultValue="2026-03-15" />
      </section>

      <section id="limits">
        <DateField
          label="Start date"
          locale="en-US"
          value={start}
          onValueChange={setStart}
          min="2026-01-01"
          max="2026-12-31"
          unavailable={(iso) => iso === "2026-12-25"}
          description="Any day this year."
        />
        <output id="limits-value">{start || "none"}</output>
      </section>

      <section id="error">
        <DateField label="Renewal" locale="en-US" defaultValue="2020-02-29" error="That plan has ended. Choose a date after today." />
      </section>

      <section id="states">
        <DateField label="Locked" locale="en-US" defaultValue="2026-09-28" disabled />
        <DateField label="Signed" locale="en-US" defaultValue="2026-09-28" readOnly />
      </section>

      <form id="form" onSubmit={submit}>
        <DateField label="Due" locale="en-US" name="due" defaultValue="2026-10-02" />
        <button type="submit">Send</button>
        <output id="form-value">{sent || "not sent"}</output>
      </form>
    </main>
  );
}
