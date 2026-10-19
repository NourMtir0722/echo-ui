"use client";

/** The live preview on /docs/filter-tray. */
import { FilterTray } from "@registry/echo/filter-tray";
import { HardwareButton } from "@registry/echo/hardware-button";
import { useState } from "react";
import { Controls } from "./shared/objects-Controls";
import { PLACES } from "./shared/objects-PLACES";
import { stack } from "./shared/objects-stack";

function FilterTrayPreview() {
  const [on, setOn] = useState<string[]>(["open", "rated"]);
  return (
    <div style={{ ...stack, width: "min(560px, 100%)", justifyItems: "stretch" }}>
      <Controls>
        <HardwareButton size="sm" disabled={on.length === 0} onClick={() => setOn([])}>
          Clear filters
        </HardwareButton>
      </Controls>
      <FilterTray label="Places" options={PLACES} value={on} onValueChange={setOn} />
      <FilterTray label="Places, compact" options={PLACES} size="md" defaultValue={["near"]} defaultApplied />
    </div>
  );
}

export default function Preview() {
  return <FilterTrayPreview />;
}
