"use client";

/** The live preview on /docs/quick-tile. */
import { QuickTile } from "@registry/echo/quick-tile";
import { useState } from "react";
import { glyph } from "./shared/objects-glyph";
import { stack } from "./shared/objects-stack";
import { SUN } from "./shared/objects-SUN";

const WIFI = glyph("M3 9.5a13 13 0 0 1 18 0M6 12.8a8.5 8.5 0 0 1 12 0M9 16a4 4 0 0 1 6 0M12 19h.01");

const MOON = glyph("M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z");

const BLUETOOTH = glyph("M7 7l10 10-5 4V3l5 4L7 17");

function QuickTilePreview() {
  const [opened, setOpened] = useState<string | null>(null);
  return (
    <div style={{ ...stack }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, maxWidth: 420 }}>
        <QuickTile label="Wi-Fi" icon={WIFI} status="Home network" shape="wide" defaultChecked onMore={() => setOpened("Wi-Fi")} />
        <QuickTile label="Focus" icon={MOON} />
        <QuickTile label="Bluetooth" icon={BLUETOOTH} status="2 devices" shape="wide" onMore={() => setOpened("Bluetooth")} />
        <QuickTile label="Night" icon={SUN} defaultChecked />
      </div>
      <p style={{ margin: 0, fontSize: 13, color: "var(--echo-text-dim)" }}>{opened ? `${opened} settings would open here.` : "The small keys open each tile's settings."}</p>
    </div>
  );
}

export default function Preview() {
  return <QuickTilePreview />;
}
