/**
 * What Echo says about a style and the theme it makes, as sentences: what the
 * theme corrected, the slop police's word, the decisions left open.
 *
 * `style check`, `style use` and `style set` in the CLI print these, and the
 * MCP server's check_style and wear_style answer with them, so a builder in a
 * terminal and one in a chat read the same words about the same style. Each
 * note says how loud it is; how it looks is the caller's (the CLI's colours,
 * the server's markdown).
 */
import type { EchoThemeResult } from "echo-ui-core/theme";

import { runCommand } from "./guidance";
import { CHART_DATE, policeQuestion, policeStyle, type PoliceReport } from "./slop";
import { DECISIONS, undecided, type AppliedStyle, type DecisionKey, type EchoStyle } from "./style-schema";

export type ThemeReport = EchoThemeResult["report"];

/** `step`: something done or found. `warn`: something wrong. `note`: worth knowing, quieter. */
export interface StyleNote {
  level: "step" | "warn" | "note";
  text: string;
}

/**
 * The accent the theme moved into Echo's lightness band, as a sentence, or
 * nothing. The change a builder sees most, and the one the contrast report
 * didn't cover.
 */
export function accentMoved(report: ThemeReport): string | undefined {
  if (!report.accent) return undefined;
  return `The accent ${report.accent.from.toUpperCase()} comes out as ${report.accent.to.toUpperCase()}: Echo holds every accent to one lightness, so a lit cap reads the same in every style.`;
}

/** What the theme corrected, whether it moved the accent, what's hard to read, and the fonts to get. */
export function themeNotes(report: ThemeReport, fonts?: AppliedStyle["fonts"]): StyleNote[] {
  const notes: StyleNote[] = [];
  const moved = accentMoved(report);
  if (moved) notes.push({ level: "step", text: moved });
  if (report.corrected.length) notes.push({ level: "step", text: `Corrected for AA contrast: ${report.corrected.join(", ")}.` });
  if (report.unsatisfiable.length) notes.push({ level: "warn", text: `No colour could make these readable everywhere they sit: ${report.unsatisfiable.join("; ")}.` });
  // Past AA: small text in APCA, a cap's edge, colour blindness. What's hard to read for anyone is a warning; what's under comfortable, a note.
  for (const note of report.readability ?? []) notes.push({ level: note.level === "fail" ? "warn" : "note", text: `Readability: ${note.message}` });
  for (const font of fonts ?? []) notes.push({ level: "note", text: `Font: ${font.family} (${font.role}), from ${font.source}${font.url ? `: ${font.url}` : ""}` });
  return notes;
}

/**
 * What the slop police says about a style: the banned pairings it hasn't kept
 * (each with the question for the builder), what the builder kept, and what
 * the style leaves undecided.
 */
export function policeNotes(style: EchoStyle): { police: PoliceReport; notes: StyleNote[] } {
  const police = policeStyle(style);
  const notes: StyleNote[] = [];
  for (const k of police.kept) notes.push({ level: "note", text: `Kept on purpose, by the builder: ${k.name.toLowerCase()} (${k.reason})` });
  for (const b of police.banned) notes.push({ level: "warn", text: `Slop police: ${b.name.toLowerCase()}: ${b.ingredients.join("; ")}. ${b.why}` });
  if (police.banned.length) {
    notes.push({ level: "note", text: "Don't keep it yourself: ask the builder, in one message." });
    for (const b of police.banned) notes.push({ level: "note", text: `Ask: ${policeQuestion(b)}` });
    notes.push({
      level: "note",
      text: `If they keep it, add \`{ "rule": "${police.banned[0]!.id}", "reason": "<their words>" }\` to the style's \`keeps\`; if they change it, change it and check again. (The chart: ${CHART_DATE}.)`,
    });
  }
  const open = undecided(style);
  if (open.length === Object.keys(DECISIONS).length) notes.push({ level: "note", text: "It names no decisions yet (`decisions`): every screen built in it will ask, or fall back to Echo's defaults." });
  else if (open.length) notes.push({ level: "note", text: `Undecided: ${open.map((key: DecisionKey) => DECISIONS[key].toLowerCase()).join("; ")}. The agent building a screen asks the builder, or uses Echo's default and says so.` });
  if (!style.seed.fontSans) notes.push({ level: "note", text: "No typeface is named: Echo's system font is a default, not a decision." });
  return { police, notes };
}

/** Why a style isn't worn while the police stops it, and the question to put to the builder, as `style use` says it. */
export function stoppedNotes(style: EchoStyle, police: PoliceReport, checkWith: string): StyleNote[] {
  return [
    { level: "warn", text: `The slop police stops ${style.title}: ${police.banned.map((b) => `${b.name.toLowerCase()} (${b.ingredients.join("; ")})`).join("; ")}.` },
    ...police.banned.map((b): StyleNote => ({ level: "step", text: `Ask the builder: ${policeQuestion(b)}` })),
    { level: "note", text: `Only the builder can keep it: their reason goes in the style's \`keeps\`. ${checkWith} says the same, with what to change.` },
  ];
}

/** `style check <file>` as a command, for a note that points to it. */
export const styleCheckCommand = (path: string) => `\`${runCommand(`style check ${path}`)}\``;
