"use client";

/** The live preview on /docs/knob. */
import { Knob } from "@registry/echo/knob";
import { Stack } from "@registry/echo/layout";

export default function Preview() {
  return (
    <Stack direction="row" gap={8} align="start">
      <Knob label="Gain" min={-24} max={24} defaultValue={0} formatValue={(v) => `${v > 0 ? "+" : ""}${v} dB`} />
      <Knob size="sm" label="Low" defaultValue={40} />
      <Knob size="sm" label="High" defaultValue={70} />
    </Stack>
  );
}
