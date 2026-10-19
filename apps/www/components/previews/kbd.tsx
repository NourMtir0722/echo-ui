"use client";

/** The live preview on /docs/kbd. */
import { Kbd } from "@registry/echo/kbd";
import { caption } from "./shared/main-caption";
import { row } from "./shared/main-row";

export default function Preview() {
  return (
    <div style={row}>
      <span style={caption}>
        <Kbd>⌘</Kbd> <Kbd>K</Kbd>
      </span>
      <Kbd>Esc</Kbd>
      <Kbd>↵</Kbd>
      <span style={caption}>press these on your keyboard: each cap goes down with your key</span>
    </div>
  );
}
