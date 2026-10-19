"use client";

/** The live preview on /docs/scroll-area. */
import { Stack } from "@registry/echo/layout";
import { ScrollArea } from "@registry/echo/scroll-area";

export default function Preview() {
  return (
    <div style={{ width: "min(360px, 100%)" }}>
      <ScrollArea aria-label="Session log" maxHeight="12rem">
        <Stack gap={3}>
          {Array.from({ length: 16 }, (_, i) => (
            <span key={i} style={{ color: "var(--echo-text-dim)", fontSize: 13 }}>
              {`00:${String(i * 7).padStart(2, "0")}  take ${i + 1} saved`}
            </span>
          ))}
        </Stack>
      </ScrollArea>
    </div>
  );
}
