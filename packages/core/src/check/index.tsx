"use client";

/**
 * echo-ui-core/check, in development: `<EchoCheck />` in the root layout
 * watches the running page and reports what the source can't show (colours
 * as computed, names set at runtime, contrast, the setup, the screen rules
 * that need a render) to the console, and to a small overlay when asked.
 *
 * Bundlers pick this entry through the `development` export condition. A
 * production build gets `off.ts` instead, which renders nothing, so none of
 * this reaches a shipped bundle.
 */
import { useEffect } from "react";

import { openPageCheckChannel } from "./channel";
import type { EchoCheckProps } from "./types";
import { startPageCheck } from "./watch";

// Open before anything renders, so a note from the first render isn't missed.
if (typeof window !== "undefined") openPageCheckChannel();

export function EchoCheck({ overlay = false, ignore, colours }: EchoCheckProps) {
  // Compared by value: a new array on every render isn't a new setting.
  const ignored = (ignore ?? []).join(" ");
  const allowed = (colours ?? []).join(" ");
  useEffect(
    () =>
      startPageCheck({
        overlay,
        ignore: ignored ? (ignored.split(" ") as EchoCheckProps["ignore"]) : undefined,
        colours: allowed ? allowed.split(" ") : undefined,
      }),
    [overlay, ignored, allowed],
  );
  return null;
}

export { PAGE_RULES, PAGE_SCREEN_RULES } from "./types";
export type { PageFinding, PageCheckOptions, PageRule, EchoCheckProps } from "./types";
