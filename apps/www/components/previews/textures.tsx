"use client";

/** The live preview on /docs/textures. */
import { Dither,GrainField,Halftone,Noise,Scanlines } from "@registry/echo/textures";
import type { ReactNode } from "react";
import { caption } from "./shared/main-caption";
import { row } from "./shared/main-row";

/* ---------------------------------------------------------------- textures */

function Swatch({ label, children }: { label: string; children: ReactNode }) {
  return (
    <figure style={{ margin: 0 }}>
      <div
        style={{
          position: "relative",
          width: 128,
          height: 84,
          borderRadius: 12,
          overflow: "hidden",
          background: "linear-gradient(150deg, var(--echo-accent-3), var(--echo-accent-6))",
        }}
      >
        {children}
      </div>
      <figcaption style={{ ...caption, marginTop: 6 }}>{label}</figcaption>
    </figure>
  );
}

export default function Preview() {
  return (
    <div style={row}>
      <Swatch label="none">
        <span />
      </Swatch>
      <Swatch label="Dither">
        <Dither />
      </Swatch>
      <Swatch label="Noise">
        <Noise opacity={0.3} grain="coarse" />
      </Swatch>
      <Swatch label="Halftone">
        <Halftone />
      </Swatch>
      <Swatch label="Scanlines">
        <Scanlines />
      </Swatch>
      <GrainField style={{ width: 200, height: 84, borderRadius: 12 }}>
        <div style={{ padding: 14, ...caption, color: "var(--echo-text)" }}>GrainField</div>
      </GrainField>
    </div>
  );
}
