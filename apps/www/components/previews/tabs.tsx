"use client";

/** The live preview on /docs/tabs. */
import { Tabs } from "@registry/echo/tabs";

export default function Preview() {
  return (
    <div style={{ display: "grid", gap: 24 }}>
      <Tabs defaultValue="meter">
        <Tabs.List aria-label="Track view">
          <Tabs.Tab value="meter">Meter</Tabs.Tab>
          <Tabs.Tab value="log">Log</Tabs.Tab>
          <Tabs.Tab value="config">Config</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="meter">Signal meter — live readout.</Tabs.Panel>
        <Tabs.Panel value="log">Event log — recent activity.</Tabs.Panel>
        <Tabs.Panel value="config">Config — device settings.</Tabs.Panel>
      </Tabs>
      <Tabs defaultValue="day">
        <Tabs.List size="sm" aria-label="Chart range">
          <Tabs.Tab value="day">Day</Tabs.Tab>
          <Tabs.Tab value="week">Week</Tabs.Tab>
          <Tabs.Tab value="month">Month</Tabs.Tab>
        </Tabs.List>
      </Tabs>
    </div>
  );
}
