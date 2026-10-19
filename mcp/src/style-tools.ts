/**
 * The style tools — list_styles, fit_styles, check_style, wear_style — as
 * handlers: what `npx echo-ui-cli style list | show | fit | check | use` does,
 * for a builder in a chat, where there's no terminal and no library on disk.
 *
 * Everything they decide comes from the same functions the CLI calls: the
 * order from `fitStyles`, a style's problems from `parseStyle`, the theme from
 * `createEchoTheme`, the police from `policeStyle`, and the sentences about
 * them from style-notes. What's here is only where the answer goes: a chat
 * gets text and files to keep, where the CLI writes into a project.
 *
 * A builder's own styles are never on this server. They come in as arguments
 * (a fingerprint to rank, a style.json to check or wear) and nothing of them
 * is kept.
 */
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { EStyleSummary } from "@echo-ui/client";
import { createEchoTheme, devicePolarity, SEED_DEFAULTS, type EchoSeedInput } from "echo-ui-core/theme";

import { designMd } from "@registry/agent/design-md";
import { generatorLink } from "@registry/agent/generator-link";
import { STYLE_LIBRARY, runCommand } from "@registry/agent/guidance";
import { policeStyle } from "@registry/agent/slop";
import { AXIS_LETTERS, fingerprintText, fitStyles, parseProfile, parseTolerance, type FitCandidate } from "@registry/agent/style-fit";
import { policeNotes, stoppedNotes, themeNotes, type StyleNote } from "@registry/agent/style-notes";
import { DECISIONS, appliedStyle, parseStyle, type DecisionKey, type EchoStyle } from "@registry/agent/style-schema";

import type { RegistrySource } from "./registry-source";

const text = (body: string, isError = false): CallToolResult => ({
  content: [{ type: "text", text: body }],
  ...(isError ? { isError: true } : {}),
});

/** A note as a line of markdown: a warning says so, the rest are plain. */
const bullet = (note: StyleNote) => `- ${note.level === "warn" ? "**Warning:** " : ""}${note.text}`;

/** Light plastic or dark, by the chassis: the same line the theme and the CLI draw. */
const deviceOf = (seed: EchoStyle["seed"]) => devicePolarity(seed.chassis ?? SEED_DEFAULTS.chassis);

const errorText = (error: unknown) => String(error instanceof Error ? error.message : error);

export function createStyleHandlers(registrySource?: RegistrySource) {
  async function echoStyles(): Promise<{ styles: EStyleSummary[]; error?: string }> {
    if (!registrySource) return { styles: [], error: "no registry is configured" };
    try {
      return { styles: await registrySource.styles() };
    } catch (error) {
      return { styles: [], error: errorText(error) };
    }
  }

  /** One of Echo's styles, or the answer that says it isn't one. */
  async function echoStyle(name: string): Promise<EchoStyle | CallToolResult> {
    if (!registrySource) return text("Echo's styles can't be read: no registry is configured.", true);
    try {
      return await registrySource.style(name);
    } catch (error) {
      const { styles } = await echoStyles();
      const there = styles.length ? ` Echo's library has: ${styles.map((s) => `\`${s.name}\``).join(", ")}.` : "";
      const why = /404|not found|isn't a style name/i.test(errorText(error)) ? "" : ` (${errorText(error)})`;
      return text(`There's no style called "${name}" in Echo's library.${there}${why} A style of the builder's own is passed as \`style\`, its style.json.`);
    }
  }

  return {
    list_styles: async ({ name }: { name?: string } = {}): Promise<CallToolResult> => {
      if (name) {
        const found = await echoStyle(name);
        if ("content" in found) return found;
        const s = found;
        const { police } = policeNotes(s);
        return text(
          [
            `# ${s.title} (Echo's library, a ${deviceOf(s.seed)} device)`,
            "",
            s.essence,
            "",
            `- Fingerprint: ${fingerprintText(s.fingerprint)}`,
            `- Settings: ${Object.entries(s.seed).map(([k, v]) => `${k} ${v}`).join(", ")}`,
            ...(s.rules ?? []).map((rule) => `- Rule: ${rule}`),
            ...(s.refusals ?? []).map((r) => `- Refused: ${r.wants}: instead, ${r.instead}`),
            ...(s.fonts ?? []).map((f) => `- Font: ${f.family} (${f.role}), from ${f.source}${f.url ? `: ${f.url}` : ""}`),
            ...(Object.keys(DECISIONS) as DecisionKey[]).filter((key) => s.decisions?.[key]).map((key) => `- Decision: ${DECISIONS[key]}: ${s.decisions![key]}`),
            ...(s.keeps ?? []).map((k) => `- Kept: ${k.rule}: ${k.reason}`),
            ...police.banned.map((b) => `- Slop police: stops ${b.name.toLowerCase()}: ${b.ingredients.join("; ")}`),
            ...(s.motion ? [`- Motion: ${s.motion.character}${s.motion.inferred ? " (inferred)" : ""}`] : []),
            ...(s.sound ? [`- Sound: ${s.sound.voice}${s.sound.inferred ? " (inferred)" : ""}`] : []),
            "",
            `Wear it with wear_style, name "${s.name}".`,
          ].join("\n"),
        );
      }

      const echo = await echoStyles();
      if (echo.error) return text(`Echo's library couldn't be read: ${echo.error}`, true);
      return text(
        [
          `Echo's styles (${echo.styles.length}):`,
          "",
          ...echo.styles.map((s) => `- \`${s.name}\` (${s.title}): ${s.essence} Fingerprint ${fingerprintText(s.fingerprint)}.`),
          "",
          `These are Echo's. The builder's own styles are in their library (\`${STYLE_LIBRARY}\`, where Echo's Design Eye saves them) or in this conversation, and fit_styles ranks them with these.`,
        ].join("\n"),
      );
    },

    fit_styles: async ({
      profile,
      tolerance: toleranceSpec,
      yours: given = [],
    }: {
      profile: string;
      tolerance?: string;
      yours?: { name: string; fingerprint: string; essence?: string }[];
    }): Promise<CallToolResult> => {
      let target;
      let tolerance;
      try {
        target = parseProfile(profile);
        tolerance = parseTolerance(toleranceSpec);
      } catch (error) {
        return text(errorText(error), true);
      }
      const yours: FitCandidate[] = [];
      for (const s of given) {
        try {
          yours.push({ name: s.name, title: s.name, essence: s.essence ?? "", fingerprint: parseProfile(s.fingerprint), from: "yours", ready: true });
        } catch (error) {
          return text(`${s.name}'s fingerprint: ${errorText(error)}`, true);
        }
      }
      const echo = await echoStyles();
      const candidates: FitCandidate[] = [
        ...yours,
        // A name the builder gave their own style is the one they mean: Echo's of the same name steps aside, as in the CLI.
        ...echo.styles.filter((e) => !yours.some((y) => y.name === e.name)).map((e) => ({ ...e, from: "echo" as const, ready: true })),
      ];
      if (candidates.length === 0) {
        return text(`There are no styles to measure${echo.error ? ` (Echo's library: ${echo.error})` : ""}. Echo's Design Eye makes one from a moodboard.`, true);
      }
      const results = fitStyles(target, tolerance, candidates);
      return text(
        [
          `The product: ${fingerprintText(target)} (tolerance ${fingerprintText(tolerance)})`,
          ...(echo.error ? ["", `Echo's library couldn't be read (${echo.error}), so only the builder's own are ranked.`] : []),
          "",
          ...results.map((r, i) => {
            const past = (Object.keys(r.distance) as (keyof typeof r.distance)[])
              .filter((axis) => Math.abs(r.distance[axis]) > tolerance[axis])
              .map((axis) => `${AXIS_LETTERS[axis]}${r.distance[axis] > 0 ? "+" : ""}${r.distance[axis]}`);
            const verdict = r.locked.length
              ? `out: misses ${r.locked.join(", ")}, locked`
              : r.over === 0
                ? "inside every tolerance"
                : `${r.over} past tolerance: ${past.join(" ")}`;
            return `${i + 1}. \`${r.name}\` (${r.from === "echo" ? "Echo's" : "yours"}): ${fingerprintText(r.fingerprint)}, ${verdict}`;
          }),
          "",
          "It orders; it doesn't decide. Read the best of them before picking: list_styles with a name for Echo's, the foundation document for the builder's own. check_style says what the slop police makes of one of theirs.",
        ].join("\n"),
      );
    },

    check_style: async ({ style }: { style: Record<string, unknown> }): Promise<CallToolResult> => {
      const read = parseStyle(style);
      if (!read.style) return text(["This isn't a style Echo can apply:", "", ...read.problems.map((p) => `- ${p}`)].join("\n"));
      const s = read.style;
      const { report } = createEchoTheme(s.seed as EchoSeedInput, { quiet: true });
      const device = deviceOf(s.seed);
      const { police, notes } = policeNotes(s);
      const theme = themeNotes(report, s.fonts);
      return text(
        [
          police.banned.length
            ? `**${s.title}** is a style Echo could apply, on its ${device} device, but the slop police stops it until the builder keeps or changes what it names.`
            : `**${s.title}** is a style Echo can apply, on its ${device} device.`,
          ...(theme.length ? ["", ...theme.map(bullet)] : []),
          ...(notes.length ? ["", ...notes.map(bullet)] : []),
        ].join("\n"),
      );
    },

    wear_style: async ({ name, style, files = true }: { name?: string; style?: Record<string, unknown>; files?: boolean }): Promise<CallToolResult> => {
      if ((name === undefined) === (style === undefined)) {
        return text("Give one: `name` for one of Echo's styles, or `style` for the builder's own style.json.", true);
      }
      let chosen: EchoStyle;
      let from: "echo" | "yours";
      if (style) {
        const read = parseStyle(style);
        if (!read.style) return text(["This isn't a style Echo can apply, so it can't be worn:", "", ...read.problems.map((p) => `- ${p}`)].join("\n"));
        chosen = read.style;
        from = "yours";
      } else {
        const found = await echoStyle(name!);
        if ("content" in found) return found;
        chosen = found;
        from = "echo";
      }

      const police = policeStyle(chosen);
      if (police.banned.length) {
        return text(["Not worn.", "", ...stoppedNotes(chosen, police, "check_style").map(bullet)].join("\n"));
      }

      const applied = appliedStyle(chosen, from);
      const seed = chosen.seed as EchoSeedInput;
      const { css, report } = createEchoTheme(seed, { quiet: true });
      const device = deviceOf(chosen.seed);
      const run = (c: string) => `\`${runCommand(c)}\``;
      const theme = themeNotes(report, applied.fonts);

      return text(
        [
          `# ${chosen.title}, worn (${from === "echo" ? "Echo's library" : "the builder's own"}, a ${device} device)`,
          "",
          `**Feel it:** ${generatorLink(chosen.seed)} makes the whole Echo site wear this style's colours, every component pressing, sounding and moving in them. Only the colours travel in a link: the radius, density and finish show once a project wears the style.`,
          "",
          "## Into a project",
          "",
          "In the builder's code tool (Codex, Claude Code, or any terminal):",
          "",
          ...(from === "yours"
            ? [`1. Keep the style in their library, so every project can wear it again: \`${STYLE_LIBRARY}/${chosen.name}/style.json\`, with its foundation document beside it as \`${chosen.name}.md\` if there is one.`]
            : []),
          `${from === "yours" ? "2" : "1"}. A new project: ${run(`init --style ${chosen.name}`)}. A project that already has Echo: ${run(`style use ${chosen.name}`)}.`,
          "",
          "That writes the theme, `echo.json` and `DESIGN.md` into the project, where every agent working on it reads the style's rules.",
          ...(theme.length ? ["", ...theme.map(bullet)] : []),
          ...(files
            ? [
                "",
                "## Without a terminal",
                "",
                "Put this CSS on the page as `echo-theme.css`, style only with `var(--echo-*)`, and give the agent the DESIGN.md below.",
                "",
                "### echo-theme.css",
                "",
                "```css",
                css.trimEnd(),
                "```",
                "",
                "### DESIGN.md",
                "",
                "````markdown",
                designMd({ dir: "", seed, style: applied, standalone: true }).trimEnd(),
                "````",
              ]
            : []),
        ].join("\n"),
      );
    },
  };
}
