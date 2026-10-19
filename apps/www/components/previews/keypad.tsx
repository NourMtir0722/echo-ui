"use client";

/** The live preview on /docs/keypad. */
import { HardwareButton } from "@registry/echo/hardware-button";
import { Keypad } from "@registry/echo/keypad";
import { useState } from "react";
import { row } from "./shared/objects-row";

function KeypadPreview() {
  const [amount, setAmount] = useState("12.40");
  const [sent, setSent] = useState<string | null>(null);
  const [pin, setPin] = useState<string | null>(null);
  return (
    <div style={{ ...row, alignItems: "flex-start", gap: 32 }}>
      <Keypad
        label="Split the bill"
        prefix="$"
        value={amount}
        onValueChange={(v) => {
          setAmount(v);
          setSent(null);
        }}
        action={
          <HardwareButton variant="primary" size="lg" fullWidth disabled={!amount} onClick={() => setSent(amount)}>
            {sent ? `Sent $${sent}` : amount ? `Send $${amount}` : "Enter an amount"}
          </HardwareButton>
        }
      />
      <Keypad
        label="Passcode"
        mode="pin"
        onComplete={(p) => setPin(p)}
        action={<p style={{ margin: 0, fontSize: 13, color: "var(--echo-text-dim)" }}>{pin ? "Unlocked" : "Four digits"}</p>}
      />
    </div>
  );
}

export default function Preview() {
  return <KeypadPreview />;
}
