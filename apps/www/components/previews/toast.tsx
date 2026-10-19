"use client";

/** The live preview on /docs/toast. */
import { HardwareButton } from "@registry/echo/hardware-button";
import { Toast,Toaster,useToast } from "@registry/echo/toast";
import { row } from "./shared/main-row";

/* ------------------------------------------------------------ foundations */

function ToastButtons() {
  const toast = useToast();
  return (
    <div style={row}>
      <HardwareButton onClick={() => toast({ title: "Saved", body: "Draft stored locally" })}>Save draft</HardwareButton>
      <HardwareButton onClick={() => toast({ title: "Recording", body: "Mic is live", tone: "active" })}>Record</HardwareButton>
    </div>
  );
}

/** A real toaster, so the preview announces what it shows. *//** A real toaster, so the preview announces what it shows. *//** A real toaster, so the preview announces what it shows. *//** A real toaster, so the preview announces what it shows. */
function ToastPreview() {
  return (
    <div style={{ display: "grid", gap: 18 }}>
      <Toaster>
        <ToastButtons />
      </Toaster>
      <div style={row}>
        <Toast title="Saved" body="Draft stored locally" />
        <Toast title="Recording" body="Mic is live" tone="active" />
      </div>
    </div>
  );
}

export default function Preview() {
  return <ToastPreview />;
}
