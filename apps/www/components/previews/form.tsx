"use client";

/** The live preview on /docs/form. */
import { Field } from "@registry/echo/field";
import { Form } from "@registry/echo/form";
import { HardwareButton } from "@registry/echo/hardware-button";
import { useState } from "react";

function FormPreview() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [tried, setTried] = useState(false);
  const [done, setDone] = useState(false);
  return (
    <div style={{ width: "min(400px, 100%)" }}>
      <Form
        aria-label="Create account"
        errors={errors}
        showSummary={tried}
        onSubmit={(v) => {
          const next: Record<string, string> = {};
          if (!String(v.name ?? "").trim()) next.name = "Enter your name";
          if (!/^\S+@\S+\.\S+$/.test(String(v.email ?? ""))) next.email = "Enter an email address, like ada@example.com";
          setErrors(next);
          setTried(Object.keys(next).length > 0);
          setDone(Object.keys(next).length === 0);
        }}
      >
        <Field id="name" name="name" label="Name" error={errors.name} />
        <Field id="email" name="email" label="Email" error={errors.email} />
        <HardwareButton type="submit" variant="primary">
          {done ? "Account created" : "Create account"}
        </HardwareButton>
      </Form>
    </div>
  );
}

export default function Preview() {
  return <FormPreview />;
}
