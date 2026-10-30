"use client";

/**
 * The site on a light device or a dark one, at a press: the same accent,
 * molded in light plastic or dark, or the same style turned over. It's a
 * preview of Echo's two devices, kept with the rest of the visitor's theme; a
 * product built with Echo is one device, and its chassis decides which.
 */
import { LedKey } from "@registry/echo/led-key";
import { useSiteSeed, type Seed } from "@/components/site/theme-store";
import { isLightSeed, otherDevice } from "@/components/site/device-seed";

export function DeviceSwitch({
  opening,
}: {
  /** The colour the page opens on until the visitor picks one (the homepage's is Sky). */
  opening?: Seed;
}) {
  const [seed, setSeed] = useSiteSeed(opening);
  const light = isLightSeed(seed);
  return (
    <span className="echo-device-switch">
      <LedKey size="sm" lit={light} aria-pressed={light} onClick={() => setSeed(otherDevice(seed))}>
        Light
      </LedKey>
    </span>
  );
}
