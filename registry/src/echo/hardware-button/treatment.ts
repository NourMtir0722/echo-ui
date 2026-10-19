/**
 * The supported-treatment guard for HardwareButton.
 *
 * Its own module, with no CSS import, so it can be unit-tested without
 * mounting a cap that GSAP drives through useTactile. The rule is about a prop
 * combination, not about rendering.
 */
export type HardwareButtonVariantName = "primary" | "neutral" | "ghost";

let warnedEngravedPrimary = false;

/**
 * Warns once when `engraved` is combined with `variant="primary"`.
 *
 * Debossed type measures ~1.05-1.3:1 over the primary gradient. On a neutral
 * cap that is a defensible decorative treatment — low contrast IS the carved
 * effect. On the primary cap it is reserved for the control that commits the
 * screen, and both shipped templates had used it on their submit button: the
 * one word that says what the form does rendered as a smudge.
 *
 * A warning rather than an error, because it is a legibility judgement and not
 * a crash. Once per process rather than once per render, because a warning on
 * every paint is noise, and noise is how the last one got ignored.
 *
 * Returns true when it warned.
 */
export function warnIfUnsupportedTreatment(
  variant: HardwareButtonVariantName,
  engraved: boolean,
): boolean {
  if (!engraved || variant !== "primary") return false;
  if (warnedEngravedPrimary) return false;
  warnedEngravedPrimary = true;
  console.warn(
    '[echo-ui] <HardwareButton engraved variant="primary"> is not supported. ' +
      "Debossed type measures ~1.05-1.3:1 over the primary gradient, and the primary " +
      "cap is the control that commits the screen \u2014 its label cannot be decorative. " +
      "Use `engraved` on a neutral cap, or drop it here.",
  );
  return true;
}

/** Test seam: lets the suite assert the warning fires exactly once. */
export function __resetEngravedPrimaryWarning(): void {
  warnedEngravedPrimary = false;
  warnedCaption = false;
}

let warnedCaption = false;

/**
 * Warns once when a caption is just a shorter spelling of the label.
 *
 * The two shipped templates had reached opposite conclusions about captions
 * and one of them had written its reasoning down as a rule, so the rule was
 * picked rather than left to taste: a caption says something the label cannot
 * — a device state, a shortcut, a unit — or it does not appear.
 *
 * Deliberately narrow. It compares the caption to the label's own text and
 * only fires when one contains the other, so "rec" under "Record" is caught
 * and "48kHz" under "Sample rate" is not.
 */
export function warnIfCaptionRepeatsLabel(caption: unknown, label: unknown): boolean {
  if (typeof caption !== "string" || typeof label !== "string") return false;
  const c = caption.trim().toLowerCase();
  const l = label.trim().toLowerCase();
  if (!c || !l) return false;
  if (!(l.includes(c) || c.includes(l))) return false;
  if (warnedCaption) return false;
  warnedCaption = true;
  console.warn(
    `[echo-ui] <HardwareButton caption="${caption}"> repeats its own label ("${label}"). ` +
      "A caption says something the label cannot — a device state, a shortcut, a unit. " +
      "If it is a shorter spelling of the label, drop it.",
  );
  return true;
}
