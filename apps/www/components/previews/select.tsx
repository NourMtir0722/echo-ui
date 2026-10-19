"use client";

/** The live preview on /docs/select. */
import { Select } from "@registry/echo/select";
import { row } from "./shared/main-row";

export default function Preview() {
  return (
    <div style={row}>
      <Select
        aria-label="View"
        options={[
          { value: "meter", label: "Meter" },
          { value: "log", label: "Log" },
          { value: "config", label: "Config" },
        ]}
        defaultValue="meter"
      />
    </div>
  );
}
