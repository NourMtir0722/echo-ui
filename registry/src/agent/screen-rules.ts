/**
 * The screen rules: how an Echo screen is put together, as opposed to how a
 * part is used.
 *
 * A draft, until it's been edited and approved. Until then nothing renders
 * it into what `init` writes (the block, the skill); only `check` quotes a
 * rule by its number and name when it sees one broken in the source. When
 * the text changes, the check's messages change with it, and a test holds
 * the two together: every rule the source can see has a check, and every
 * screen check names a rule here.
 */

export interface ScreenRule {
  n: number;
  name: string;
  /** The rule, in the words an agent reads. */
  rule: string;
  /** What can catch it: `check` in the source, the running page, or only judgement. */
  seenBy: "source" | "render" | "judgement";
}

export const SCREEN_RULES: readonly ScreenRule[] = [
  {
    n: 1,
    name: "One device",
    rule: "Build a screen from Echo only: no other library's components on the same screen, and no raw elements styled to look like Echo.",
    seenBy: "source",
  },
  {
    n: 2,
    name: "One lit cap per decision",
    rule: "A form, a dialog or a toolbar has one `primary` action, the one you'd keep if you could keep only one. The rest are `neutral` or `ghost`.",
    seenBy: "source",
  },
  {
    n: 3,
    name: "One \"you are here\"",
    rule: "A page shows the current location once: one lit rail, in the navigation that owns it.",
    seenBy: "render",
  },
  {
    n: 4,
    name: "Nothing destructive happens on one press",
    rule: "An action that deletes, discards, resets or revokes goes through AlertDialog, ConfirmButton or HoldButton.",
    seenBy: "source",
  },
  {
    n: 5,
    name: "A confirmation names the consequence",
    rule: "The confirming answer says what happens (\"Delete 3 projects\"), never \"OK\", \"Yes\" or \"Confirm\".",
    seenBy: "source",
  },
  {
    n: 6,
    name: "Interrupt only for a big mistake",
    rule: "A dialog that stops everything is for a decision that can't be taken back. For what can be undone, do it, then offer Undo.",
    seenBy: "judgement",
  },
  {
    n: 7,
    name: "Same look, same behaviour",
    rule: "A cap does something; a link goes somewhere. A part that looks like another part behaves like it.",
    seenBy: "judgement",
  },
  {
    n: 8,
    name: "Materials keep their jobs",
    rule: "Caps are pressed, wells hold a value, screens report, glass arrives and leaves. A read-only number goes on a screen, not in a field or on a cap.",
    seenBy: "judgement",
  },
  {
    n: 9,
    name: "State is said, not coloured",
    rule: "Every state is readable with the colour taken away: an error says so, a status has its word or its shape.",
    seenBy: "render",
  },
  {
    n: 10,
    name: "Instruments for instrument jobs",
    rule: "Knobs, faders and readouts for levels, tuning and live values; everyday controls for everyday actions.",
    seenBy: "judgement",
  },
  {
    n: 11,
    name: "An AI action shows what it will do first",
    rule: "Anything an agent does on the person's behalf shows a preview and waits for a yes.",
    seenBy: "judgement",
  },
];

export function screenRule(n: number): ScreenRule {
  const rule = SCREEN_RULES.find((r) => r.n === n);
  if (!rule) throw new Error(`No screen rule ${n}.`);
  return rule;
}
