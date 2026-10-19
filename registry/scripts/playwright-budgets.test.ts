import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * A Playwright test that visits a list of pages in one go gets time
 * for each page, not a fixed budget.
 *
 * WebKit under a full run's load loads docs pages steadily but slower (a
 * sidebar full of prefetches), and a sweep with a fixed 30s or 90s ran out
 * of clock partway through the list, again and again, while every page was
 * fine. A sweep whose list comes from outside the test (the routes, the doc
 * slugs) grows with the site, so its budget has to grow with it:
 * `budgetPages(list.length)`. A list written out in the test is short and
 * fixed, and is left alone.
 */
const TESTS = resolve(dirname(fileURLToPath(import.meta.url)), "../../tests");

/** The text of the block that opens at `open` (a `{`), braces matched. */
function block(text: string, open: number): string {
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    if (text[i] === "{") depth++;
    else if (text[i] === "}" && --depth === 0) return text.slice(open, i + 1);
  }
  return text.slice(open);
}

/** Code without its comments, so a helper named in a comment isn't read as a call. */
const code = (text: string) => text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

/** `for (… of <list>) { … page.goto … }` loops in `text`, with their list. */
function sweeps(text: string): { list: string }[] {
  const found: { list: string }[] = [];
  for (const m of text.matchAll(/for \((?:const|let) [^)]*? of ([^)]+)\) \{/g)) {
    if (block(text, m.index! + m[0].length - 1).includes("page.goto(")) found.push({ list: m[1]!.trim() });
  }
  return found;
}

test("every test that sweeps a list of pages budgets its time by the list", () => {
  const unbudgeted: string[] = [];
  for (const file of readdirSync(TESTS).filter((f) => f.endsWith(".spec.ts"))) {
    const text = code(readFileSync(join(TESTS, file), "utf8"));
    // Helpers in the file that sweep without budgeting for themselves: a test that calls one sweeps too.
    const helpers = [...text.matchAll(/^(?:async )?function (\w+)\(/gm)]
      .filter((m) => {
        const helper = block(text, text.indexOf("{", m.index!));
        return sweeps(helper).some((s) => !s.list.startsWith("[\"")) && !/budgetPages\(/.test(helper);
      })
      .map((m) => m[1]!);
    for (const m of text.matchAll(/^[ \t]*test\((["'`])(.+?)\1[^\n]*?=>\s*\{/gm)) {
      const body = block(text, m.index! + m[0].length - 1);
      const listed = sweeps(body).filter((s) => !s.list.startsWith("[") || s.list.startsWith("[..."));
      const viaHelper = helpers.some((name) => new RegExp(`\\b${name}\\(`).test(body));
      if ((listed.length || viaHelper) && !/budgetPages\(/.test(body) && !/setTimeout\([^)]*\.length/.test(body)) {
        unbudgeted.push(`${file}: "${m[2]}"`);
      }
    }
  }
  assert.deepEqual(unbudgeted, [], "give each of these `budgetPages(<the list>.length)` once it has its list");
});

/**
 * A test that times the page runs on a quiet machine.
 *
 * The LCP budget ran inside the parallel run, on the heaviest page, while
 * every other worker loaded pages too: it measured 2,520ms and then 2,612ms
 * against 2,500ms, and passed alone every time. `load.spec.ts` is where a
 * measurement of time belongs: only the load projects run it, after
 * every other project has finished, and its tests run one at a time.
 */
test("a test that times a page load is in load.spec.ts, which runs after everything else", () => {
  const TIMING = /largest-contentful-paint|first-contentful-paint|setCPUThrottlingRate|emulateNetworkConditions/;
  const outside = readdirSync(TESTS)
    .filter((f) => f.endsWith(".spec.ts") && f !== "load.spec.ts")
    .filter((f) => TIMING.test(code(readFileSync(join(TESTS, f), "utf8"))));
  assert.deepEqual(outside, [], "move the timing test into load.spec.ts");
  // And in there, one at a time: the config runs tests fully parallel, and two
  // measurements side by side time each other.
  assert.match(code(readFileSync(join(TESTS, "load.spec.ts"), "utf8")), /test\.describe\.configure\(\{ mode: "(default|serial)" \}\)/);
});

/**
 * On the homepage, a key is pressed on a control only once it has
 * hydrated.
 *
 * It's the heaviest page, and under a full run its scripts can still be
 * starting when a test has focused a server-rendered control and pressed a
 * key: focus is real, and the key reaches no handler. The comparison's line
 * stayed at 50 after Home, twice in a day, and passed alone every time.
 * `hydrated()` waits until React has the element.
 */
test("a homepage test waits for a control to hydrate before focusing it and pressing keys", () => {
  const text = code(readFileSync(join(TESTS, "home.spec.ts"), "utf8"));
  const hurried: string[] = [];
  for (const m of text.matchAll(/^test\((["'`])(.+?)\1[^\n]*?=>\s*\{/gm)) {
    const body = block(text, m.index! + m[0].length - 1);
    const focus = body.search(/\.focus\(\)/);
    if (focus < 0 || !/keyboard\.press\(/.test(body)) continue;
    const wait = body.search(/\bhydrated\(/);
    if (wait < 0 || wait > focus) hurried.push(m[2]!);
  }
  assert.deepEqual(hurried, [], "await hydrated(<a control>) before the first focus()");
});

/**
 * The quiet load projects take `load.spec.ts`, and only it.
 *
 * Both halves read one unanchored pattern, /load\.spec\.ts/, and a spec whose
 * name merely ends that way (`file-upload.spec.ts`) matched it: the main
 * projects ignored its tests, and the load projects claimed them, pulling in
 * their dependencies, so running that one file ran the whole suite. Checked
 * against every spec there is, and two names that would fool it.
 */
test("the load projects run load.spec.ts and nothing else, and the main projects run everything else", async () => {
  const { default: config } = await import("../../playwright.config");
  const files = [...readdirSync(TESTS).filter((f) => f.endsWith(".spec.ts")), "file-upload.spec.ts", "download.spec.ts"].map((f) => join(TESTS, f));
  const hits = (pattern: unknown, file: string) => [pattern].flat().some((p) => p instanceof RegExp && p.test(file));
  const wrong: string[] = [];
  for (const project of config.projects ?? []) {
    for (const file of new Set(files)) {
      const isLoad = basename(file) === "load.spec.ts";
      if (project.name?.startsWith("load-")) {
        if (hits(project.testMatch, file) !== isLoad) wrong.push(`${project.name} ${isLoad ? "misses" : "takes"} ${basename(file)}`);
      } else if (project.testIgnore !== undefined && hits(project.testIgnore, file) !== isLoad) {
        wrong.push(`${project.name} ${isLoad ? "runs" : "ignores"} ${basename(file)}`);
      }
    }
  }
  assert.deepEqual(wrong, [], "anchor the pattern to the file's own name");
});

