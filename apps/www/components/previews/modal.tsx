"use client";

/** The live preview on /docs/modal. */
import { HardwareButton } from "@registry/echo/hardware-button";
import { Modal } from "@registry/echo/modal";

export default function Preview() {
  return (
    <Modal
      trigger={<HardwareButton>Open settings</HardwareButton>}
      title="Device Settings"
      description="Base UI behavior, Echo skin."
      footer={<HardwareButton variant="primary">Save</HardwareButton>}
    >
      <p style={{ color: "var(--echo-text-dim)" }}>
        Focus trap, Esc, and scroll-lock come from Base UI. The summon-in, the molded panel, and the
        click are Echo.
      </p>
    </Modal>
  );
}
