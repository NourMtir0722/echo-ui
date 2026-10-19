/**
 * A prop whose type zod cannot express — a ReactNode, an element, a backend
 * object — but whose NAME the docs should still show.
 *
 * `z.unknown()` alone renders as "unknown" in every prop table, which tells a
 * reader nothing. `typed("ReactNode")` validates the same (anything) and
 * carries the display name on its def, where `typeName` in props.ts reads it.
 * Kept out of props.ts so that walker stays free of a zod import.
 */
import { z } from "zod";

export function typed(name: string) {
  const schema = z.unknown();
  (schema._zod.def as { echoType?: string }).echoType = name;
  return schema;
}
