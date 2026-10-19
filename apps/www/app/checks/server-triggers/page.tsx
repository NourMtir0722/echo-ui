import { AlertDialog } from "@registry/echo/alert-dialog";
import { HardwareButton } from "@registry/echo/hardware-button";
import { Modal } from "@registry/echo/modal";
import { Popover } from "@registry/echo/popover";
import { Tooltip } from "@registry/echo/tooltip";

export const metadata = { title: "Server triggers fixture", robots: { index: false, follow: false } };

/**
 * A test fixture: every component with a `trigger` prop, given an element
 * from a server component, the way their docs show. The element has to become
 * the trigger itself, not get wrapped in a second button;
 * tests/console.spec.ts checks it on the dev server, where it failed.
 */
export default function ServerTriggersFixture() {
  return (
    <main style={{ padding: "var(--echo-space-10)", display: "flex", gap: "var(--echo-space-6)" }}>
      <Modal trigger={<HardwareButton data-testid="modal-trigger">Modal</HardwareButton>} title="Modal">
        Body
      </Modal>
      <AlertDialog
        trigger={<HardwareButton data-testid="alert-trigger">Alert</HardwareButton>}
        title="Delete it?"
        description="This can't be undone."
      />
      <Popover trigger={<HardwareButton data-testid="popover-trigger">Popover</HardwareButton>} title="Popover">
        Details
      </Popover>
      <Tooltip trigger={<HardwareButton data-testid="tooltip-trigger">Tooltip</HardwareButton>}>Tip</Tooltip>
    </main>
  );
}
