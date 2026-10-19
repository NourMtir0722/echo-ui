"use client";

/** The live preview on /docs/tooltip. */
import { HardwareButton } from "@registry/echo/hardware-button";
import { Tooltip } from "@registry/echo/tooltip";
import { caption } from "./shared/main-caption";
import { PlayIcon } from "./shared/main-PlayIcon";
import { row } from "./shared/main-row";

export default function Preview() {
  return (
    <div style={row}>
      <Tooltip trigger={<HardwareButton iconOnly aria-label="Play" icon={<PlayIcon />} />}>
        Play
      </Tooltip>
      <span style={caption}>hover or focus the cap</span>
    </div>
  );
}
