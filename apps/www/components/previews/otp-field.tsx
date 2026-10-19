"use client";

/** The live preview on /docs/otp-field. */
import { OtpField } from "@registry/echo/otp-field";

export default function Preview() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 18, maxWidth: 360 }}>
      <OtpField label="Verification code" defaultValue="0427" />
      <OtpField label="PIN" length={4} description="Sent to your phone." />
    </div>
  );
}
