"use client";

/** The live preview on /docs/console. */
import { ConsoleScreen } from "@registry/echo/console";
import { ScreenFrame } from "./shared/main-ScreenFrame";

export default function Preview() {
  return (
    <ScreenFrame height={520}>
      <ConsoleScreen embedded />
    </ScreenFrame>
  );
}
