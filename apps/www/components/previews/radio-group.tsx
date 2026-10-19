"use client";

/** The live preview on /docs/radio-group. */
import { RadioGroup } from "@registry/echo/radio-group";

export default function Preview() {
  return (
    <div style={{ display: "grid", gap: 18 }}>
      <RadioGroup defaultValue="meter" aria-label="Panel mode">
        <RadioGroup.Item value="meter">Meter</RadioGroup.Item>
        <RadioGroup.Item value="log">Log</RadioGroup.Item>
        <RadioGroup.Item value="config">Config</RadioGroup.Item>
      </RadioGroup>
      <RadioGroup orientation="vertical" defaultValue="line" aria-label="Output">
        <RadioGroup.Item value="line">Line out</RadioGroup.Item>
        <RadioGroup.Item value="phones">Headphones</RadioGroup.Item>
      </RadioGroup>
    </div>
  );
}
