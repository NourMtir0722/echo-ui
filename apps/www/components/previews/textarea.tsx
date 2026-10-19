"use client";

/** The live preview on /docs/textarea. */
import { Textarea } from "@registry/echo/textarea";

export default function Preview() {
  return (
    <div style={{ display: "grid", gap: 16, maxWidth: 420 }}>
      <Textarea
        label="Session note"
        placeholder="What happened in this take?"
        defaultValue={"Second pass, mic moved back six inches.\nRoom is louder than yesterday."}
      />
      <Textarea label="Log" mono maxRows={4} defaultValue={"00:00 armed\n00:07 take 1\n00:41 take 2\n01:12 take 3\n01:58 take 4"} />
    </div>
  );
}
