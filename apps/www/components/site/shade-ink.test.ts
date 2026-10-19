/**
 * Every shade on the site is drawn in the device's own ink.
 *
 * A shade drawn in plain black reads right on dark plastic and as soot on
 * light: the theme engine draws cast shadows in `--echo-cast-ink` scaled by
 * `--echo-shade` (black at full strength on a dark device, a deep tone of the
 * body's own hue at half on a light one), and darkens a recess toward
 * `--echo-shade-ink` (black on dark, the body's seam on light). This holds the
 * site's own styles to the same rule, so a light device never gets a grey
 * slab of a prompt box, or a grey foot of the page, again.
 *
 * `black` may still appear as the fallback of those tokens.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOTS = ["components", "app"];

function files(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...files(p));
    else if (/\.(css|tsx)$/.test(name)) out.push(p);
  }
  return out;
}

/** What a hard-coded black shade looks like: a black colour, or a mix toward or of black. */
const BLACK = [
  /rgba?\(\s*0[\s,]+0[\s,]+0\b/,
  /color-mix\([^;]*?,\s*black(\s+[\d.]+%)?\s*\)/,
  /color-mix\(\s*in\s+\w+\s*,\s*black\s+[\d.]+%/,
];

test("no shade on the site is drawn in hard-coded black, so a light device never gets soot", () => {
  const found: string[] = [];
  for (const root of ROOTS) {
    for (const file of files(root)) {
      const rel = relative(".", file);
      if (rel.endsWith(".test.ts")) continue;
      readFileSync(file, "utf8")
        .split("\n")
        .forEach((line, i) => {
          // The tokens' own fallbacks are fine: `var(--echo-cast-ink, black)`.
          const bare = line.replace(/var\(--echo-(?:cast|shade)-ink,\s*black\)/g, "");
          if (/^\s*(\*|\/\/|\/\*)/.test(line)) return;
          if (BLACK.some((re) => re.test(bare))) found.push(`${rel}:${i + 1}  ${line.trim().slice(0, 110)}`);
        });
    }
  }
  assert.deepEqual(found, [], `shades in plain black:\n${found.join("\n")}`);
});
