/**
 * Putting a part's own handlers and ref together with the ones it was given,
 * so neither side wins: a Base UI trigger, a Tooltip wrapping the part and the
 * part's physics all hear the same pointer.
 */
import type { DOMAttributes, Ref, RefCallback } from "react";

type Handler = (event: never) => void;

/**
 * Every handler in `own`, called after the same-named one in `incoming` (the
 * caller's runs first, as if the part were a plain element).
 */
export function mergeHandlers<T>(
  own: DOMAttributes<T>,
  incoming: Record<string, unknown> = {},
): DOMAttributes<T> {
  const merged: Record<string, Handler> = {};
  for (const key of Object.keys(own) as (keyof DOMAttributes<T>)[]) {
    const mine = own[key] as Handler | undefined;
    const theirs = incoming[key] as Handler | undefined;
    merged[key] = (event) => {
      theirs?.(event);
      mine?.(event);
    };
  }
  return merged as DOMAttributes<T>;
}

/** One ref that fills every ref it is given, callback or object. */
export function mergeRefs<T>(...refs: (Ref<T> | undefined)[]): RefCallback<T> {
  return (node) => {
    for (const ref of refs) {
      if (typeof ref === "function") ref(node);
      else if (ref) (ref as { current: T | null }).current = node;
    }
  };
}
