/**
 * A TypeScript program over the registry source, plus optional virtual files.
 *
 * Shared by the docs freshness tests: snippet compilation
 * (A) adds generated .tsx files that import the real components, and prop
 * parity (B) walks the real props types. Both go through the compiler rather
 * than a regex, because "does this still type-check against the component"
 * is the question — and only the checker can answer it.
 */
import ts from "typescript";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const registryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
export const echoRoot = resolve(registryRoot, "src/echo");
export const coreRoot = resolve(registryRoot, "../packages/core/src");

/**
 * Item folders (META_DIRS values) whose code ships in echo-ui-core, and the
 * folder each lives in there. Their meta.ts stays in src/echo/<dir>.
 */
export const CORE_DIRS: Readonly<Record<string, string>> = {
  theme: "theme",
  sound: "sound",
  motion: "motion",
  tactile: "tactile",
  "gsap-presence": "presence",
};

/** Where an item's code lives: src/echo/<dir>, or its folder in echo-ui-core. */
export function itemDir(dir: string): string {
  const core = CORE_DIRS[dir];
  return core ? resolve(coreRoot, core) : resolve(echoRoot, dir);
}

/** How a snippet imports an item: echo-ui-core's entry, or the copied folder. */
export function itemImportPath(dir: string): string {
  const core = CORE_DIRS[dir];
  return core ? `echo-ui-core/${core}` : `../echo/${dir}`;
}

function compilerOptions(): ts.CompilerOptions {
  const configPath = resolve(registryRoot, "tsconfig.json");
  const { config } = ts.readConfigFile(configPath, ts.sys.readFile);
  return ts.parseJsonConfigFileContent(config, ts.sys, registryRoot).options;
}

/**
 * Build a program whose roots are `roots` (real files) plus every key of
 * `virtual` (absolute path → source text, never written to disk).
 */
export function createProgram(roots: readonly string[], virtual: ReadonlyMap<string, string> = new Map()) {
  const options = compilerOptions();
  const host = ts.createCompilerHost(options, true);
  const { getSourceFile, fileExists, readFile } = host;

  host.fileExists = (f) => virtual.has(f) || fileExists.call(host, f);
  host.readFile = (f) => virtual.get(f) ?? readFile.call(host, f);
  host.getSourceFile = (f, lang, onError, create) => {
    const text = virtual.get(f);
    return text === undefined
      ? getSourceFile.call(host, f, lang, onError, create)
      : ts.createSourceFile(f, text, lang, true, ts.ScriptKind.TSX);
  };

  return ts.createProgram([...roots, ...virtual.keys()], options, host);
}

/** The value and type exports of one item's index.ts, by name. */
export function indexExports(program: ts.Program, dir: string): Map<string, ts.Symbol> {
  const checker = program.getTypeChecker();
  const file = program.getSourceFile(resolve(itemDir(dir), "index.ts"));
  const out = new Map<string, ts.Symbol>();
  if (!file) return out;
  const moduleSymbol = checker.getSymbolAtLocation(file);
  if (!moduleSymbol) return out;
  for (const sym of checker.getExportsOfModule(moduleSymbol)) out.set(sym.getName(), sym);
  return out;
}

export function formatDiagnostic(d: ts.Diagnostic): string {
  return ts.flattenDiagnosticMessageText(d.messageText, "\n");
}
