/**
 * The page check on a live page: it looks once the page settles, again whenever
 * it changes, and says what's new in the console (and in the overlay, when
 * asked). An agent reading the console after a fix sees the finding go.
 */
import { openPageCheckChannel } from "./channel";
import { createOverlay } from "./overlay";
import { checkPage } from "./run";
import type { PageFinding, EchoCheckProps } from "./types";

/** Quiet time after a change before looking again. */
const SETTLE = 400;
/** A page that never stops changing (a clock, an animation) is still looked at this often. */
const AT_LEAST_EVERY = 2000;
/** More than this many new findings at once, and the rest are counted, not listed. */
const LISTED = 12;

function say(findings: PageFinding[], previous: ReadonlyMap<string, PageFinding>, first: boolean) {
  const fresh = findings.filter((f) => !previous.has(f.key));
  const keys = new Set(findings.map((f) => f.key));
  const fixed = [...previous.keys()].filter((k) => !keys.has(k)).length;
  if (!first && fresh.length === 0 && fixed === 0) return;
  for (const f of fresh.slice(0, LISTED)) {
    const text = `Echo check · ${f.rule}: ${f.where ? `${f.where}: ` : ""}${f.message}`;
    if (f.element) console.warn(text, f.element);
    else console.warn(text);
  }
  const unlisted = fresh.length - LISTED;
  const summary =
    findings.length === 0
      ? "nothing to fix on this page"
      : `${findings.length} to fix on this page${unlisted > 0 ? ` (${unlisted} more than listed: fix these first)` : ""}`;
  console.info(`Echo check: ${summary}${fixed > 0 ? `, ${fixed} fixed since the last look` : ""}.`);
}

/** Start watching the page; returns the function that stops. */
export function startPageCheck({ overlay = false, ...options }: EchoCheckProps = {}): () => void {
  if (typeof window === "undefined" || typeof document === "undefined") return () => {};
  const channel = openPageCheckChannel();
  const panel = overlay ? createOverlay() : undefined;
  let said = new Map<string, PageFinding>();
  let first = true;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let waitingSince: number | undefined;
  let stopped = false;

  const look = () => {
    if (stopped) return;
    waitingSince = undefined;
    const findings = checkPage(document, options, channel.notes.values());
    say(findings, said, first);
    first = false;
    said = new Map(findings.map((f) => [f.key, f]));
    panel?.show(findings);
  };
  const soon = () => {
    const now = Date.now();
    waitingSince ??= now;
    const overdue = now - waitingSince >= AT_LEAST_EVERY;
    if (timer !== undefined) {
      // Overdue and already on its way: let it come, rather than put it off again.
      if (overdue) return;
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      timer = undefined;
      if ("requestIdleCallback" in window) window.requestIdleCallback(look, { timeout: 1000 });
      else look();
    }, overdue ? 0 : SETTLE);
  };

  // The whole document: a stylesheet hot-reloaded into the head changes the page as much as the body does.
  const observer = new MutationObserver(soon);
  observer.observe(document.documentElement, { subtree: true, childList: true, attributes: true, characterData: true });
  channel.listeners.add(soon);
  window.addEventListener("resize", soon);
  soon();

  return () => {
    stopped = true;
    observer.disconnect();
    channel.listeners.delete(soon);
    window.removeEventListener("resize", soon);
    if (timer !== undefined) clearTimeout(timer);
    panel?.remove();
  };
}
