"use client";

/** The live preview on /docs/switch-bank. */
import { SwitchBank } from "@registry/echo/switch-bank";

function SwitchBankPreview() {
  return (
    <SwitchBank
      label="Notifications"
      columns={[
        { value: "email", label: "Email" },
        { value: "push", label: "Push" },
        { value: "sms", label: "SMS" },
      ]}
      rows={[
        { value: "mentions", label: "Mentions" },
        { value: "replies", label: "Replies" },
        { value: "digest", label: "Weekly digest" },
        { value: "security", label: "Security alerts" },
      ]}
      defaultValue={["mentions:email", "mentions:push", "replies:email", "digest:email", "security:email", "security:push", "security:sms"]}
    />
  );
}

export default function Preview() {
  return <SwitchBankPreview />;
}
