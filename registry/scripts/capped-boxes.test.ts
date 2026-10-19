/**
 * A component capped at its container is capped with its padding in.
 *
 * Many roots say `max-width: 100%` so a long label truncates or wraps instead
 * of pushing its container open. Under the default `box-sizing: content-box`
 * that cap is measured without the padding, so the component still reaches
 * past its container by its own padding: HardwareButton's link cap by 36px,
 * a Badge or a Tag by their inline padding. A <button> hides it, because
 * browsers size buttons border-box; an <a>, a <span> or a <div> doesn't.
 *
 * Checked on the rule itself: a rule that caps an element at 100% and gives
 * it padding also says `box-sizing: border-box`.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { registryRoot } from "./docs/program";

const SRC = join(registryRoot, "src/echo");

function stylesheets(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((d) =>
    d.isDirectory() ? stylesheets(join(dir, d.name)) : d.name.endsWith(".css") ? [join(dir, d.name)] : [],
  );
}

test("every rule that caps an element at its container and pads it sizes it border-box", () => {
  const sheets = stylesheets(SRC);
  assert.ok(sheets.length > 50, `expected the component stylesheets, found ${sheets.length}`);
  const loose: string[] = [];
  for (const file of sheets) {
    // Comments out, so a rule's body is only its declarations.
    const css = readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      const decls = new Map(
        m[2]!
          .split(";")
          .map((d) => d.split(":").map((x) => x.trim()))
          .filter((d): d is [string, string] => d.length === 2 && !!d[0]),
      );
      const capped = ["max-width", "max-inline-size"].some((p) => decls.get(p) === "100%");
      const padded = [...decls].some(([p, v]) => /^padding(-inline(-start|-end)?|-left|-right)?$/.test(p) && !/^0(px)?$/.test(v));
      if (capped && padded && decls.get("box-sizing") !== "border-box") {
        loose.push(`${relative(SRC, file)}: ${m[1]!.trim().split("\n").pop()}`);
      }
    }
  }
  assert.deepEqual(loose, [], "add `box-sizing: border-box` beside the cap, or the padding spills past the container");
});
