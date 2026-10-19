import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { isAdded, parseAddedLines } from "./added-lines";
import { colourLiterals, cssColourLiterals } from "./colours";
import { countMistakes, tally } from "./count";
import { readTsx } from "./jsx";

test("added lines are read from a diff with context, counting only the + lines", () => {
  const diff = [
    "diff --git a/app/page.tsx b/app/page.tsx",
    "--- a/app/page.tsx",
    "+++ b/app/page.tsx",
    "@@ -1,4 +1,5 @@",
    " export default function Home() {",
    "-  return <main>old</main>;",
    "+  return (",
    "+    <main>new</main>",
    "+  );",
    " }",
    "diff --git a/app/new.css b/app/new.css",
    "new file mode 100644",
    "--- /dev/null",
    "+++ b/app/new.css",
    "@@ -0,0 +1,2 @@",
    "+a { color: red; }",
    "+b { color: blue; }",
  ].join("\n");
  const added = parseAddedLines(diff);
  assert.deepEqual([...added.get("app/page.tsx")!], [2, 3, 4]);
  assert.deepEqual([...added.get("app/new.css")!], [1, 2]);
  assert.equal(isAdded(added, "app/page.tsx", 1), false);
  assert.equal(isAdded(added, "app/other.tsx", 1), false);
});

test("colour literals: hex, functions and named colours, never a var or a selector", () => {
  assert.deepEqual(colourLiterals("#8B6FE8"), ["#8B6FE8"]);
  assert.deepEqual(colourLiterals("1px solid rgb(0 0 0 / 0.2)"), ["rgb(0 0 0 / 0.2)"]);
  assert.deepEqual(colourLiterals("oklch(0.7 0.1 300)"), ["oklch(0.7 0.1 300)"]);
  assert.deepEqual(colourLiterals("white"), ["white"]);
  assert.deepEqual(colourLiterals("var(--echo-accent)"), []);
  assert.deepEqual(colourLiterals("var(--red)"), []);
  assert.deepEqual(colourLiterals("color-mix(in oklch, var(--echo-accent), transparent 40%)"), []);
  assert.deepEqual(colourLiterals("color-mix(in oklch, var(--echo-accent), #fff)"), ["#fff"]);
  assert.deepEqual(colourLiterals("1px solid currentColor"), []);
  // An anchor or an id isn't a colour.
  assert.deepEqual(colourLiterals("#settings"), []);
});

test("CSS colours are found in declarations, with their lines, and not in selectors or comments", () => {
  const css = ["#main {", "  /* was #ff0000 */", "  color: #fff;", "  background: var(--echo-well);", "}", ".a:hover { border-color: red }"].join("\n");
  assert.deepEqual(cssColourLiterals(css), [
    { line: 3, text: "#fff" },
    { line: 6, text: "red" },
  ]);
});

test("the JSX reader sees imports, elements, attributes, spreads and style colours", () => {
  const source = [
    'import { HardwareButton as Btn } from "@/components/echo/hardware-button";',
    'import * as Echo from "../components/echo/field";',
    "export function Page(props: object) {",
    "  return (",
    '    <main style={{ background: "#101010" }}>',
    '      <Btn variant="primary" onClick={() => {}}>Save</Btn>',
    '      <input type="checkbox" />',
    "      <Echo.Field {...props} />",
    "    </main>",
    "  );",
    "}",
    'const card = { color: "tomato", padding: 4 };',
  ].join("\n");
  const read = readTsx("page.tsx", source);
  assert.deepEqual(read.imports.get("Btn"), { from: "@/components/echo/hardware-button", imported: "HardwareButton" });
  assert.deepEqual(read.imports.get("Echo"), { from: "../components/echo/field", imported: "*" });
  assert.deepEqual(read.elements.map((e) => e.tag), ["main", "Btn", "input", "Echo.Field"]);
  const btn = read.elements[1]!;
  assert.deepEqual(btn.attributes.map((a) => [a.name, a.value]), [["variant", "primary"], ["onClick", undefined]]);
  assert.equal(btn.hasChildren, true);
  assert.equal(read.elements[3]!.spread, true);
  assert.deepEqual(read.colours, [
    { line: 5, text: "#101010" },
    { line: 12, text: "tomato" },
  ]);
});

test("the count covers only the agent's lines, skips Echo's folder, and names each mistake", async () => {
  const root = await mkdtemp(join(tmpdir(), "bench-count-"));
  try {
    await mkdir(join(root, "app/settings"), { recursive: true });
    await mkdir(join(root, "components/echo/hardware-button"), { recursive: true });
    const page = [
      '"use client";',
      'import { HardwareButton } from "@/components/echo/hardware-button";',
      'import { Switch } from "@/components/echo/switch";',
      "export default function Settings() {",
      "  return (",
      "    <form>",
      '      <HardwareButton color="red" variant="primary">Save</HardwareButton>',
      "      <HardwareButton iconOnly icon={null} />",
      "      <Switch />",
      '      <button className="echo-hw__cap">Raw</button>',
      '      <input type="range" />',
      "    </form>",
      "  );",
      "}",
    ].join("\n");
    await writeFile(join(root, "app/settings/page.tsx"), page);
    await writeFile(join(root, "app/globals.css"), "body { color: #000; }\n.x { color: var(--echo-text); }\n");
    // Echo's own file: raw elements and literals on purpose, never counted.
    await writeFile(join(root, "components/echo/hardware-button/hardware-button.tsx"), "export const x = <button style={{ color: '#fff' }} />;\n");

    const added = new Map([
      ["app/settings/page.tsx", new Set(Array.from({ length: 14 }, (_, i) => i + 1))],
      // Only line 2 is the agent's: line 1 was the setup's.
      ["app/globals.css", new Set([2])],
      ["components/echo/hardware-button/hardware-button.tsx", new Set([1])],
    ]);
    const catalog = {
      components: [
        { name: "echo-hardware-button", title: "HardwareButton", props: [{ name: "variant" }, { name: "iconOnly" }, { name: "icon" }, { name: "aria-label" }] },
        { name: "echo-switch", title: "Switch", props: [{ name: "checked" }, { name: "aria-label" }] },
      ],
    };
    const findings = await countMistakes(root, added, { dir: "components/echo", catalog });
    assert.deepEqual(
      findings.map((f) => `${f.rule} ${f.line} ${f.message}`),
      [
        "prop 7 HardwareButton has no `color` prop",
        "name 8 <HardwareButton> has none of aria-label, aria-labelledby",
        "name 9 <Switch> has none of aria-label, aria-labelledby",
        "lookalike 10 <button> where Echo has hardware-button",
        'echo-class 10 <button className="echo-hw__cap"> borrows an Echo class',
        "lookalike 11 <input> where Echo has slider",
      ],
    );
    assert.deepEqual(tally(findings), { colour: 0, lookalike: 2, "echo-class": 1, prop: 1, name: 2 });

    // Without Echo, only the colours count — and line 1 of globals.css is the setup's.
    const plain = await countMistakes(root, new Map([["app/globals.css", new Set([1, 2])]]));
    assert.deepEqual(plain.map((f) => f.message), ["#000"]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
