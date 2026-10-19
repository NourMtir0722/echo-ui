/**
 * What Echo claims about every component's accessibility, and what it does
 * not.
 *
 * One record, read by three places that must not disagree: the `/e/` item a
 * CLI installs, the `get_accessibility` answer an agent reads, and the note at
 * the bottom of every component page. A guarantee stated three times in three
 * wordings is a guarantee nobody can check.
 *
 * `limits` is the part that earns the rest. A page that lists six green checks
 * and stays quiet about the seventh reads as "all of it is covered", which is
 * the one thing this record must never imply.
 */
export interface ConformanceCheck {
  id: string;
  /** What the check proves, in the words a reader would use. */
  what: string;
  /** The suite that runs it, so a claim can be traced to a file. */
  where: string;
}

export const CONFORMANCE_STANDARD = "WCAG 2.2 AA";

/** What the suite actually proves, per release. Every entry runs on every component. */
export const CONFORMANCE_CHECKS: readonly ConformanceCheck[] = [
  { id: "axe", what: "No axe violations, in the component's own gallery and on its page.", where: "tests/docs.spec.ts (every doc page), and each gallery spec for its own states" },
  { id: "keyboard", what: "Every action is reachable and operable from the keyboard alone.", where: "tests/controls.spec.ts, tests/inputs.spec.ts, tests/overlays.spec.ts, tests/modal.spec.ts, tests/keys.spec.ts, and the other component specs" },
  { id: "focus-visible", what: "Focus is visible on every focusable part, in normal and forced-colors mode.", where: "tests/focus-contrast.spec.ts, tests/forced-colors.spec.ts" },
  { id: "forced-colors", what: "State stays visible when the look's colours are replaced by the system's.", where: "tests/forced-colors.spec.ts" },
  { id: "target-size", what: "Every target's real hit area is at least 24×24px, at every density.", where: "tests/target-size.spec.ts" },
  { id: "reflow", what: "Content reflows into 320px and survives a doubled text size.", where: "tests/reflow.spec.ts" },
];

/**
 * What is NOT covered. The screen-reader pass is a person's job
 * and has not happened yet; until it has, every component says so.
 */
export const CONFORMANCE_LIMITS: readonly string[] = [
  "screen-reader: not yet verified by a person",
];

/** The shape the `/e/` format publishes per item. */
export const conformanceRecord = () => ({
  standard: CONFORMANCE_STANDARD,
  tested: CONFORMANCE_CHECKS.map((c) => c.id),
  limits: [...CONFORMANCE_LIMITS],
});
