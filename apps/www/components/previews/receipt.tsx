"use client";

/** The live preview on /docs/receipt. */
import { HardwareButton } from "@registry/echo/hardware-button";
import { Receipt } from "@registry/echo/receipt";
import { Segmented } from "@registry/echo/segmented";
import { useState } from "react";
import { Controls } from "./shared/objects-Controls";
import { stack } from "./shared/objects-stack";

const ORDER = {
  title: "North Street Coffee",
  meta: "Order 4821, 25 Sep 2026, 14:32",
  lines: [
    { label: "2 × Oat flat white", value: "9.00" },
    { label: "1 × Almond croissant", value: "4.50" },
    { label: "1 × Sparkling water", value: "2.80" },
    { label: "Tax 8%", value: "1.30" },
  ],
  total: { label: "Total", value: "$17.60" },
  code: "4821-0925",
  footer: "Paid by card ••4417. Thank you",
};

const RUN = {
  title: "Run 12, done",
  meta: "25 Sep 2026, 14:32, 3 min 41 s",
  lines: [
    { label: "Files read", value: "18" },
    { label: "Files changed", value: "4" },
    { label: "Tests", value: "212 passed" },
    { label: "Commits", value: "2" },
  ],
  total: { label: "Tokens", value: "48.2k" },
  footer: "Nothing was published",
};

function ReceiptPreview() {
  const [which, setWhich] = useState(0);
  const [printed, setPrinted] = useState(0);
  const [showing, setShowing] = useState(true);
  const content = which === 0 ? ORDER : RUN;
  return (
    <div style={{ ...stack, justifyItems: "center", width: "100%" }}>
      <Controls>
        <Segmented
          options={["Order", "Run summary"]}
          value={which}
          onValueChange={(i) => {
            setWhich(i);
            setShowing(true);
            setPrinted((n) => n + 1);
          }}
          aria-label="Receipt"
          size="sm"
        />
        <HardwareButton
          size="sm"
          onClick={() => {
            setShowing(true);
            setPrinted((n) => n + 1);
          }}
        >
          Print again
        </HardwareButton>
      </Controls>
      <div style={{ minHeight: 420, display: "grid", justifyItems: "center", width: "100%" }}>
        {showing ? <Receipt {...content} printKey={printed} onTear={() => setShowing(false)} /> : null}
      </div>
    </div>
  );
}

export default function Preview() {
  return <ReceiptPreview />;
}
