"use client";

/** The live preview on /docs/use-gsap-presence. */
import { HardwareButton } from "@registry/echo/hardware-button";
import { Modal } from "@registry/echo/modal";
import { caption } from "./shared/main-caption";

function GsapPresencePreview() {
  return (
    <div style={{ display: "grid", gap: 10 }}>
      <Modal
        trigger={<HardwareButton>Open (GSAP exit)</HardwareButton>}
        title="Presence bridge"
        description="Enter on mount, GSAP exit before unmount."
      >
        <p style={{ color: "var(--echo-text-dim)" }}>
          Close this and watch it animate out before the node leaves the DOM — that is the hook, not
          the Modal.
        </p>
      </Modal>
      <p style={caption}>
        Modal, Popover, and Tooltip all run on this one hook. Base UI detects CSS transitions before
        unmount, but not GSAP; this bridges the gap.
      </p>
    </div>
  );
}

export default function Preview() {
  return <GsapPresencePreview />;
}
