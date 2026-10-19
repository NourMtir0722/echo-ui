"use client";

/** The live preview on /docs/card. */
import { Card } from "@registry/echo/card";
import { HardwareButton } from "@registry/echo/hardware-button";
import { Grid } from "@registry/echo/layout";
import { StatTile } from "@registry/echo/stat-tile";

export default function Preview() {
  return (
    <Grid minItemWidth="15rem" gap={8}>
      <Card title="Backups" description="Nightly, kept for 30 days." footer={<HardwareButton>Restore</HardwareButton>}>
        Last backup at 02:14. Nothing failed.
      </Card>
      <Card title="Getting started" description="Install and theme in five minutes." href="/docs/installation" />
      <Card variant="screen" size="sm" title="Latency">
        <StatTile value="42" unit="ms" label="p95" />
      </Card>
    </Grid>
  );
}
