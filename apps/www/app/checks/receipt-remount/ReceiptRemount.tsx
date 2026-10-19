"use client";

import { Activity, useState } from "react";
import { HardwareButton } from "@registry/echo/hardware-button";
import { Receipt } from "@registry/echo/receipt";

export function ReceiptRemount() {
  const [shown, setShown] = useState(false);
  const [visible, setVisible] = useState(true);
  return (
    <main style={{ padding: 40, display: "grid", gap: 16, justifyItems: "start" }}>
      <div style={{ display: "flex", gap: 12 }}>
        <HardwareButton onClick={() => setShown(true)}>Print</HardwareButton>
        <HardwareButton onClick={() => setVisible((v) => !v)}>{visible ? "Hide" : "Show"}</HardwareButton>
      </div>
      {shown && (
        <Activity mode={visible ? "visible" : "hidden"}>
          <Receipt
            title="Order 1042"
            meta="26 Sep 2026"
            lines={[
              { label: "Tuner", value: "$0" },
              { label: "Keypad", value: "$0" },
            ]}
            total={{ label: "Total", value: "$0" }}
            footer="Thank you"
          />
        </Activity>
      )}
    </main>
  );
}
