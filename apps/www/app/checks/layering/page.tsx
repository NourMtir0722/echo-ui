import { HardwareButton } from "@registry/echo/hardware-button";
import { Menu } from "@registry/echo/menu";
import { Modal } from "@registry/echo/modal";
import { Popover } from "@registry/echo/popover";
import { Select } from "@registry/echo/select";
import { Sheet } from "@registry/echo/sheet";
import { Tooltip } from "@registry/echo/tooltip";

export const metadata = { title: "Layering fixture", robots: { index: false, follow: false } };

/**
 * A test fixture: every popup that can open from inside a dialog, inside a
 * Modal and a Sheet. Whatever opens last has to land on top;
 * tests/layering.spec.ts checks each one.
 */
function Popups({ id }: { id: string }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--echo-space-6)" }}>
      <Select aria-label={`${id} select`} options={["Low", "Medium", "High"].map((l) => ({ value: l, label: l }))} />
      <Popover trigger={<HardwareButton data-testid={`${id}-popover`}>Popover</HardwareButton>} title="Popover">
        Details
      </Popover>
      <Tooltip trigger={<HardwareButton data-testid={`${id}-tooltip`}>Tooltip</HardwareButton>} delay={0}>
        Tip
      </Tooltip>
      <Menu>
        <Menu.Trigger data-testid={`${id}-menu`}>Menu</Menu.Trigger>
        <Menu.Content>
          <Menu.Item>Rename</Menu.Item>
          <Menu.Item>Duplicate</Menu.Item>
        </Menu.Content>
      </Menu>
    </div>
  );
}

export default function LayeringFixture() {
  return (
    <main style={{ padding: "var(--echo-space-10)", display: "flex", gap: "var(--echo-space-6)" }}>
      <Modal trigger="Open modal" title="Modal">
        <Popups id="modal" />
      </Modal>
      <Sheet>
        <Sheet.Trigger>Open sheet</Sheet.Trigger>
        <Sheet.Content title="Sheet">
          <Popups id="sheet" />
        </Sheet.Content>
      </Sheet>
    </main>
  );
}
