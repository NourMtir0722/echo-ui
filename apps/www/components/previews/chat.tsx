"use client";

/** The live preview on /docs/chat. */
import { ChatScreen } from "@registry/echo/chat";
import { ScreenFrame } from "./shared/main-ScreenFrame";

export default function Preview() {
  return (
    <ScreenFrame height={520}>
      <ChatScreen embedded />
    </ScreenFrame>
  );
}
