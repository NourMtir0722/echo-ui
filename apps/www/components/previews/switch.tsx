"use client";

/** The live preview on /docs/switch. */
import { Switch } from "@registry/echo/switch";
import { Labeled } from "./shared/main-Labeled";
import { row } from "./shared/main-row";

export default function Preview() {
  return (
    <div style={row}>
      <Labeled label="power">
        <Switch defaultChecked aria-label="Power" />
      </Labeled>
      <Labeled label="standby">
        <Switch aria-label="Standby" />
      </Labeled>
      <Labeled label="locked">
        <Switch disabled aria-label="Locked" />
      </Labeled>
    </div>
  );
}
