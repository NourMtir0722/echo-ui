import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

import {
  warnIfUnsupportedTreatment,
  warnIfCaptionRepeatsLabel,
  __resetEngravedPrimaryWarning,
} from "./treatment";

/**
 * `engraved` is not a treatment for submit buttons.
 *
 * Debossed type measures ~1.05-1.3:1 over the primary gradient. That is the
 * physical effect working correctly, and it is exactly why it cannot carry the
 * one word that says what a form does.
 */
const HERE = path.dirname(fileURLToPath(import.meta.url));
const source = (file: string) => readFileSync(path.join(HERE, "..", file), "utf8");

function captureWarnings(run: () => void): string[] {
  const warnings: string[] = [];
  const original = console.warn;
  console.warn = (msg?: unknown) => void warnings.push(String(msg));
  try {
    run();
  } finally {
    console.warn = original;
  }
  return warnings;
}

test("engraved + primary warns, and says what to do instead", () => {
  __resetEngravedPrimaryWarning();
  const warnings = captureWarnings(() => warnIfUnsupportedTreatment("primary", true));
  assert.equal(warnings.length, 1);
  assert.match(warnings[0]!, /not supported/);
  assert.match(warnings[0]!, /neutral cap/); // it names the alternative
  assert.doesNotMatch(warnings[0]!, /ECHO-\d/, "a user cannot look up an internal ticket");
});

test("every supported combination stays silent", () => {
  __resetEngravedPrimaryWarning();
  const warnings = captureWarnings(() => {
    warnIfUnsupportedTreatment("neutral", true); // the legitimate use
    warnIfUnsupportedTreatment("ghost", true);
    warnIfUnsupportedTreatment("primary", false);
    warnIfUnsupportedTreatment("neutral", false);
  });
  assert.deepEqual(warnings, []);
});

/** A warning per render is noise, and noise is how the last one got ignored. */
test("the warning fires once per process, not once per render", () => {
  __resetEngravedPrimaryWarning();
  const warnings = captureWarnings(() => {
    for (let i = 0; i < 50; i++) warnIfUnsupportedTreatment("primary", true);
  });
  assert.equal(warnings.length, 1);
});

/** The source of every template block the registry ships, relative to `src/echo`. */
function templateSources(): string[] {
  const manifest = JSON.parse(readFileSync(path.join(HERE, "..", "..", "..", "registry.json"), "utf8")) as {
    items: { type: string; files: { path: string }[] }[];
  };
  const files = manifest.items
    .filter((i) => i.type === "registry:block")
    .flatMap((i) => i.files.map((f) => f.path))
    .filter((p) => p.endsWith(".tsx"))
    .map((p) => p.replace(/^src\/echo\//, ""));
  assert.ok(files.length > 0, "the registry ships no template blocks to check");
  return files;
}

/**
 * The templates are the reason this ticket exists: two of them committed their
 * forms with `variant="primary" size="lg" engraved`. Asserted against the
 * source of every block the registry ships, because the defect is a prop on a
 * call site, and a rendering test would only prove the cap accepts the prop.
 */
test("no template commits its form with an engraved primary cap", () => {
  for (const file of templateSources()) {
    const text = source(file);
    for (const match of text.matchAll(/<HardwareButton[^>]*>/gs)) {
      const tag = match[0];
      const isPrimary = /variant="primary"/.test(tag);
      // `engraved` as a real prop, not the word inside a comment.
      const hasEngraved = /(^|\s)engraved(\s|=|\/|>)/.test(tag.replace(/\/\*.*?\*\//gs, ""));
      assert.ok(
        !(isPrimary && hasEngraved),
        `${file} still renders an engraved primary cap:\n${tag}`,
      );
    }
  }
});

test("the engraved prop documents what it costs, not just what it looks like", () => {
  const text = source("hardware-button/hardware-button.tsx");
  const doc = text.slice(0, text.indexOf("engraved?: boolean;"));
  const block = doc.slice(doc.lastIndexOf("/**"));
  // A number in the doc comment is the difference between a warning and a rule.
  assert.match(block, /1\.\d+:1/, "the engraved prop docs do not state a measured ratio");
  assert.match(block, /not the only thing/, "the engraved prop docs do not state when it is legitimate");
});

/* ----------------------------------------------------------------- caption */

/**
 * The caption rule, picked rather than left to taste.
 *
 * The two templates had reached opposite conclusions about the same prop on
 * the same component — auth deliberately omitted a caption because "repeating
 * it there is the only text on the screen that says nothing", settings
 * rendered `caption="save"` under a button labelled "Save changes" — and one
 * of them had written its reasoning down as a rule.
 */
test("a caption that repeats its label warns", () => {
  __resetEngravedPrimaryWarning();
  const warnings = captureWarnings(() => warnIfCaptionRepeatsLabel("save", "Save changes"));
  assert.equal(warnings.length, 1);
  assert.match(warnings[0]!, /repeats its own label/);
  assert.doesNotMatch(warnings[0]!, /ECHO-\d/, "a user cannot look up an internal ticket");
});

test("a caption that says something the label cannot stays silent", () => {
  __resetEngravedPrimaryWarning();
  const warnings = captureWarnings(() => {
    warnIfCaptionRepeatsLabel("48kHz", "Sample rate"); // a unit
    warnIfCaptionRepeatsLabel("ready", "Record"); // a device state
    warnIfCaptionRepeatsLabel("⌘S", "Save changes"); // a shortcut
    warnIfCaptionRepeatsLabel(undefined, "Save changes"); // no caption at all
  });
  assert.deepEqual(warnings, []);
});

/** No template may repeat a label in a caption. */
test("no template gives a button a caption that repeats its label", () => {
  for (const file of templateSources()) {
    const text = source(file);
    for (const match of text.matchAll(/<HardwareButton([^>]*)>([^<]*)</gs)) {
      const caption = /caption="([^"]+)"/.exec(match[1]!)?.[1];
      if (!caption) continue;
      const label = match[2]!.trim().toLowerCase();
      const c = caption.trim().toLowerCase();
      assert.ok(
        !label || !(label.includes(c) || c.includes(label)),
        `${file}: caption="${caption}" repeats the label "${match[2]!.trim()}"`,
      );
    }
  }
});
