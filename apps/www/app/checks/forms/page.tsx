"use client";

import { useState } from "react";
import { Field } from "@registry/echo/field";
import { Textarea } from "@registry/echo/textarea";

/**
 * A test fixture: Field and Textarea with a description, an error, a custom
 * id and an outside hint, so tests/forms.spec.ts can check the wiring a
 * screen reader depends on.
 */
export default function FormsFixture() {
  const [email, setEmail] = useState("not-an-email");
  const error = email.includes("@") ? undefined : "Enter an email address, like ada@example.com.";
  return (
    <main style={{ padding: "var(--echo-space-10)", display: "grid", gap: "var(--echo-space-8)", maxWidth: 420 }}>
      <Field
        id="email"
        label="Email"
        description="We only use it to send the session link."
        error={error}
        value={email}
        onValueChange={setEmail}
      />
      <Field label="Plain" />
      <p id="outside-hint">Letters and numbers only.</p>
      <Field label="Code" aria-describedby="outside-hint" description="Six characters." />
      <Textarea
        label="Notes"
        description="Kept with the take."
        error="Notes can't be empty."
        defaultValue=""
      />
      <Textarea label="Grows" defaultValue="" />
      <p id="notes-hint">Markdown is fine.</p>
      <Textarea label="Hinted" aria-describedby="notes-hint" defaultValue="" />
    </main>
  );
}
