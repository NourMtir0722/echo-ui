/**
 * Every file a user copies from the registry type-checks in an ordinary React
 * app, not just in this repo.
 *
 * The repo's own typecheck is too kind: it loads Node's types and a global
 * `*.css` module declaration, so code that only compiles *here* passes. This
 * program is set up like a standard Vite + React app (strict, DOM, bundler
 * resolution, no Node types, and only the stylesheet declaration Vite's own
 * types give it, in `app-env.d.ts`) and checks exactly the files registry.json
 * ships.
 *
 * HardwareButton and StatusDot used `process.env.NODE_ENV` with no
 * declaration, so a Vite app's `tsc && vite build` failed on them.
 *
 * It runs once per SUPPORTED REACT MAJOR.
 * `apps/www` and this package now develop on React 19, so the repo's own
 * typecheck only ever sees 19's types — while Echo promises 18 as well, and `release-matrix.yml` confirms it weekly. Weekly is real
 * coverage arriving a week late, on nobody's pull request.
 *
 * The gap that makes this worth the second compile is the interop set's: on React 19 `ref`
 * is an ordinary prop, so a control can declare it and a rest-spread carries
 * it. On React 18 a function component never receives `ref` — React strips it
 * and warns — so the same code type-checks under 19 and is silently inert for
 * every React 18 user. A types-only difference is exactly what this catches.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { relative, resolve } from "node:path";
import ts from "typescript";

import { registryRoot } from "../docs/program";

const OPTIONS: ts.CompilerOptions = {
  target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  jsx: ts.JsxEmit.ReactJSX,
  lib: ["lib.es2022.d.ts", "lib.dom.d.ts", "lib.dom.iterable.d.ts"],
  // No automatic @types: an app has React's types (imported), not Node's.
  types: [],
  strict: true,
  skipLibCheck: true,
  noEmit: true,
};

/**
 * The React majors Echo supports, and where each one's types live.
 *
 * 19 is whatever the workspace installs. 18 is an aliased devDependency
 * (`@types/react-18`), because the two cannot occupy `@types/react` at once.
 * `paths` is what redirects `react` and `react/jsx-runtime` at the one being
 * checked — resolution, not installation, which is why one `pnpm install`
 * covers both.
 */
const typesDir = (pkg: string) => resolve(registryRoot, "node_modules/@types", pkg);

const REACT_MAJORS: { major: string; types: string }[] = [
  { major: "19", types: typesDir("react") },
  { major: "18", types: typesDir("react-18") },
];

function optionsFor(types: string): ts.CompilerOptions {
  return {
    ...OPTIONS,
    // Absolute targets, so no baseUrl: TypeScript 6 deprecates it.
    paths: {
      react: [types],
      "react/*": [`${types}/*`],
    },
  };
}

const shippedFiles = (): string[] =>
  (JSON.parse(readFileSync(resolve(registryRoot, "registry.json"), "utf8")) as {
    items: { files: { path: string }[] }[];
  }).items
    .flatMap((i) => i.files.map((f) => resolve(registryRoot, f.path)))
    .filter((f) => /\.tsx?$/.test(f));

/** The app's own declarations, which the copied files lean on (`app-env.d.ts`). */
const APP_ENV = resolve(registryRoot, "scripts/consumer/app-env.d.ts");

/** The React types a program actually loaded, as real paths (pnpm links resolved). */
const reactTypesLoaded = (program: ts.Program): string[] =>
  program
    .getSourceFiles()
    .map((f) => f.fileName)
    .filter((f) => /\/@types\/react\//.test(f));

/** Diagnostics for the shipped files only, under one set of React types. */
function compileShipped(options: ts.CompilerOptions, reactTypes?: string): string[] {
  const files = shippedFiles();
  const shipped = new Set(files);
  const program = ts.createProgram([...files, APP_ENV], options);
  if (reactTypes) {
    // `paths` is all that points `react` at this major. If it stopped applying,
    // React would resolve to the workspace's 19 and this run would pass on the
    // wrong types.
    const want = `${realpathSync(reactTypes)}/`;
    const loaded = reactTypesLoaded(program);
    assert.ok(loaded.length > 0, "no React types loaded at all");
    assert.deepEqual(
      loaded.filter((f) => !f.startsWith(want)),
      [],
      `React types loaded from somewhere other than ${relative(registryRoot, reactTypes)}`,
    );
  }
  // Only the copied files count. echo-ui-core reaches users compiled, with
  // its own .d.ts; here it resolves to source, which isn't what they get.
  return ts
    .getPreEmitDiagnostics(program)
    .filter((d) => d.file && shipped.has(resolve(d.file.fileName)))
    .map((d) => {
      const { line } = d.file!.getLineAndCharacterOfPosition(d.start ?? 0);
      return `${relative(registryRoot, d.file!.fileName)}:${line + 1}  ${ts.flattenDiagnosticMessageText(d.messageText, "\n")}`;
    });
}

test("every copied component type-checks in an app without Node's types", () => {
  const problems = compileShipped(OPTIONS);
  assert.deepEqual(problems, [], `copied files that don't compile in a plain React app:\n  ${problems.join("\n  ")}`);
});

/**
 * Both supported majors, so React 18 stops being something only the weekly
 * matrix knows about. If this is ever the test standing between you and a
 * change, the question it is asking is whether Echo still supports React 18 —
 * which is a support decision, not a test's to delete.
 */
test("the types each supported React major is checked against are actually there", () => {
  for (const { major, types } of REACT_MAJORS) {
    assert.ok(
      existsSync(resolve(types, "index.d.ts")),
      `React ${major} types missing at ${relative(registryRoot, types)} — this check would pass vacuously`,
    );
  }
});

for (const { major, types } of REACT_MAJORS) {
  test(`every copied component type-checks under React ${major}`, () => {
    const problems = compileShipped(optionsFor(types), types);
    assert.deepEqual(
      problems,
      [],
      `copied files that don't compile against React ${major}'s types:\n  ${problems.join("\n  ")}`,
    );
  });
}
