"use client";

/** The live preview on /docs/segmented. */
import { Segmented } from "@registry/echo/segmented";
import { row } from "./shared/main-row";

export default function Preview() {
  return (
    <div style={row}>
      <Segmented aria-label="View" options={["Meter", "Log", "Config"]} defaultValue={0} />
    </div>
  );
}
