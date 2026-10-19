import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import type { CheckProject } from "@registry/agent/check/model";
import type { FileResult } from "@registry/agent/check/rules";
import { slopCss, slopRules } from "@registry/agent/check/slop";
import { readCss } from "@registry/agent/check/css";
import { readTsx } from "@registry/agent/check/tsx";

/**
 * The homepage sells the slop police (Echo's check stops what reads as made
 * by AI), so it passes them: run on its own code and styles, the rules find
 * nothing. Once it found "Get started", an arrow stapled to a link, an
 * `A · B · C` string, a coloured stripe down one edge, gradient text and
 * hand-made spaced capitals.
 *
 * Left out: the draft's switch panel (draft.*), which is development only and
 * never in a build; and two small labels of the Puzzle's, which keep their
 * design as it is for now.
 */
const PUZZLE_LABELS = [".pz__call", ".pz__panel-kicker"];

const project = { keeps: new Set<string>() } as unknown as CheckProject;

function files(dir: URL): URL[] {
  return readdirSync(dir).flatMap((name) => {
    const url = new URL(name, dir);
    return statSync(url).isDirectory() ? files(new URL(`${name}/`, dir)) : [url];
  });
}

/**
 * The selector of the rule a CSS line belongs to, whole. A rule's own line (the
 * first of its selectors, which may run on over several lines) opens at the
 * next `{`; a declaration's is the nearest rule opened above it. Looking only
 * upward credited a rule whose selectors span lines to the rule above.
 */
function selectorAt(lines: string[], line: number) {
  let open = -1;
  for (let i = line - 1; i < lines.length; i++) {
    if (lines[i]!.includes("{")) {
      open = i;
      break;
    }
    if (/[;}]/.test(lines[i]!)) break;
  }
  if (open < 0) {
    for (let i = line - 1; i >= 0; i--) {
      if (lines[i]!.includes("{")) {
        open = i;
        break;
      }
    }
  }
  if (open < 0) return "";
  let start = open;
  while (start > 0 && lines[start - 1]!.trim().endsWith(",")) start--;
  return lines
    .slice(start, open + 1)
    .map((l) => l.trim())
    .join(" ");
}

test("a finding on a rule whose selectors span lines is that rule's, not the one above it", () => {
  const css = [".above {", "  color: red;", "}", ".first,", ".second {", "  letter-spacing: 0.2em;", "}"];
  // A rule's finding is reported at the rule's first line: here line 4, `.first,`.
  assert.equal(selectorAt(css, 4), ".first, .second {");
  // And a declaration's line still belongs to its own rule.
  assert.equal(selectorAt(css, 6), ".first, .second {");
  assert.equal(selectorAt(css, 2), ".above {");
});

test("the homepage passes Echo's own slop police", () => {
  const here = new URL("./", import.meta.url);
  const found: string[] = [];
  for (const url of files(here)) {
    const rel = url.pathname.slice(here.pathname.length);
    if (/\.test\.ts$/.test(rel) || /(^|\/)draft\.(tsx|css)$/.test(rel)) continue;
    const source = readFileSync(url, "utf8");
    if (rel.endsWith(".tsx")) {
      const result: FileResult = { findings: [], notes: [] };
      slopRules(rel, readTsx(rel, source), project, result);
      for (const f of result.findings) found.push(`${rel}:${f.line} ${f.message.split(":")[0]}`);
    } else if (rel.endsWith(".css")) {
      const lines = source.split("\n");
      for (const f of slopCss(rel, readCss(source, rel), project)) {
        const selector = selectorAt(lines, f.line);
        if (PUZZLE_LABELS.some((p) => selector.startsWith(p))) continue;
        found.push(`${rel}:${f.line} ${selector} ${f.message.split(":")[0]}`);
      }
    }
  }
  assert.deepEqual(found, []);
});
