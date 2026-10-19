/**
 * The team's own rules, from echo.json's `check` (the schema is
 * registry/src/agent/config-schema.ts). No project needs any: they only add.
 *
 * - `rules`: turn one of check's rules `off`, or to `info` (said, not counted),
 *   or one axe rule, as `axe:<id>`.
 * - `ban`: imports the team doesn't use, each with what to use instead.
 * - `colours`: brand colours the seed doesn't produce, allowed where check
 *   would flag a colour written by hand.
 *
 * A mistake in them fails loudly: a rule name that isn't one would otherwise
 * quietly turn nothing off, and the team would think it had.
 */
import { AXE_RULES } from "../axe-rules";
import { CHECK_RULES, RULE_LEVELS, type AxeRuleKey, type CheckRule, type TeamRules } from "../config-schema";

import type { Finding, FileResult } from "./rules";

export class TeamRulesError extends Error {}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** echo.json's `check`, checked. Throws TeamRulesError, with what's wrong and what would be right. */
export function readTeamRules(value: unknown): TeamRules {
  if (value === undefined) return {};
  const where = "echo.json's `check`";
  if (!isObject(value)) throw new TeamRulesError(`${where} should be an object with \`rules\`, \`ban\` or \`colours\`.`);
  for (const key of Object.keys(value)) {
    if (!["rules", "ban", "colours"].includes(key)) throw new TeamRulesError(`${where} has \`${key}\`; it takes \`rules\`, \`ban\` and \`colours\`.`);
  }
  const team: TeamRules = {};
  if (value.rules !== undefined) {
    if (!isObject(value.rules)) throw new TeamRulesError(`${where}.rules should map a rule to "off" or "info".`);
    const rules: TeamRules["rules"] = {};
    for (const [rule, level] of Object.entries(value.rules)) {
      if (rule.startsWith("axe:")) {
        // One that axe doesn't run (misspelt, experimental, deprecated) would turn nothing off.
        if (!(AXE_RULES as readonly string[]).includes(rule.slice(4))) {
          throw new TeamRulesError(`${where}.rules names \`${rule}\`, which isn't one of the axe rules Echo runs: ${AXE_RULES.join(", ")}.`);
        }
      } else if (!(CHECK_RULES as readonly string[]).includes(rule)) {
        throw new TeamRulesError(`${where}.rules names \`${rule}\`, which isn't one of check's rules: ${CHECK_RULES.join(", ")}.`);
      }
      if (!(RULE_LEVELS as readonly unknown[]).includes(level)) {
        throw new TeamRulesError(`${where}.rules.${rule} is ${JSON.stringify(level)}; it takes "off" or "info".`);
      }
      rules[rule as CheckRule | AxeRuleKey] = level as (typeof RULE_LEVELS)[number];
    }
    team.rules = rules;
  }
  if (value.ban !== undefined) {
    if (!Array.isArray(value.ban)) throw new TeamRulesError(`${where}.ban should be a list of { "import", "message" }.`);
    team.ban = value.ban.map((entry, i) => {
      if (!isObject(entry) || typeof entry.import !== "string" || !entry.import || typeof entry.message !== "string" || !entry.message) {
        throw new TeamRulesError(`${where}.ban[${i}] needs an \`import\` and a \`message\`, both words.`);
      }
      return { import: entry.import, message: entry.message };
    });
  }
  if (value.colours !== undefined) {
    if (!Array.isArray(value.colours) || !value.colours.every((c) => typeof c === "string" && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(c))) {
      throw new TeamRulesError(`${where}.colours should be a list of hex colours, like "#FF5A1F".`);
    }
    team.colours = value.colours as string[];
  }
  return team;
}

/** "#f60" and "#FF6600" are the same colour. */
function hex6(colour: string): string | undefined {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(colour.trim());
  if (!m) return undefined;
  const h = m[1]!.toLowerCase();
  return h.length === 3 ? [...h].map((c) => c + c).join("") : h;
}

export function isTeamColour(team: TeamRules, literal: string): boolean {
  const mine = hex6(literal);
  return mine !== undefined && (team.colours ?? []).some((c) => hex6(c) === mine);
}

/** Whether an import is one the team banned, and what to say about it. */
export function bannedImport(team: TeamRules, from: string): string | undefined {
  return team.ban?.find((b) => (b.import.endsWith("*") ? from.startsWith(b.import.slice(0, -1)) : from === b.import))?.message;
}

/** A file's result with the team's levels applied: a rule `off` is dropped, one at `info` is said as a note. */
export function applyTeam(result: FileResult, team: TeamRules): FileResult {
  if (!team.rules) return result;
  const findings: Finding[] = [];
  const notes = [...result.notes];
  for (const f of result.findings) {
    const level = team.rules[f.rule];
    if (level === "off") continue;
    if (level === "info") notes.push({ file: f.file, line: f.line, message: `${f.message} (the team's rules: said, not counted)` });
    else findings.push(f);
  }
  return { findings, notes };
}
