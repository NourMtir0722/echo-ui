"use client";

/** The live preview on /docs/scope. */
import { Creature } from "@registry/echo/creature";
import { DateTile } from "@registry/echo/date-tile";
import { FilterTray } from "@registry/echo/filter-tray";
import { HardwareButton } from "@registry/echo/hardware-button";
import { Knob } from "@registry/echo/knob";
import { QuickTile } from "@registry/echo/quick-tile";
import { Scope } from "@registry/echo/scope";
import { SegmentDisplay } from "@registry/echo/segment-display";
import { Switch } from "@registry/echo/switch";
import { Tuner } from "@registry/echo/tuner";
import type { CSSProperties } from "react";
import { useState } from "react";
import { PLACES } from "./shared/objects-PLACES";
import { row } from "./shared/objects-row";
import { stack } from "./shared/objects-stack";
import { SUN } from "./shared/objects-SUN";

const caption: CSSProperties = { margin: 0, fontSize: 12, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--echo-text-dim)", fontWeight: 700 };

function ScopePreview() {
  const [on, setOn] = useState<string[]>(["open", "rated", "near"]);
  return (
    <div style={{ ...stack, gap: 26, width: "100%" }}>
      <p style={caption}>A colour per item</p>
      <div style={{ ...row, gap: 12 }}>
        <Scope accent="#F2674E">
          <HardwareButton variant="primary">Design</HardwareButton>
        </Scope>
        <Scope accent="#3D8EF0">
          <HardwareButton variant="primary">Research</HardwareButton>
        </Scope>
        <Scope accent="#DE3B74">
          <HardwareButton variant="primary">Build</HardwareButton>
        </Scope>
        <Scope accent="#F2674E">
          <Switch aria-label="Live" defaultChecked />
        </Scope>
      </div>
      <div style={{ width: "min(520px, 100%)" }}>
        <FilterTray
          label="Colours"
          options={[
            { value: "open", label: "Open now", icon: PLACES[0]!.icon, accent: "#DE3B74" },
            { value: "rated", label: "Top rated", icon: PLACES[1]!.icon, accent: "#F2674E" },
            { value: "near", label: "Nearby", icon: PLACES[2]!.icon, accent: "#8B6FE8" },
            { value: "deals", label: "Deals", icon: PLACES[3]!.icon, accent: "#3D8EF0" },
          ]}
          value={on}
          onValueChange={setOn}
        />
      </div>
      <div style={{ ...row, gap: 10 }}>
        <Creature accent="#DE3B74" size={64} />
        <Creature accent="#F2674E" size={64} mood="done" />
        <Creature accent="#8B6FE8" size={64} mood="busy" />
        <Creature accent="#3D8EF0" size={64} mood="sleep" />
      </div>
      <p style={caption}>Soft molding</p>
      <div style={{ ...row, gap: 28 }}>
        <div style={{ ...row, gap: 10 }}>
          <HardwareButton>Crisp</HardwareButton>
          <HardwareButton variant="primary">Crisp</HardwareButton>
        </div>
        <Scope molding="soft">
          <div style={{ ...row, gap: 10 }}>
            <HardwareButton>Soft</HardwareButton>
            <HardwareButton variant="primary">Soft</HardwareButton>
            <QuickTile label="Night" icon={SUN} defaultChecked />
            <Knob label="Warmth" size="sm" defaultValue={60} />
          </div>
        </Scope>
      </div>
      <p style={caption}>Reflective screens</p>
      <div style={{ ...row, gap: 20, alignItems: "flex-start" }}>
        <SegmentDisplay label="Frequency" value="88.5" digits={4} unit="MHz" screen="reflective" />
        <DateTile date="2026-09-25" screen="reflective" />
        <div style={{ width: "min(360px, 100%)" }}>
          <Tuner label="Frequency" unit="MHz" min={87.5} max={108} step={0.1} defaultValue={88.5} screen="reflective" />
        </div>
      </div>
    </div>
  );
}

export default function Preview() {
  return <ScopePreview />;
}
