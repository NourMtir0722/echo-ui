"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Copy text, and remember for a moment that it worked. `copied` is what the
 * button label and the polite status region read.
 *
 * The clipboard is permission-gated and can refuse; nothing is thrown, the
 * text stays selectable on the page either way.
 */
export function useCopy(resetMs = 1600) {
  const [copied, setCopied] = useState(false);
  // React 19's types dropped the zero-argument overload: an initial value is required.
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), resetMs);
    } catch {
      // Refused or unavailable; see above.
    }
  }

  return { copied, copy };
}
