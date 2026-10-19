import { test } from "node:test";
import assert from "node:assert/strict";
import { access, mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";
import { createEchoTheme } from "echo-ui-core/theme";
import type { ComponentApi, RegistryCatalog } from "@registry/agent/catalog";

import { run } from "../index";
import { createProgram, registryRoot } from "../../../../registry/scripts/docs/program";

/**
 * The check and the type checker agree about names, for every component whose
 * type requires one. Each is written unnamed, and then named each way its type
 * allows; the compiler's verdict on each fixture has to be the check's.
 *
 * The check reads its rules from the catalog, which reads them from the same
 * types (registry/scripts/component-api.ts), so this is what keeps that
 * reading honest: RadioGroup's docs once didn't say its type requires a name.
 */
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
const publicDir = resolve(repoRoot, "apps/www/public");
const built = await access(join(publicDir, "r/catalog.json")).then(() => true, () => false);

interface Case {
  item: string;
  exported: string;
  api: ComponentApi;
}

/** A component's JSX with its required props filled in, and the attributes given. */
function jsx(c: Case, attrs: string[], children?: string): string {
  const required = (c.api.required ?? []).filter((r) => r !== "children").map((r) => `${r}={undefined as any}`);
  const kids = children ?? ((c.api.required ?? []).includes("children") ? "{null as any}" : undefined);
  const open = [c.exported, ...required, ...attrs].join(" ");
  return kids === undefined ? `<${open} />` : `<${open}>${kids}</${c.exported}>`;
}

/** Each fixture, and whether it gives the component a name its type accepts. */
function fixtures(c: Case): { label: string; body: string }[] {
  const rule = c.api.name!;
  const when = rule.when ? [rule.when] : [];
  const out = [{ label: "unnamed", body: jsx(c, when) }];
  for (const name of rule.anyOf) {
    out.push(
      name === "children"
        ? { label: "named by its text", body: jsx(c, when, "Bold") }
        : { label: `named by ${name}`, body: jsx(c, [...when, `${name}="x"`]) },
    );
  }
  // Where the name is only needed sometimes, leaving it out otherwise is fine.
  if (rule.when) out.push({ label: `without ${rule.when}`, body: jsx(c, [], "Save") });
  return out;
}

test("for every component that needs a name, the check and the type checker agree", { skip: !built }, async () => {
  const catalog = JSON.parse(await readFile(join(publicDir, "r/catalog.json"), "utf8")) as RegistryCatalog;
  const cases: Case[] = catalog.components.flatMap((c) =>
    Object.entries(c.api ?? {})
      .filter(([exported, api]) => api.name && !exported.includes("."))
      .map(([exported, api]) => ({ item: c.name.replace(/^echo-/, ""), exported, api })),
  );
  // The fourteen the launch names, and the compound parts that need a name too.
  for (const name of ["HardwareButton", "Checkbox", "Field", "OtpField", "Progress", "RadioGroup", "ScrollArea", "Segmented", "Slider", "Select", "Switch", "Textarea", "Toolbar", "Toggle"]) {
    assert.ok(cases.some((c) => c.exported === name), `${name} has no name rule in the catalog`);
  }

  // The type checker's verdict: one program over every fixture.
  const virtual = new Map<string, string>();
  const all = cases.flatMap((c) => fixtures(c).map((f, i) => ({ c, f, path: resolve(registryRoot, `src/__parity__/${c.exported}-${i}.tsx`) })));
  for (const { c, f, path } of all) {
    virtual.set(path, `import { ${c.exported} } from "../echo/${c.item}";\nexport const X = () => ${f.body};\n`);
  }
  const program = createProgram([], virtual);
  const typeErrors = new Map(all.map(({ path }) => [path, ts.getPreEmitDiagnostics(program, program.getSourceFile(path)).length > 0]));

  // The check's verdict, on the same JSX in an Echo project.
  const root = await mkdtemp(join(tmpdir(), "echo-parity-"));
  try {
    const items = [...new Set(cases.map((c) => c.item))];
    const version = (item: string) => catalog.components.find((x) => x.name === `echo-${item}`)!.version!;
    await writeFile(join(root, "package.json"), "{}");
    await writeFile(join(root, "tsconfig.json"), JSON.stringify({ compilerOptions: { paths: { "@/*": ["./*"] } } }));
    await writeFile(join(root, "echo.json"), JSON.stringify({ dir: "components/echo", registry: pathToFileURL(join(publicDir, "e")).href }));
    await writeFile(join(root, "echo-lock.json"), JSON.stringify({ lockVersion: 1, core: "", items: Object.fromEntries(items.map((i) => [i, { version: version(i), files: {} }])) }));
    await mkdir(join(root, "components/echo"), { recursive: true });
    await writeFile(join(root, "components/echo/echo-theme.css"), createEchoTheme().css);
    await mkdir(join(root, "app"), { recursive: true });
    for (const [i, { c, f }] of all.entries()) {
      await writeFile(join(root, `app/f${i}.tsx`), `import { ${c.exported} } from "@/components/echo/${c.item}";\nexport const X = () => ${f.body};\n`);
    }
    const lines: string[] = [];
    const saved = { log: console.log, error: console.error };
    console.log = (...p: unknown[]) => void lines.push(p.join(" "));
    console.error = (...p: unknown[]) => void lines.push(p.join(" "));
    try {
      await run(["check", "--json", "--cwd", root]);
    } finally {
      Object.assign(console, saved);
    }
    const text = lines.join("\n");
    const { findings } = JSON.parse(text.slice(text.indexOf("{"))) as { findings: { rule: string; file: string }[] };
    const flagged = new Set(findings.filter((f) => f.rule === "name").map((f) => f.file));

    const disagree = all
      .map(({ c, f, path }, i) => ({ what: `${c.exported} ${f.label}: ${f.body}`, tsc: typeErrors.get(path)!, check: flagged.has(`app/f${i}.tsx`) }))
      .filter((r) => r.tsc !== r.check)
      .map((r) => `${r.what} — tsc ${r.tsc ? "errors" : "passes"}, check ${r.check ? "flags it" : "passes"}`);
    assert.deepEqual(disagree, []);
    // And the fixtures do both: some fail, some pass.
    assert.ok([...typeErrors.values()].some(Boolean) && [...typeErrors.values()].some((v) => !v));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
