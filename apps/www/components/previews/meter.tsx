"use client";

/** The live preview on /docs/meter. */
import { HardwareButton } from "@registry/echo/hardware-button";
import { Stack } from "@registry/echo/layout";
import { Meter } from "@registry/echo/meter";
import { useState } from "react";

function MeterPreview() {
  const [used, setUsed] = useState(42.5);
  return (
    <div style={{ display: "grid", gap: 18, width: "min(360px, 100%)" }}>
      <Meter label="Storage" value={used} max={64} marks={[56]} format={{ style: "unit", unit: "gigabyte", maximumFractionDigits: 1 }} />
      <Meter label="Battery" value={78} format={{ style: "percent" }} />
      <Stack direction="row" gap={4}>
        <HardwareButton size="sm" onClick={() => setUsed((u) => Math.min(64, u + 9))}>
          Add files
        </HardwareButton>
        <HardwareButton size="sm" variant="ghost" onClick={() => setUsed(12)}>
          Clean up
        </HardwareButton>
      </Stack>
    </div>
  );
}

export default function Preview() {
  return <MeterPreview />;
}
