import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PUBLISHED_STYLES } from "@registry/agent/published-styles";

const source = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "style-fonts.ts"), "utf8");
const declared = new Set([...source.matchAll(/value: '"([^"]+)"'/g)].map((m) => m[1]!));

/** The family a font stack asks for first: `"Inter Tight", "Helvetica Neue", …` → Inter Tight. */
const first = (stack: string) => /^\s*"([^"]+)"/.exec(stack)?.[1] ?? stack.split(",")[0]!.trim();

test("every family a published style's seed names is declared on the site", () => {
  for (const style of PUBLISHED_STYLES) {
    const seed = style.seed as Record<string, unknown>;
    for (const role of ["fontSans", "fontMachine", "fontMono", "fontLcd"]) {
      const stack = seed[role];
      if (typeof stack !== "string") continue;
      assert.ok(declared.has(first(stack)), `${style.name}'s ${role} asks for ${first(stack)}, which style-fonts.ts doesn't declare`);
    }
  }
});
