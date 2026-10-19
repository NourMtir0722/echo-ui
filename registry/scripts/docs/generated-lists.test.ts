/**
 * The guides kept hand-made copies of lists the code owns. The
 * Installation guide's table of what `<EchoCheck />` finds named 5 of the 9
 * rules it runs; the CLI guide's "Everywhere" flags left out two and no page had `style
 * sample`'s `--swatches`, `--zoom` or `--max-width`; and no page
 * listed the rule names `echo.json` takes, though a misspelled one stops the
 * check. Each is now rendered from the code's own list (a component in
 * apps/www/components/guides/live.tsx), and each of these tests holds a guide
 * section to that list: it renders the component, or names every entry.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { PAGE_RULES } from "echo-ui-core/check";
import { CHECK_RULES } from "../../src/agent/config-schema";
import { CLI_OPTIONS } from "../../src/agent/cli-options";
import { registryRoot } from "./program";

const guides = resolve(registryRoot, "../apps/www/app/docs/(guides)");
const guide = (slug: string) => readFileSync(resolve(guides, slug, "content.mdx"), "utf8");

/** The text of one `## ` or `### ` section, up to the next heading of the same or a higher level. */
function section(mdx: string, heading: string): string {
  const lines = mdx.split("\n");
  const start = lines.findIndex((l) => /^#{2,3} /.test(l) && l.replace(/^#+ /, "") === heading);
  assert.ok(start >= 0, `no section "${heading}"`);
  const level = lines[start]!.match(/^#+/)![0].length;
  const end = lines.findIndex((l, i) => i > start && /^#+ /.test(l) && l.match(/^#+/)![0].length <= level);
  return lines.slice(start, end === -1 ? undefined : end).join("\n");
}

/** Which of `names` the section neither renders through `component` nor names in backticks. */
function missing(text: string, component: string, names: readonly string[]): string[] {
  if (new RegExp(`<${component}\\b[^>]*/>`).test(text)) return [];
  return names.filter((n) => !text.includes(`\`${n}\``));
}

test("Installation's page check table is every rule the page check runs", () => {
  const text = section(guide("installation"), "Watch the running page");
  assert.deepEqual(missing(text, "PageRules", PAGE_RULES), []);
});

test("the CLI guide's flags table is every flag the CLI takes", () => {
  const text = section(guide("cli"), "Flags");
  assert.deepEqual(missing(text, "CliFlags", Object.keys(CLI_OPTIONS).map((f) => `--${f}`)), []);
});

test("a page lists every rule name echo.json's check.rules takes", () => {
  const text = guide("echo-json");
  assert.deepEqual(missing(text, "CheckRules", CHECK_RULES), []);
});
