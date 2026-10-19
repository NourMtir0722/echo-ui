"use client";

/** The live preview on /docs/hold-button. */
import { HoldButton } from "@registry/echo/hold-button";
import { Stack } from "@registry/echo/layout";
import { useState } from "react";

function HoldPreview() {
  const [n, setN] = useState(0);
  return (
    <Stack direction="row" gap={6} align="center">
      <HoldButton variant="primary" onConfirm={() => setN((x) => x + 1)} doneLabel="Ended">
        End for everyone
      </HoldButton>
      <span style={{ color: "var(--echo-text-dim)", fontSize: 13 }}>{n ? `Ended ${n}×` : "Hold until the cap is full"}</span>
    </Stack>
  );
}

export default function Preview() {
  return <HoldPreview />;
}
