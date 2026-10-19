"use client";

/** The live preview on /docs/fieldset. */
import { Field } from "@registry/echo/field";
import { Fieldset } from "@registry/echo/fieldset";

export default function Preview() {
  return (
    <div style={{ width: "min(380px, 100%)" }}>
      <Fieldset legend="Shipping address" description="Where the device goes.">
        <Field label="Street" name="street" />
        <Field label="City" name="city" />
      </Fieldset>
    </div>
  );
}
