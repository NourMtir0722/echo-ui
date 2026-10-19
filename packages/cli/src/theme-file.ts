/**
 * echo-theme.css: the theme a seed makes, written where the components are.
 * `init` writes it from its seed, `style use` from a style's; both say what
 * the contrast guarantee corrected, and when the accent was moved.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createEchoTheme, type EchoSeedInput, type EchoThemeResult } from "echo-ui-core/theme";
import { runCommand } from "@registry/agent/guidance";

export const THEME_FILE = "echo-theme.css";

export type ThemeReport = EchoThemeResult["report"];

// The sentence lives with the rest of what Echo says about a theme, which the MCP server says too.
export { accentMoved } from "@registry/agent/style-notes";

export async function writeTheme(
  root: string,
  dir: string,
  seed?: EchoSeedInput,
  style?: string,
  /** The settings `style set` has moved since the style was worn. */
  changed: readonly string[] = [],
): Promise<ThemeReport> {
  const { css, report } = createEchoTheme(seed, { quiet: true });
  const setOne = ` * Change one setting with \`${runCommand("style set <setting> <value>")}\`; \`${runCommand("style set")}\` alone lists them.`;
  const header = style
    ? [
        `/* Echo UI's theme, in the ${style} style, written by \`${runCommand(`style use ${style}`)}\`.`,
        ...(changed.length ? [` * Changed since with \`${runCommand("style set")}\`: ${changed.join(", ")}.`] : []),
        setOne,
        ` * Wear another with \`${runCommand("style use <name>")}\`; \`${runCommand("style list")}\` shows them.`,
        " */",
      ]
    : [
        "/* Echo UI's theme, written from the seed in echo.json.",
        setOne,
        ` * Regenerate it with a different seed: \`${runCommand("init --yes --seed <hex>")}\`,`,
        " * or generate it at runtime with createEchoTheme() from echo-ui-core/theme.",
        " */",
      ];
  await mkdir(join(root, dir), { recursive: true });
  // `css` is already a complete `:root { … }` block. Wrapping it again left a
  // stray closing brace, which every CSS parser downstream complained about.
  await writeFile(join(root, dir, THEME_FILE), [...header, css.trimEnd(), ""].join("\n"));
  return report;
}
