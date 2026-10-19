"use client";

/**
 * Modal gallery. Drives Base UI Dialog behavior (focus
 * trap, Esc, scroll-lock) with the Echo skin + GSAP presence + sound.
 */
import { SoundProvider } from "echo-ui-core/sound";
import { Modal } from "@registry/echo/modal";
import { HardwareButton } from "@registry/echo/hardware-button";

export default function ModalGallery() {
  return (
    <SoundProvider>
      <div className="echo-gallery" style={{ maxWidth: 720, margin: "0 auto", padding: "3rem 1.5rem 6rem" }}>
        <h1 style={{ fontFamily: "var(--site-font-display), var(--echo-font-sans)", fontSize: "2.2rem", fontWeight: 800, letterSpacing: "-0.03em" }}>Modal</h1>
        <p style={{ color: "var(--echo-text-dim)", lineHeight: 1.5 }}>
          Base UI Dialog behavior, Echo skin. Open it, tab around (focus is trapped), press{" "}
          <kbd style={{ color: "var(--echo-accent)" }}>Esc</kbd> to close — the panel animates out before it
          leaves the DOM.
        </p>

        <div data-testid="modal-row" style={{ display: "flex", gap: 16, marginTop: 32 }}>
          <Modal
            trigger={<HardwareButton data-testid="open-modal">Settings</HardwareButton>}
            title="Device Settings"
            description="Tune the device to your taste. Changes apply immediately."
            footer={<HardwareButton variant="primary" data-testid="modal-save">Save</HardwareButton>}
          >
            <p data-testid="modal-body">
              This panel is a Base UI Dialog under the hood — focus trap, scroll-lock, and Escape
              all come for free. The molded surface, the summon-in, and the click are Echo.
            </p>
          </Modal>
        </div>
      </div>
    </SoundProvider>
  );
}
