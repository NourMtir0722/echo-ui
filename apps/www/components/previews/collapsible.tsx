"use client";

/** The live preview on /docs/collapsible. */
import { Collapsible } from "@registry/echo/collapsible";

export default function Preview() {
  return (
    <div style={{ width: "min(420px, 100%)" }}>
      <Collapsible title="Advanced settings">
        Buffer size, sample rate and the monitor delay live here. Most people never change them.
      </Collapsible>
    </div>
  );
}
