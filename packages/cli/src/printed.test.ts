/**
 * Four lines in the docs said what `init` and the Stop gate print,
 * and none of them was what they print. The CLI guide said `init` writes "one
 * hook entry" (it writes two, the check and the Stop gate) and "prints the two
 * setup lines" (three things to paste); the workflow said `init` prints
 * `SoundProvider` (the first item that makes sound does, at `add`); and For AI
 * agents quoted the Stop gate opening "Echo's design tests found", where it
 * says "Echo's tests found". Each claim is now read against the code that
 * prints it.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";

import { HOOK_ENTRY } from "./agent-files";
import { INIT_SETUP } from "./commands/init";

const repo = new URL("../../../", import.meta.url);
const guides = new URL("apps/www/app/docs/(guides)/", repo);
const DOCS = [
  ...readdirSync(guides, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(new URL(`${d.name}/content.mdx`, guides)))
    .map((d) => `apps/www/app/docs/(guides)/${d.name}/content.mdx`),
  "README.md",
  "packages/cli/README.md",
].map((path) => ({ path, text: readFileSync(new URL(path, repo), "utf8") }));

const NUMBERS = ["no", "one", "two", "three", "four", "five", "six"];

test("the docs count the hook entries init writes as init writes them", () => {
  const hooks = Object.keys(HOOK_ENTRY.hooks).length;
  const wrong = DOCS.flatMap(({ path, text }) =>
    [...text.matchAll(/\b(no|one|two|three|four|five|six) hook entr(?:y|ies)\b/g)]
      .filter((m) => NUMBERS.indexOf(m[1]!) !== hooks)
      .map((m) => `${path}: "${m[0]}", and init writes ${hooks}`),
  );
  assert.deepEqual(wrong, []);
});

test("what the docs say init prints to paste is what it prints", () => {
  // The theme, then each of INIT_SETUP.
  const steps = 1 + INIT_SETUP.length;
  const wrong = DOCS.flatMap(({ path, text }) => {
    const said = text.replace(/\s+/g, " ");
    return [
      ...[...said.matchAll(/prints the (no|one|two|three|four|five|six) setup lines/g)]
        .filter((m) => NUMBERS.indexOf(m[1]!) !== steps)
        .map((m) => `${path}: "${m[0]}", and init prints ${steps} things to paste`),
      ...(INIT_SETUP.includes("sound-provider" as never)
        ? []
        : [...said.matchAll(/[^.]*prints what to paste[^.]*\./g)]
            .filter((m) => m[0].includes("SoundProvider"))
            .map((m) => `${path}: "${m[0].trim()}", and init doesn't print SoundProvider (add does, for an item that makes sound)`)),
    ];
  });
  assert.deepEqual(wrong, []);
});

test("a quoted Stop gate opens the way the Stop gate does", () => {
  const stop = readFileSync(new URL("check/stop.ts", import.meta.url), "utf8");
  const opening = /`(Echo's [^`$]*?found) \$\{all\.length\}/.exec(stop)?.[1];
  assert.ok(opening, "stop.ts's blockText still opens with what it found");
  const wrong = DOCS.flatMap(({ path, text }) =>
    [...text.matchAll(/^Echo's [A-Za-z ]*found \d+ things? to fix/gm)]
      .filter((m) => !m[0].startsWith(`${opening} `))
      .map((m) => `${path}: "${m[0]}", where the Stop gate says "${opening} …"`),
  );
  assert.deepEqual(wrong, []);
});
