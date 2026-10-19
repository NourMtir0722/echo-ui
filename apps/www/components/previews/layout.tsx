"use client";

/** The live preview on /docs/layout. */
import { HardwareButton } from "@registry/echo/hardware-button";
import { Grid,Stack } from "@registry/echo/layout";
import { Panel } from "@registry/echo/panel";

export default function Preview() {
  return (
    <Stack gap={8}>
      <Stack direction="row" gap={4} justify="end">
        <HardwareButton>Cancel</HardwareButton>
        <HardwareButton variant="primary">Save</HardwareButton>
      </Stack>
      <Grid minItemWidth="8rem" gap={6}>
        {["One", "Two", "Three", "Four"].map((n) => (
          <Panel key={n} style={{ color: "var(--echo-text)", fontSize: 13 }}>
            {n}
          </Panel>
        ))}
      </Grid>
    </Stack>
  );
}
