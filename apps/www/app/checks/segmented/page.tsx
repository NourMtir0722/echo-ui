"use client";

import { useState } from "react";

import { DirectionProvider } from "@base-ui/react/direction-provider";
import { Segmented } from "@registry/echo/segmented";

/**
 * A test fixture for Segmented's keyboard contract: a disabled segment, an
 * out-of-range value, right-to-left, and two segments that share a label.
 * tests/segmented.spec.ts drives it.
 */

/**
 * Labels are not identities: a filtered list can repeat one, and the list can
 * change while it does. Keyed by label, the repeat collided with the first.
 */
function RepeatedLabels() {
  const [options, setOptions] = useState(["Draft", "Sent", "Draft"]);
  return (
    <div style={{ display: "grid", gap: "var(--echo-space-3)", justifyItems: "start" }}>
      <Segmented aria-label="Repeated labels" options={options} />
      <button type="button" onClick={() => setOptions(["Sent", "Draft", "Draft"])}>
        Rotate
      </button>
    </div>
  );
}
export default function SegmentedFixture() {
  return (
    <main style={{ padding: "var(--echo-space-10)", display: "grid", gap: "var(--echo-space-8)", justifyItems: "start" }}>
      <Segmented aria-label="With a disabled segment" options={["Meter", { label: "Log", disabled: true }, "Config"]} />
      <Segmented aria-label="Out of range" value={7} options={["One", "Two", "Three"]} onValueChange={() => {}} />
      <RepeatedLabels />
      <div dir="rtl">
        <DirectionProvider direction="rtl">
          <Segmented aria-label="Right to left" options={["One", "Two", "Three"]} />
        </DirectionProvider>
      </div>
    </main>
  );
}
