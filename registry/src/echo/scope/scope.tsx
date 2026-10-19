/**
 * Scope. Part of the page speaking with its own vocabulary: a colour of its
 * own, or softer, puffier plastic.
 *
 * `accent` gives what's inside a colour for identity: a category, a filter
 * pad, a person, a creature. It's the same theme engine run on your colour,
 * so the lit caps, the glow and the LEDs are derived and contrast-checked
 * exactly as your main accent is, and every component inside picks them up
 * without a prop of its own. It's for telling things apart, never for state:
 * an error is still said in words.
 *
 * `molding="soft"` rounds the caps inside and fills them out, with a pillow of
 * light across their tops and a deeper shade underneath.
 *
 * It draws nothing itself (it takes no space), so it wraps anything.
 */
import type { CSSProperties, ReactNode } from "react";
import { createEchoTheme } from "echo-ui-core/theme";
import "./scope.css";

export interface ScopeProps {
  children: ReactNode;
  /** A colour of its own for what's inside, as a hex: "#F2674E". */
  accent?: string;
  /**
   * Your theme's chassis and paper, when they aren't Echo's defaults: the
   * accent's caps and glow are checked against them.
   */
  seed?: { chassis?: string; paper?: string };
  /** `soft`: rounder, fuller caps with a pillow of light. */
  molding?: "soft";
}

/** The roles an accent decides, which a Scope re-derives for its own colour. */
const ACCENT_ROLES = [
  "accent",
  "accent-highlight",
  "accent-pressed",
  "accent-glow",
  "accent-ink",
  "primary-cap-top",
  "primary-cap-mid",
  "primary-cap-base",
  "primary-cap-ink",
  "pour-top",
  "pour-mid",
  "pour-base",
  "accent-fill-top",
  "accent-fill-base",
  "lcd-glow",
] as const;

const derived = new Map<string, Record<string, string>>();

/** The accent's roles, as the variables components read. Pure, and cached per colour. */
export function accentVariables(accent: string, seed: ScopeProps["seed"] = {}): Record<string, string> {
  const key = `${accent}|${seed.chassis ?? ""}|${seed.paper ?? ""}`;
  const hit = derived.get(key);
  if (hit) return hit;
  const { values } = createEchoTheme({ accent, ...seed }, { quiet: true });
  const vars: Record<string, string> = {};
  for (const role of ACCENT_ROLES) vars[`--echo-${role}`] = values.roles[role];
  values.accentRamp.forEach((stop, i) => {
    vars[`--echo-accent-${i + 1}`] = stop;
  });
  derived.set(key, vars);
  return vars;
}

export function Scope({ children, accent, seed, molding }: ScopeProps) {
  // The accent's roles, as variables the stylesheets read.
  const style = (accent ? accentVariables(accent, seed) : undefined) as CSSProperties | undefined;
  return (
    <div className="echo-scope" data-molding={molding} style={style}>
      {children}
    </div>
  );
}
