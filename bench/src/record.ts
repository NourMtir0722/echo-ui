/**
 * What one run leaves behind, as `score.json` next to its transcript. The
 * report reads nothing else, so this is the benchmark's whole data model.
 */
import type { Finding, Rule } from "./score/count";
import type { PageResult } from "./score/pages";
import type { AppFacts } from "./setups";

export interface RunRecord {
  label: string;
  setup: string;
  task: string;
  run: number;
  model: string;
  claudeCodeVersion?: string;
  startedAt: string;
  app: AppFacts;
  agent: {
    /** Why the run ended early; absent for a run that finished. */
    stopped?: string;
    turns?: number;
    durationMs?: number;
    wallMs: number;
    costUsd?: number;
    tokens: { input: number; output: number; cacheCreation: number; cacheRead: number };
  };
  /** The benchmark's own count, over the lines the agent wrote. */
  mistakes: Record<Rule, number>;
  findings: Finding[];
  /** What `echo-ui check` said about the same lines, once the CLI has it. */
  check?: { findings: number; byRule: Record<string, number> } | null;
  typeErrors: number;
  built: boolean;
  pages: Omit<PageResult, "screenshot">[];
}

/** Axe violations as elements caught, summed over every page. */
export const axeNodes = (record: Pick<RunRecord, "pages">): number =>
  record.pages.reduce((sum, p) => sum + Object.values(p.axe).reduce((s, v) => s + v.nodes, 0), 0);

export const totalTokens = (t: RunRecord["agent"]["tokens"]): number => t.input + t.output + t.cacheCreation + t.cacheRead;
