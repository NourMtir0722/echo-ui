"use client";

/** The live preview on /docs/ticket. */
import { HardwareButton } from "@registry/echo/hardware-button";
import { Ticket } from "@registry/echo/ticket";
import { useState } from "react";
import { stack } from "./shared/objects-stack";

function TicketPreview() {
  const [round, setRound] = useState(0);
  const [used, setUsed] = useState(false);
  return (
    <div style={{ ...stack, width: "100%" }}>
      <Ticket
        key={round}
        title="Night Session"
        subtitle="Warehouse 9, Leeds"
        details={[
          { label: "Date", value: "Sat 3 Oct" },
          { label: "Doors", value: "19:30" },
          { label: "Entry", value: "B" },
        ]}
        code="NS-3010-0412"
        stubLabel="Admit one"
        onUse={() => setUsed(true)}
      />
      {used ? (
        <HardwareButton
          size="sm"
          onClick={() => {
            setUsed(false);
            setRound((r) => r + 1);
          }}
        >
          New ticket
        </HardwareButton>
      ) : null}
    </div>
  );
}

export default function Preview() {
  return <TicketPreview />;
}
