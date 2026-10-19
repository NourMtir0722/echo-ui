/**
 * What the generator says when the clipboard refuses a copy (an iframe, a
 * denied permission): where the thing you asked for can be found instead.
 * One message used to cover every button, and it sent someone copying the
 * seed to the Generated CSS, which has no seed in it.
 */
export type Copyable = "CSS" | "Seed" | "Link";

export function clipboardBlocked(what: Copyable, text: string): string {
  switch (what) {
    case "CSS":
      return "The clipboard is blocked here — open Generated CSS below and copy it by hand.";
    case "Seed":
      return "The clipboard is blocked here — the seed is the three hex values above.";
    case "Link":
      return `The clipboard is blocked here — copy the link by hand: ${text}`;
  }
}
