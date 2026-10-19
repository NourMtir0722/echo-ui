/**
 * What each guide describes, for the guide lock.
 *
 * The component pages have the docs lock: change a component's source and its
 * page reddens until someone re-reads it and runs `pnpm docs:ack`. The guides
 * had nothing like it, and in three weeks Theming, Styles and Installation fell
 * behind the code they describe: "three settings" when there were five, a page
 * check table with 5 of its 9 rules, a sound step that never said sound starts
 * muted. Now each guide names the code it makes claims about, its hash is kept
 * in `docs-lock.json` as `guide:<name>`, and a change to any of it reddens the
 * guide the same way.
 *
 * Paths are from the repository root; a folder means every file in it, tests
 * aside. A guide that states nothing about code says why instead, so leaving a
 * guide out is a choice someone wrote down, never an omission. Every guide
 * folder must have an entry (lock.test.ts).
 */
export type GuideSources = readonly string[] | { none: string };

/** By guide folder; `introduction` is `/docs` itself. */
export const GUIDE_SOURCES: Readonly<Record<string, GuideSources>> = {
  introduction: ["packages/cli/src/index.ts", "registry/src/agent/skills"],
  workflow: ["packages/cli/src/index.ts", "packages/cli/src/commands/style.ts", "packages/cli/src/commands/init.ts", "registry/src/agent/skills", "registry/styles"],
  installation: [
    "packages/cli/src/commands/init.ts",
    "packages/core/src/check",
    "packages/core/src/sound/sound-provider.tsx",
    "packages/core/package.json",
    "registry/src/agent/csp.ts",
  ],
  components: { none: "The index is generated from the catalog (ComponentIndex)." },
  cli: ["packages/cli/src/index.ts", "packages/cli/src/commands", "registry/src/agent/cli-options.ts"],
  checks: [
    "packages/cli/src/check",
    "packages/cli/src/commands/check.ts",
    "packages/cli/src/commands/test.ts",
    "packages/cli/src/ci.ts",
    "packages/core/src/check",
    "registry/src/agent/check",
    "registry/src/agent/config-schema.ts",
    "registry/src/agent/axe-rules.ts",
  ],
  "in-your-project": ["registry/src/agent/footprint.ts", "packages/cli/src/commands/agent.ts", "packages/cli/src/agent-files.ts"],
  "echo-json": ["registry/src/agent/config-schema.ts"],
  registry: ["registry/src/registry/e-format.ts", "packages/client/src"],
  changelog: { none: "It renders CHANGELOG.md, which is the record itself." },
  principles: { none: "It renders PRINCIPLES.md." },
  theming: ["packages/core/src/theme"],
  styles: [
    "packages/cli/src/commands/style.ts",
    "registry/src/agent/style-schema.ts",
    "registry/src/agent/slop.ts",
    "registry/src/agent/style-fit.ts",
    "registry/styles",
  ],
  typeset: ["packages/core/src/theme/scales.ts", "packages/core/src/theme/seed.ts"],
  "motion-and-sound": ["packages/core/src/motion", "packages/core/src/sound", "packages/core/src/tactile"],
  patterns: ["registry/src/agent/screen-rules.ts"],
  content: { none: "It's about the words in a component's slots, which the component pages own." },
  mcp: ["mcp/src/tools.ts", "mcp/src/server.ts", "mcp/src/http.ts", "mcp/src/worker.ts", "mcp/src/style-tools.ts"],
  ai: ["registry/src/agent/guidance.ts", "registry/src/agent/footprint.ts", "registry/src/agent/design-md.ts"],
  plugin: ["mcp/src/plugin.ts", "mcp/src/plugin-downloads.ts", "mcp/src/build-plugin.ts", "registry/src/agent/skills"],
};
