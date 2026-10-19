/**
 * How a component is described to an agent. One renderer, so
 * llms-full.txt and the MCP server's get_component answer with the same text —
 * an agent that read the static artifact and one that called the tool should
 * not get two different pictures of the same component.
 */
import type { CatalogComponent, CatalogProp } from "./catalog";
import { IMPORT_PLACEHOLDER, installName, runCommand } from "./guidance";
import { weightLine } from "./facts";
import { INTEROP_NAMES } from "./interop-names";

export function renderPropsTable(props: CatalogProp[]): string[] {
  if (!props.length) return [];
  return [
    "| Prop | Type | Default | Notes |",
    "| --- | --- | --- | --- |",
    ...props.map((p) => {
      const def = p.required ? "**required**" : (p.defaultValue ?? "—");
      return `| \`${p.name}\` | \`${p.type}\` | ${def} | ${p.description ?? ""} |`;
    }),
  ];
}

/**
 * Sections follow the component page's order, so a person
 * reading the page and an agent reading this meet the same things in the same
 * place. A section whose field is unset is left out, never printed empty — a
 * catalog built before the docs fields existed renders as it always did.
 */
/**
 * The full record. Its usage imports from the placeholder `@/echo`, so it says
 * what that stands for: it's read where there's no project to put the real
 * path in its place, an MCP answer or a paste into a chat. A
 * document of many records says it once instead (`importNote: false`).
 */
export function renderComponent(c: CatalogComponent, headingLevel = 2, { importNote = true } = {}): string {
  const h = "#".repeat(headingLevel);
  const parts = [`${h} ${c.title} (\`${c.name}\`)`, "", c.description, ""];
  if (c.feel) parts.push(`*Feel:* ${c.feel}`, "");
  parts.push(`- Type: ${c.type}`);
  if (c.group) parts.push(`- Group: ${c.group}`);

  if (c.dependencies.length) parts.push(`- npm deps: ${c.dependencies.join(", ")}`);
  if (c.registryDependencies.length) parts.push(`- registry deps: ${c.registryDependencies.join(", ")}`);
  parts.push(`- Install: \`${c.install}\``);
  if (c.weight) parts.push(`- Weight: ${weightLine(c.weight)}`);
  parts.push("");

  if (c.usage) {
    parts.push(`${h}# Usage`, "", "```tsx", c.usage.imports.trim(), "", c.usage.code.trim(), "```", "");
    if (importNote && c.usage.imports.includes("@/echo/")) parts.push(IMPORT_PLACEHOLDER, "");
  }

  if (c.composition?.trim()) {
    parts.push(`${h}# Composition`, "", "```text", c.composition.trimEnd(), "```", "");
  }

  if (c.examples.length) {
    parts.push(`${h}# Examples`);
    for (const ex of c.examples) {
      parts.push("", `**${ex.title}** — ${ex.description}`, "", "```tsx", ex.code, "```");
    }
    parts.push("");
  }

  if (c.a11y?.length) {
    parts.push(`${h}# Accessibility`, "", ...c.a11y.map((line) => `- ${line}`), "");
  }

  const motionSound = [
    ...(c.motion?.tokens.length ? [`- Motion tokens: ${c.motion.tokens.map((t) => `\`${t}\``).join(", ")}`] : []),
    ...(c.motion ? [`- Reduced motion: ${c.motion.reducedMotion}`] : []),
    ...(c.sound ?? []).map((line) => `- Sound: ${line}`),
  ];
  if (motionSound.length) parts.push(`${h}# Motion & sound`, "", ...motionSound, "");

  if (c.props.length) {
    parts.push(`${h}# Props`, "", ...renderPropsTable(c.props), "");
  }

  if (c.antiPatterns.length) {
    parts.push(`${h}# Anti-patterns`);
    for (const ap of c.antiPatterns) parts.push(`- ${ap}`);
    parts.push("");
  }

  return parts.join("\n");
}

/** What a project changes about a brief: where it imports Echo from, and what it installed. */
export interface BriefContext {
  /**
   * The project's import path for its Echo folder (`@/components/echo`), put
   * in place of the docs' placeholder `@/echo`. Left as the placeholder when
   * the project's alias can't be worked out.
   */
  importFrom?: string;
  /** The version this project installed, from `echo-lock.json`. */
  installed?: string;
}

/** A prop as one line: `variant: "primary" | "neutral" = "neutral" — what it does`. */
function propLine(p: CatalogProp): string {
  const type = p.type.length > 90 ? `${p.type.slice(0, 87)}…` : p.type;
  const value = p.required ? " (required)" : p.defaultValue !== undefined ? ` = ${p.defaultValue}` : "";
  return `- ${p.name}: ${type}${value}${p.description ? ` — ${p.description}` : ""}`;
}

/**
 * One item, as short as it can be and still be used right: what it is, how to
 * install and import it, the smallest working use, its props, what it needs
 * for accessibility, and what not to do. This is what the CLI's `docs` prints,
 * so an agent reads it before every use. The MCP server's `get_component`
 * gives the same record in full.
 */
export function renderBrief(c: CatalogComponent, context: BriefContext = {}): string {
  const name = installName(c.name);
  const lines = [`## ${c.title} (${name})${c.version ? ` ${c.version}` : ""}`, "", c.summary ?? c.description, "", `Install: ${c.install}`];
  if (c.weight) lines.push(`Weight: ${weightLine(c.weight)}`);
  if (context.installed && c.version && context.installed !== c.version) {
    lines.push(`Installed here: ${context.installed}. This describes ${c.version}: \`${runCommand(`diff ${name}`)}\` shows what changed.`);
  }

  const withPath = (text: string) => (context.importFrom ? text.replace(/(["'])@\/echo\//g, `$1${context.importFrom}/`) : text);
  if (c.usage) {
    lines.push("", "```tsx", withPath(c.usage.imports.trim()), "", c.usage.code.trim(), "```");
  } else if (c.examples[0]) {
    lines.push("", "```tsx", withPath(c.examples[0].code.trim()), "```");
  }
  // A screen or a compound part tree: which parts it's made of, which is
  // how a reference screen teaches composition.
  if (c.composition?.includes("\n")) lines.push("", "Parts:", "```text", c.composition.trimEnd(), "```");

  const own = c.props.filter((p) => !INTEROP_NAMES.has(p.name));
  const interop = c.props.filter((p) => INTEROP_NAMES.has(p.name)).map((p) => p.name);
  if (own.length) lines.push("", "Props:", ...own.map(propLine));
  if (interop.length) lines.push(`- also the usual: ${interop.join(", ")}`);

  if (c.a11y?.length) lines.push("", "Accessibility:", ...c.a11y.map((line) => `- ${line}`));
  if (c.antiPatterns.length) lines.push("", "Don't:", ...c.antiPatterns.map((line) => `- ${line}`));
  return lines.join("\n");
}
