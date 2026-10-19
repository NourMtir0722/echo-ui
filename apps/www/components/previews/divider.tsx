"use client";

/** The live preview on /docs/divider. */
import { Divider } from "@registry/echo/divider";
import { caption } from "./shared/main-caption";

export default function Preview() {
  return (
    <div style={{ display: "grid", gap: 16, maxWidth: 320, color: "var(--echo-text-dim)" }}>
      <Divider />
      <span style={{ display: "inline-flex", gap: 12, alignItems: "center", height: 24, ...caption }}>
        left
        <Divider orientation="vertical" />
        right
      </span>
    </div>
  );
}
