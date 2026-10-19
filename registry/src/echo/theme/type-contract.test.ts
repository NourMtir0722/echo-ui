import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { createEchoTheme } from "echo-ui-core/theme";
import { ECHO_FONT_ROLES } from "echo-ui-core/theme";

/**
 * The type contract.
 *
 * `--echo-font-machine` was referenced 55 times and `--echo-font-lcd` 5, and
 * neither was defined anywhere. All 60 declarations fell through to whatever
 * fallback each one happened to name, so the library had no typeface at all —
 * and a consumer installing from the registry got less than the docs site,
 * because the engine emitted colour only.
 *
 * Nothing about that was visible: every page rendered, every test passed, and
 * the fallbacks were plausible. Only a test that compares what components
 * REFERENCE against what the engine EMITS can see it.
 */
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, "..", "..", "..");

function componentStylesheets(): Map<string, string> {
  const manifest = readFileSync(path.join(ROOT, "registry.json"), "utf8");
  const files = [...new Set([...manifest.matchAll(/"(src\/echo\/[^"]+\.css)"/g)].map((m) => m[1]!))];
  const sheets = new Map<string, string>();
  for (const file of files) {
    try {
      sheets.set(file, readFileSync(path.join(ROOT, file), "utf8"));
    } catch {
      /* a manifest entry with no file is registry.json's problem */
    }
  }
  return sheets;
}

test("createEchoTheme emits every font role it declares", () => {
  const { css, values } = createEchoTheme();
  for (const role of ECHO_FONT_ROLES) {
    assert.match(css, new RegExp(`--echo-font-${role}:`), `--echo-font-${role} is not emitted`);
    assert.ok(values.fonts[role]?.length, `fonts.${role} is empty in the JS mirror`);
  }
});

/** The regression itself: referenced-but-undefined must fail. */
test("every font token referenced in component CSS is emitted by the theme", () => {
  const { css } = createEchoTheme();
  const emitted = new Set([...css.matchAll(/(--echo-font-[a-z0-9-]+):/g)].map((m) => m[1]!));

  const undefinedRefs = new Map<string, string[]>();
  for (const [file, text] of componentStylesheets()) {
    for (const m of text.matchAll(/var\((--echo-font-[a-z0-9-]+)/g)) {
      const token = m[1]!;
      if (emitted.has(token)) continue;
      const list = undefinedRefs.get(token) ?? [];
      if (!list.includes(file)) list.push(file);
      undefinedRefs.set(token, list);
    }
  }

  assert.deepEqual(
    [...undefinedRefs].map(([t, files]) => `${t} (${files.length} files, e.g. ${files[0]})`),
    [],
    "component CSS references font tokens the theme never emits — those declarations have no typeface",
  );
});

/**
 * The `field.css` trap: one token carrying two contradictory
 * fallbacks. `--echo-font-machine` fell back to `ui-sans-serif` in one rule
 * and `ui-monospace` in another, so every monospace-fallback declaration was
 * rendering monospace ONLY because the token did not exist. Defining it would
 * silently turn seventeen of them sans — starting with the OTP field, whose
 * own comment says the digits "have to be distinguishable at a glance".
 *
 * The rule: a fallback may never contradict its token's role.
 */
test("no font declaration contradicts its own token", () => {
  const MONO_ROLES = new Set(["mono", "lcd"]);
  const offences: string[] = [];

  for (const [file, text] of componentStylesheets()) {
    text.split("\n").forEach((line, i) => {
      const m = line.match(/var\(--echo-font-([a-z]+),([^)]*)\)/);
      if (!m) return;
      const [, role, fallback] = m as unknown as [string, string, string];
      const fallbackIsMono = /monospace|Menlo|SFMono|Consolas/i.test(fallback);
      if (MONO_ROLES.has(role) && !fallbackIsMono) {
        offences.push(`${file}:${i + 1} --echo-font-${role} falls back to a proportional stack`);
      }
      if (!MONO_ROLES.has(role) && fallbackIsMono) {
        offences.push(
          `${file}:${i + 1} --echo-font-${role} falls back to monospace — this renders ` +
            `monospace today only because the token is undefined, and will flip the moment it is not`,
        );
      }
    });
  }
  assert.deepEqual(offences, []);
});

/**
 * The OTP field is the first casualty of the trap and the reason the mono
 * variant needed its own token rather than a different fallback.
 */
test("the mono input variants resolve to a monospace role, not to machine", () => {
  for (const file of ["src/echo/field/field.css", "src/echo/textarea/textarea.css"]) {
    const text = readFileSync(path.join(ROOT, file), "utf8");
    const block = text.slice(text.indexOf("--mono"));
    const rule = block.slice(0, block.indexOf("}"));
    assert.match(
      rule,
      /var\(--echo-font-mono/,
      `${file}'s --mono variant does not use --echo-font-mono, so it is not monospace`,
    );
  }
});

/** Defaults name no webfont: a family nobody self-hosts is the same bug again. */
test("the default font stacks are system-only and need no network", () => {
  const { values } = createEchoTheme();
  for (const role of ECHO_FONT_ROLES) {
    const stack = values.fonts[role];
    assert.ok(
      !/['"]/.test(stack.replace(/'(SF Mono|Segoe UI)'/g, "")),
      `--echo-font-${role} names a webfont family (${stack}) that nothing self-hosts`,
    );
  }
});

/** A seed can name real families once that decision is made — in one edit. */
test("font roles are overridable from the seed", () => {
  const { css, values } = createEchoTheme({ fontMachine: "'Hanken Grotesk', sans-serif" });
  assert.equal(values.fonts.machine, "'Hanken Grotesk', sans-serif");
  assert.match(css, /--echo-font-machine: 'Hanken Grotesk', sans-serif;/);
  // The others keep their defaults rather than being wiped by a partial seed.
  assert.ok(values.fonts.mono.includes("monospace"));
});
