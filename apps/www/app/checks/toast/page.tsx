"use client";

import { HardwareButton } from "@registry/echo/hardware-button";
import { Modal } from "@registry/echo/modal";
import { Toaster, useToast } from "@registry/echo/toast";

/**
 * A test fixture: the toaster, with buttons that raise toasts, one of them
 * from inside a Modal. tests/toast.spec.ts checks the announcement is made
 * into a live region that was there first.
 */
function Buttons() {
  const toast = useToast();
  return (
    <main style={{ padding: "var(--echo-space-10)", display: "flex", gap: "var(--echo-space-6)" }}>
      <HardwareButton onClick={() => toast({ title: "Take saved", body: "Stored on this device." })}>Save take</HardwareButton>
      <HardwareButton onClick={() => toast({ title: "Recording", tone: "active", timeout: 0 })}>Record</HardwareButton>
      <Modal trigger="Open modal" title="Modal">
        <HardwareButton onClick={() => toast({ title: "Preset applied" })}>Apply preset</HardwareButton>
      </Modal>
    </main>
  );
}

export default function ToastFixture() {
  return (
    <Toaster>
      <Buttons />
    </Toaster>
  );
}
