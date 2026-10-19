/**
 * The order of a WidgetGrid. Pure: no React, no DOM.
 */

/** The order with `id` moved to `to` (clamped to the ends). */
export function moveTo(order: readonly string[], id: string, to: number): string[] {
  const from = order.indexOf(id);
  if (from < 0) return [...order];
  const next = order.filter((x) => x !== id);
  const at = Math.max(0, Math.min(next.length, to));
  next.splice(at, 0, id);
  return next;
}

/** The order with `id` moved by `by` places. */
export function moveBy(order: readonly string[], id: string, by: number): string[] {
  return moveTo(order, id, order.indexOf(id) + by);
}

/** The ids in `order` that still exist, then any new ones in the order they're given. */
export function reconcile(order: readonly string[], ids: readonly string[]): string[] {
  const known = order.filter((id) => ids.includes(id));
  return [...known, ...ids.filter((id) => !known.includes(id))];
}
