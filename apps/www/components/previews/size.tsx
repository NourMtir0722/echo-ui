"use client";

/** The live preview on /docs/size. */
import { Field } from "@registry/echo/field";
import { HardwareButton } from "@registry/echo/hardware-button";
import { Segmented } from "@registry/echo/segmented";
import { Select } from "@registry/echo/select";
import { SizeProvider } from "@registry/echo/size";

export default function Preview() {
  return (
    <div style={{ display: "grid", gap: 18, width: "100%" }}>
      {(["sm", "md", "lg"] as const).map((size) => (
        <SizeProvider key={size} size={size}>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 180px", minWidth: 0 }}>
              <Field aria-label={`Email, ${size}`} placeholder="name@example.com" />
            </div>
            <Select
              aria-label={`Role, ${size}`}
              defaultValue="editor"
              options={[
                { value: "viewer", label: "Viewer" },
                { value: "editor", label: "Editor" },
              ]}
            />
            <Segmented aria-label={`Access, ${size}`} options={["Read", "Write"]} />
            <HardwareButton>Invite</HardwareButton>
          </div>
        </SizeProvider>
      ))}
    </div>
  );
}
