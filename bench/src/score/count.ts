/**
 * The benchmark's own count of the mistakes an agent makes with a design
 * system, over the lines the agent wrote:
 *
 * - colour literals, in any setup;
 * - with Echo: raw elements where Echo has the component, Echo's own classes
 *   written by hand, props an Echo component doesn't take, and controls left
 *   without the name their type requires.
 *
 * Written independently of Echo's `check`, so that re-scoring the same saved
 * apps with both is a test of each.
 */
import { readFile, readdir } from "node:fs/promises";
import { dirname, extname, join, posix, relative, resolve, sep } from "node:path";

import { cssColourLiterals } from "./colours";
import { isAdded, type AddedLines } from "./added-lines";
import { readTsx, type JsxElement } from "./jsx";

/** The mistakes the benchmark counts itself, independently of Echo's check. */
export const BENCH_RULES = ["colour", "lookalike", "echo-class", "prop", "name"] as const;
export type Rule = (typeof BENCH_RULES)[number];

export interface Finding {
  rule: Rule;
  file: string;
  line: number;
  message: string;
}

/** The slice of the catalog this reads: each item's title and documented props. */
export interface CatalogLike {
  components: { name: string; title: string; props: { name: string }[] }[];
}

export interface EchoProject {
  /** The Echo folder, relative to the app root, with forward slashes. */
  dir: string;
  catalog: CatalogLike;
}

/** A raw element and the Echo item that does its job. */
function lookalike(el: JsxElement): string | undefined {
  const attr = (name: string) => el.attributes.find((a) => a.name === name)?.value;
  if (attr("role") === "switch") return "switch";
  switch (el.tag) {
    case "button":
      return "hardware-button";
    case "select":
      return "select";
    case "dialog":
      return "modal";
    case "textarea":
      return "textarea";
    case "progress":
      return "progress";
    case "input": {
      const type = typeof attr("type") === "string" ? (attr("type") as string) : "text";
      if (type === "checkbox") return "checkbox";
      if (type === "radio") return "radio-group";
      if (type === "range") return "slider";
      if (type === "number") return "number-field";
      if (["text", "email", "password", "search", "tel", "url"].includes(type)) return "field";
      return undefined;
    }
    default:
      return undefined;
  }
}

/**
 * The names each control needs, one of them at least, as their types state
 * it. Kept here by hand so this count stays independent of Echo's metas.
 */
const NAMES: Record<string, { anyOf: string[]; when?: string }> = {
  HardwareButton: { anyOf: ["aria-label", "aria-labelledby"], when: "iconOnly" },
  Checkbox: { anyOf: ["aria-label", "aria-labelledby"] },
  Progress: { anyOf: ["aria-label", "aria-labelledby"] },
  RadioGroup: { anyOf: ["aria-label", "aria-labelledby"] },
  ScrollArea: { anyOf: ["aria-label", "aria-labelledby"] },
  Segmented: { anyOf: ["aria-label", "aria-labelledby"] },
  Slider: { anyOf: ["aria-label", "aria-labelledby"] },
  Select: { anyOf: ["aria-label", "aria-labelledby"] },
  Switch: { anyOf: ["aria-label", "aria-labelledby"] },
  Toolbar: { anyOf: ["aria-label", "aria-labelledby"] },
  ButtonGroup: { anyOf: ["aria-label", "aria-labelledby"] },
  ToggleGroup: { anyOf: ["aria-label", "aria-labelledby"] },
  Field: { anyOf: ["label", "aria-label", "aria-labelledby"] },
  OtpField: { anyOf: ["label", "aria-label", "aria-labelledby"] },
  Textarea: { anyOf: ["label", "aria-label", "aria-labelledby"] },
  Toggle: { anyOf: ["children", "aria-label"] },
};

/** Props any component takes without documenting them. */
const UNIVERSAL = new Set(["key", "ref", "children", "className", "style", "id", "title", "tabIndex", "role", "hidden", "lang", "dir"]);
const isPassthrough = (name: string) => UNIVERSAL.has(name) || /^(aria|data)-/.test(name) || /^on[A-Z]/.test(name);

/** Which Echo item an import specifier lands in, if any. */
function echoItemOf(specifier: string, fromFile: string, root: string, echoDir: string): string | undefined {
  let target: string;
  if (specifier.startsWith(".")) target = resolve(dirname(join(root, fromFile)), specifier);
  else if (specifier.startsWith("@/")) target = join(root, specifier.slice(2));
  else if (specifier.startsWith("~/")) target = join(root, specifier.slice(2));
  else return undefined;
  const rel = relative(root, target).split(sep).join(posix.sep);
  if (!rel.startsWith(`${echoDir}/`)) return undefined;
  return rel.slice(echoDir.length + 1).split("/")[0];
}

const compact = (s: string) => s.replace(/[^a-z0-9]/gi, "").toLowerCase();

function echoFindings(file: string, source: string, root: string, echo: EchoProject, keep: (line: number) => boolean): Finding[] {
  const out: Finding[] = [];
  const { imports, elements } = readTsx(file, source);
  const byName = new Map(echo.catalog.components.map((c) => [c.name.replace(/^echo-/, ""), c]));

  for (const el of elements) {
    if (!keep(el.line)) continue;
    if (el.intrinsic) {
      const item = lookalike(el);
      if (item) out.push({ rule: "lookalike", file, line: el.line, message: `<${el.tag}> where Echo has ${item}` });
      const cls = el.attributes.find((a) => a.name === "className")?.value;
      if (typeof cls === "string" && /(^|\s)echo-[\w-]+/.test(cls)) {
        out.push({ rule: "echo-class", file, line: el.line, message: `<${el.tag} className="${cls}"> borrows an Echo class` });
      }
      continue;
    }

    const root_ = el.tag.split(".")[0]!;
    const imported = imports.get(root_);
    if (!imported) continue;
    const item = echoItemOf(imported.from, file, root, echo.dir);
    if (!item) continue;
    const component = el.tag.includes(".") ? undefined : imported.imported;

    const rule = component ? NAMES[component] : undefined;
    if (rule && !el.spread) {
      const applies = !rule.when || el.attributes.some((a) => a.name === rule.when && a.value !== undefined);
      const named = rule.anyOf.some((n) => (n === "children" ? el.hasChildren : el.attributes.some((a) => a.name === n)));
      if (applies && !named) {
        out.push({ rule: "name", file, line: el.line, message: `<${el.tag}> has none of ${rule.anyOf.join(", ")}` });
      }
    }

    const entry = byName.get(item);
    // Props are checked on the item's own component only: its documented
    // props describe it, not its parts or siblings.
    if (!entry || !component || compact(entry.title) !== compact(component) || entry.props.length === 0) continue;
    const documented = new Set(entry.props.map((p) => p.name));
    for (const attr of el.attributes) {
      if (documented.has(attr.name) || isPassthrough(attr.name)) continue;
      out.push({ rule: "prop", file, line: attr.line, message: `${component} has no \`${attr.name}\` prop` });
    }
  }
  return out;
}

const SKIP_DIRS = new Set(["node_modules", ".next", ".git", "out", "dist", "public"]);

async function sourceFiles(root: string, dir = ""): Promise<string[]> {
  const files: string[] = [];
  for (const entry of await readdir(join(root, dir), { withFileTypes: true })) {
    if (entry.name.startsWith(".") && entry.name !== ".") continue;
    const rel = dir ? `${dir}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) files.push(...(await sourceFiles(root, rel)));
    } else if (/\.(tsx|jsx|ts|js|mjs|css|scss)$/.test(entry.name)) {
      files.push(rel);
    }
  }
  return files;
}

/**
 * Every finding in the lines the agent wrote. `echo` is set for an Echo app,
 * and its folder is left out: Echo's own files are Echo's, not the agent's.
 */
export async function countMistakes(root: string, added: AddedLines, echo?: EchoProject): Promise<Finding[]> {
  const findings: Finding[] = [];
  for (const file of await sourceFiles(root)) {
    if (echo && (file === echo.dir || file.startsWith(`${echo.dir}/`))) continue;
    if (!added.has(file)) continue;
    const keep = (line: number) => isAdded(added, file, line);
    const source = await readFile(join(root, file), "utf8");
    const ext = extname(file);
    if (ext === ".css" || ext === ".scss") {
      for (const c of cssColourLiterals(source)) {
        if (keep(c.line)) findings.push({ rule: "colour", file, line: c.line, message: c.text });
      }
      continue;
    }
    if (ext === ".tsx" || ext === ".jsx") {
      for (const c of readTsx(file, source).colours) {
        if (keep(c.line)) findings.push({ rule: "colour", file, line: c.line, message: c.text });
      }
      if (echo) findings.push(...echoFindings(file, source, root, echo, keep));
    }
  }
  return findings.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);
}

/** Counts per rule, every rule present (zero when nothing was found). */
export function tally(findings: readonly Finding[]): Record<Rule, number> {
  const counts: Record<Rule, number> = { colour: 0, lookalike: 0, "echo-class": 0, prop: 0, name: 0 };
  for (const f of findings) counts[f.rule]++;
  return counts;
}
