"use client";

/** The live preview on /docs/number-field. */
import { NumberField } from "@registry/echo/number-field";
import { caption } from "./shared/main-caption";
import { row } from "./shared/main-row";

export default function Preview() {
  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div style={row}>
        <NumberField label="Tempo" defaultValue={120} min={40} max={240} />
        <NumberField label="Gain" defaultValue={0} min={-24} max={24} smallStep={0.1} />
      </div>
      <p style={caption}>Drag the label left and right to scrub; alt and shift change the step.</p>
    </div>
  );
}
