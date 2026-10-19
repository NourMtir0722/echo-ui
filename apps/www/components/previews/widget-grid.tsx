"use client";

/** The live preview on /docs/widget-grid. */
import { DateTile } from "@registry/echo/date-tile";
import { DescriptionList } from "@registry/echo/description-list";
import { StatTile } from "@registry/echo/stat-tile";
import { Tuner } from "@registry/echo/tuner";
import { WidgetGrid } from "@registry/echo/widget-grid";
import { useState } from "react";

function WidgetGridPreview() {
  const [items, setItems] = useState(() => [
    { id: "today", label: "Today", content: <DateTile date="2026-09-25" size="lg" /> },
    { id: "latency", label: "Latency", content: <StatTile value="42" unit="ms" label="Latency" /> },
    { id: "uptime", label: "Uptime", content: <StatTile value="99.98" unit="%" label="Uptime" glow={false} /> },
    { id: "frequency", label: "Frequency", size: "2x1" as const, content: <Tuner label="Frequency" unit="MHz" min={87.5} max={108} step={0.1} defaultValue={88.5} /> },
    { id: "status", label: "Status", size: "2x1" as const, content: <DescriptionList variant="screen" layout="inline" items={[{ term: "Battery", detail: "89%" }, { term: "Sync", detail: "12:04" }]} /> },
  ]);
  return (
    <div style={{ width: "100%" }}>
      <WidgetGrid label="Home" items={items} onRemove={(id) => setItems((all) => all.filter((i) => i.id !== id))} />
    </div>
  );
}

export default function Preview() {
  return <WidgetGridPreview />;
}
