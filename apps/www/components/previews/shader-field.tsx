"use client";

/** The live preview on /docs/shader-field. */
import { siteTheme } from "@/components/site/site-theme";
import { ShaderField } from "@registry/echo/shader-field";
import { row } from "./shared/main-row";

export default function Preview() {
  return (
    <div style={row}>
      <div style={{ width: 260, height: 150, borderRadius: 14, overflow: "hidden" }}>
        <ShaderField />
      </div>
      <div style={{ width: 260, height: 150, borderRadius: 14, overflow: "hidden" }}>
        <ShaderField theme={siteTheme({ accent: "#F2674E" }).values} />
      </div>
    </div>
  );
}
