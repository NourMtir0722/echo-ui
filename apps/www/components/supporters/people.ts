/**
 * Everyone on the island: Noor first (she made Echo, so hers is the maker's
 * place, in front of her house on the hill), then the supporters, monthly
 * before one-time (live.ts reads the list from the supporters server).
 */
import { X_PROFILE } from "@/components/home/NavTools";
import type { LinkKind, Supporter } from "@/components/support/supporters";
import { blueOf } from "./finish";

export type Plan = "maker" | "monthly" | "once";

export interface Person {
  id: string;
  name: string;
  plan: Plan;
  links: { kind: LinkKind; href: string }[];
  founding?: boolean;
  no?: number;
  since?: string;
  /** How many times they've supported. */
  times?: number;
  /** Their time on the island has run out: their Echo sleeps until they support again. */
  asleep?: boolean;
  /** Their Echo's own blue, filled in by `everyone`: what stands in until its photograph is ready. */
  colour?: string;
}

/** Noor's place, the maker's: her links, for now X alone. */
export const NOOR: Person = {
  id: "noor",
  name: "Noor",
  plan: "maker",
  links: [{ kind: "x", href: X_PROFILE }],
};

/** Everyone in the island's order (Noor, monthly, one-time; within each, by number), each with their blue. */
export function everyone(accent: string, supporters: readonly Supporter[]): Person[] {
  const order = { maker: 0, monthly: 1, once: 2 } as const;
  const sorted = [NOOR, ...supporters].sort((a, b) => order[a.plan] - order[b.plan] || (a.no ?? 0) - (b.no ?? 0));
  return sorted.map((p) => ({ ...p, colour: blueOf(p, accent) }));
}

export const PLAN_LABEL: Record<Plan, string> = {
  maker: "Made Echo",
  monthly: "Monthly supporter",
  once: "Supporter",
};

/** What the founding mark says. Only thanks: nothing about why. */
export const FOUNDING_THANKS = "Thank you for helping make Echo better.";

/** "No. 012": a number with weight, the way a numbered print is signed. */
export const numberOf = (p: Pick<Person, "no">) => (p.no === undefined ? "" : `No. ${String(p.no).padStart(3, "0")}`);
