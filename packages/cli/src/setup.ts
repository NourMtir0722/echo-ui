import { PAGE_GROUND } from "@registry/agent/guidance";

/**
 * The setup an installed item needs, by id.
 *
 * Items name ids, never prose, so the CLI, the MCP and the docs say the same
 * thing. The CLI prints these; it never edits the user's source code. Editing
 * somebody's root layout is the kind of "help" that is impossible to undo and
 * hard to review, and Echo would rather be pasted in on purpose. (What it does
 * write for agents is marked as Echo's and comes out with `agent off`.)
 */
export interface SetupStep {
  id: string;
  title: string;
  lines: string[];
}

/**
 * The theme step, for the file the import goes in. `init` prints it with the
 * line worked out for the project (`themeImport`); the entry below is the same
 * step for when the project isn't known.
 */
export function themeStep({ file, line }: { file: string; line: string }): SetupStep {
  return {
    id: "theme-css",
    title: "Put the theme on the page",
    lines: [
      `Components have no colour until the theme is there. \`echo-ui-cli init\` wrote it; import it once, in ${file}:`,
      "",
      `  ${line}`,
      "",
      "Give the page the device's ground:",
      "",
      `  body { ${PAGE_GROUND}; }`,
    ],
  };
}

export const SETUP_STEPS: Record<string, SetupStep> = {
  "theme-css": themeStep({ file: "your root layout (Next.js) or entry file (Vite)", line: 'import "<your Echo folder>/echo-theme.css";' }),
  "sound-provider": {
    id: "sound-provider",
    title: "Mount the sound provider",
    lines: [
      "This item makes sound. Without a provider it is silent — nothing breaks, but the feel is half there.",
      "",
      '  import { SoundProvider } from "echo-ui-core/sound";',
      "",
      "  <SoundProvider>{children}</SoundProvider>",
      "",
      "It starts muted until the person turns sound on, and remembers their choice. Give them a switch",
      "(useSound().setMuted from echo-ui-core/sound), or pass defaultMuted={false} to start with sound.",
    ],
  },
  "page-check": {
    id: "page-check",
    title: "Watch the running page (development only)",
    lines: [
      "Once, in the root layout:",
      "",
      '  import { EchoCheck } from "echo-ui-core/check";',
      "",
      "  <EchoCheck />",
      "",
      "In development it reports to the console what `check` can't see in the source: colours as they",
      "render, controls named at runtime, contrast, the setup, and the screen rules that need a page.",
      "A production build gets a component that renders nothing, so it can stay.",
    ],
  },
  "client-boundary": {
    id: "client-boundary",
    title: "Client components",
    lines: [
      "Echo's components run in the browser. In the Next.js App Router, a file that passes one a",
      'function (onSave, onValueChange, onClick) starts with "use client".',
    ],
  },
};

export function setupFor(ids: readonly string[]): SetupStep[] {
  return ids.map((id) => SETUP_STEPS[id]).filter((step): step is SetupStep => step !== undefined);
}
