"use client";

/** The live preview on /docs/banner. */
import { Banner } from "@registry/echo/banner";
import { HardwareButton } from "@registry/echo/hardware-button";
import { useState } from "react";
import { row } from "./shared/main-row";

function BannerPreview() {
  const [shown, setShown] = useState(true);
  return (
    <div style={{ display: "grid", gap: 12, maxWidth: 480 }}>
      <Banner title="Offline mode" tone="warn">
        Changes sync when the device reconnects.
      </Banner>
      <Banner title="Recording" tone="active">
        The mic is live on input 2.
      </Banner>
      {shown ? (
        <Banner tone="danger" title="Upload failed" onDismiss={() => setShown(false)}>
          The file exceeds the size limit.
        </Banner>
      ) : (
        <div style={row}>
          <HardwareButton size="sm" onClick={() => setShown(true)}>
            Show it again
          </HardwareButton>
        </div>
      )}
    </div>
  );
}

export default function Preview() {
  return <BannerPreview />;
}
