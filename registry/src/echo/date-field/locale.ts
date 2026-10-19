"use client";

import { useSyncExternalStore } from "react";

const noSubscription = () => () => {};

/**
 * The locale a date is written in: `locale` when it's given, otherwise the
 * browser's. The server can't know the browser's, so the page renders
 * "en-US" first and switches on the client: hydration is never a mismatch,
 * and passing `locale` (from the request's Accept-Language, say) means there
 * is nothing to switch.
 */
export function useDateLocale(locale?: string): string {
  const browser = useSyncExternalStore(
    noSubscription,
    () => navigator.language,
    () => "en-US",
  );
  return locale ?? browser;
}
