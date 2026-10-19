"use client";

/** The live preview on /docs/panel. */
import { Panel } from "@registry/echo/panel";
import { StatTile } from "@registry/echo/stat-tile";
import { row } from "./shared/main-row";

export default function Preview() {
  return (
    <div style={row}>
      <Panel style={{ width: 220, color: "var(--echo-text)", fontSize: 13 }}>
        Raised molded plastic — things you touch.
      </Panel>
      <Panel variant="screen" style={{ width: 220 }}>
        <StatTile value="07:42" label="Uptime" />
      </Panel>
      <Panel pressable style={{ width: 220, color: "var(--echo-text)", fontSize: 13 }}>
        Pressable — press the surface, or hold it.
      </Panel>
    </div>
  );
}
