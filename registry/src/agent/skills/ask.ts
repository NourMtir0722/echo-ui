/**
 * When an agent asks the builder instead of deciding: written once, so
 * Design Eye, Style Fit and the skill that builds screens ask the same way.
 * The builder keeps the last word: an agent never keeps
 * a pairing the slop police bans, and never fills a gap with its own habits.
 */
export function askTheBuilder(): string {
  return [
    "## Asking the builder",
    "",
    "When you're not sure, ask. Don't guess, and don't reach for your own default: a default nobody chose is exactly what reads as AI-made. You're not sure when:",
    "",
    "- the slop police stops something the board or the builder seems to want;",
    "- no decision in the style covers a choice you're about to make;",
    "- two rules disagree.",
    "",
    "Ask in one message, at most three questions, each with the answer you'd suggest first and one line on why. Write the answer where it will be read next time (the style's `keeps` or `decisions`, or the `## Product` section of `DESIGN.md`), so the same question is never asked twice.",
    "",
    "**Only the builder keeps a banned pairing.** Never add to `keeps` on your own. If no one is there to answer (a run with nobody watching), take your suggested answer, say so in your last message, and where the police is involved, change the ingredient instead of keeping it.",
  ].join("\n");
}
