"use client";

/** The live preview on /docs/alert-dialog. */
import { AlertDialog } from "@registry/echo/alert-dialog";
import { HardwareButton } from "@registry/echo/hardware-button";
import { row } from "./shared/main-row";

export default function Preview() {
  return (
    <div style={row}>
      <AlertDialog
        trigger={<HardwareButton>Erase takes</HardwareButton>}
        title="Erase all takes?"
        description="Twelve recordings will be removed from this device. This cannot be undone."
        confirmLabel="Erase"
      />
      <AlertDialog
        trigger={<HardwareButton>Publish</HardwareButton>}
        title="Publish to the public registry?"
        description="Anyone will be able to install this item."
        confirmLabel="Publish"
        destructive={false}
      />
    </div>
  );
}
