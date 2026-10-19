"use client";

/** The live preview on /docs/date-tile. */
import { DateTile } from "@registry/echo/date-tile";
import { HardwareButton } from "@registry/echo/hardware-button";
import { Item } from "@registry/echo/item";
import { useState } from "react";
import { Controls } from "./shared/objects-Controls";
import { row } from "./shared/objects-row";

function DateTilePreview() {
  const [day, setDay] = useState("2026-09-25");
  return (
    <div style={{ ...row, alignItems: "center", gap: 24 }}>
      <DateTile date={day} size="lg" roll />
      <DateTile date={day} />
      <div style={{ display: "grid", gap: 4, width: "min(260px, 100%)" }}>
        <Item title="Design review" description="14:00, Room 3" media={<DateTile date="2026-09-29" size="sm" />} />
        <Item title="Invoice due" description="Northwind, $1,240" media={<DateTile date="2026-10-01" size="sm" />} />
      </div>
      <Controls>
        <HardwareButton size="sm" onClick={() => setDay((d) => (d === "2026-09-25" ? "2026-10-08" : "2026-09-25"))}>
          Turn the page
        </HardwareButton>
      </Controls>
    </div>
  );
}

export default function Preview() {
  return <DateTilePreview />;
}
