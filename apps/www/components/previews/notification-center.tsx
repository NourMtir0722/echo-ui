"use client";

/** The live preview on /docs/notification-center. */
import { NotificationCenter } from "@registry/echo/notification-center";
import { useState } from "react";

function NotificationsPreview() {
  const [items, setItems] = useState([
    { id: "1", title: "Ada mentioned you", body: "“Can you check the mix?”", time: "2m", read: false },
    { id: "2", title: "Export finished", body: "session-04.wav is ready", time: "1h", read: false },
    { id: "3", title: "Grace joined Echo", time: "Mon", read: true },
  ]);
  return (
    <NotificationCenter
      notifications={items}
      onOpen={(id) => setItems((xs) => xs.map((x) => (x.id === id ? { ...x, read: true } : x)))}
      onReadAll={() => setItems((xs) => xs.map((x) => ({ ...x, read: true })))}
    />
  );
}

export default function Preview() {
  return <NotificationsPreview />;
}
