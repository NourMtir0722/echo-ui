/**
 * The core gate, as a decision: may `/e/` declare the workspace's
 * echo-ui-core? core-version.test.ts asks it of the repository's real
 * versions; core-gate.test.ts asks it of the cases that matter.
 */
import { coreRange, rangeAdmits } from "./e-format";

export interface CoreGateFacts {
  /** packages/core/package.json: what the next publish is called. */
  workspace: string;
  /** published-core.json: what npm holds. */
  published: string;
  /** CLI_RELEASED: the registry is public, so its range has to be installable. */
  released: boolean;
  /**
   * The version the Release workflow is publishing in this run (`ECHO_RELEASING`).
   * It checks before it publishes and deploys after, so the core it names is the
   * one about to exist.
   */
  releasing?: string;
}

/** What's wrong, or nothing. */
export function coreGateProblem({ workspace, published, released, releasing }: CoreGateFacts): string | undefined {
  if (!released) return undefined;
  const range = coreRange(workspace);
  if (rangeAdmits(range, published)) return undefined;
  if (releasing !== undefined && releasing === workspace) return undefined;
  return (
    `every /e/ item declares echo-ui-core ${range} and npm's published version is ` +
    `${published} — every \`echo-ui-cli add\` fails until core is published. ` +
    "Publish core, then bump packages/core/published-core.json (see published-core.md)."
  );
}
