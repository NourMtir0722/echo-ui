"use client";

/** The live preview on /docs/checkbox. */
import { Checkbox } from "@registry/echo/checkbox";
import { Labeled } from "./shared/main-Labeled";
import { row } from "./shared/main-row";

export default function Preview() {
  return (
    <div style={row}>
      <Labeled label="armed">
        <Checkbox defaultChecked aria-label="Armed" />
      </Labeled>
      <Labeled label="idle">
        <Checkbox aria-label="Idle" />
      </Labeled>
      <Labeled label="mixed">
        <Checkbox indeterminate aria-label="Mixed" />
      </Labeled>
    </div>
  );
}
