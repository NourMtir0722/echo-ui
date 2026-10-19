/**
 * How the rest of echo-ui-core tells the page check what only it can see: a part
 * asking for sound with no SoundProvider above it, which leaves nothing in
 * the page to look at.
 *
 * The page check's development entry opens the channel as it loads, before
 * anything renders. Until then, and in a production build where it never
 * loads, a note goes nowhere and costs one property read. It lives on
 * `globalThis` under a registered symbol, so two copies of the package on one
 * page still share it.
 */
import type { PageFinding } from "./types";

export type PageCheckNote = Pick<PageFinding, "rule" | "message" | "key">;

export interface PageCheckChannel {
  notes: Map<string, PageCheckNote>;
  listeners: Set<(note: PageCheckNote) => void>;
}

const KEY = Symbol.for("echo-ui-core.page-check");
const slot = globalThis as unknown as Record<symbol, PageCheckChannel | undefined>;

/** Tell the page check something, if it's listening. Each note is said once per page. */
export function noteForPageCheck(note: PageCheckNote): void {
  const channel = slot[KEY];
  if (!channel || channel.notes.has(note.key)) return;
  channel.notes.set(note.key, note);
  for (const listener of channel.listeners) listener(note);
}

/** The page check's end: opened once, then shared. */
export function openPageCheckChannel(): PageCheckChannel {
  return (slot[KEY] ??= { notes: new Map(), listeners: new Set() });
}
