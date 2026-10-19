/**
 * `apps/www/public/_headers` covers everything the site serves as a public
 * artifact.
 *
 * `/e/` is the contract `npx echo-ui-cli` and the MCP server read, and it was
 * added without a headers rule — so the URLs promised never to change were
 * being revalidated forever, the moving pointers could be served stale by
 * heuristic caching, and neither carried a JSON content type or CORS. Nothing
 * in the repo read `_headers`, so nothing noticed. This reads it.
 *
 * The rule shapes are not arbitrary and are explained in `_headers` itself:
 * Cloudflare applies every matching rule and CONCATENATES the values, so a
 * path matched by two Cache-Control rules gets one invalid header rather than
 * the more specific rule winning. That is the property this file protects.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

import { registryRoot } from "./docs/program";

const repoRoot = resolve(registryRoot, "..");
const publicDir = join(repoRoot, "apps/www/public");
const HEADERS = join(publicDir, "_headers");

interface Rule {
  pattern: string;
  headers: Record<string, string>;
}

/** `_headers` is a path line followed by indented `Name: value` lines. */
function parseHeaders(): Rule[] {
  const rules: Rule[] = [];
  let current: Rule | undefined;
  for (const raw of readFileSync(HEADERS, "utf8").split("\n")) {
    if (!raw.trim() || raw.trimStart().startsWith("#")) continue;
    if (!/^\s/.test(raw)) {
      current = { pattern: raw.trim(), headers: {} };
      rules.push(current);
      continue;
    }
    const match = /^\s+([^:]+):\s*(.*)$/.exec(raw);
    if (match && current) current.headers[match[1]!.trim().toLowerCase()] = match[2]!.trim();
  }
  return rules;
}

/**
 * Cloudflare's matcher, to the extent this file uses it: `*` is a splat that
 * crosses slashes, and `:name` is a placeholder that does not. Both verified
 * against `wrangler dev` before being written down.
 */
function matches(pattern: string, path: string): boolean {
  const source = pattern
    .split(/(\*|:[A-Za-z_][A-Za-z0-9_]*)/)
    .map((part) => {
      if (part === "*") return ".*";
      if (part.startsWith(":")) return "[^/]+";
      return part.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
    })
    .join("");
  return new RegExp(`^${source}$`).test(path);
}

const rules = parseHeaders();
const ruled = (path: string) => rules.filter((r) => matches(r.pattern, path));

/**
 * Every prefix the site serves as a public artifact, with one real path from
 * it. `/e/` is listed because leaving it out is the bug.
 */
const PUBLIC_ARTIFACTS: { what: string; path: string }[] = [
  { what: "the /e/ index", path: "/e/index.json" },
  { what: "an /e/ moving pointer", path: "/e/hardware-button.json" },
  { what: "an /e/ pinned version", path: "/e/hardware-button@0.2.0.json" },
  { what: "the /r/ catalog", path: "/r/catalog.json" },
  { what: "the agent brief", path: "/llms.txt" },
  { what: "the full agent brief", path: "/llms-full.txt" },
  { what: "the social card", path: "/opengraph-image.jpg" },
];

test("every public artifact has a headers rule", () => {
  const uncovered = PUBLIC_ARTIFACTS.filter(({ path }) => ruled(path).length === 0);
  assert.deepEqual(
    uncovered.map((a) => `${a.path} (${a.what})`),
    [],
    "these are served with no headers rule",
  );
});

test("every public JSON artifact is readable cross-origin, as JSON", () => {
  const wrong: string[] = [];
  for (const { path } of PUBLIC_ARTIFACTS.filter((a) => a.path.endsWith(".json"))) {
    const applied = Object.assign({}, ...ruled(path).map((r) => r.headers)) as Record<string, string>;
    if (applied["access-control-allow-origin"] !== "*") wrong.push(`${path}: not cross-origin readable`);
    if (!/^application\/json/.test(applied["content-type"] ?? "")) wrong.push(`${path}: not served as JSON`);
  }
  assert.deepEqual(wrong, [], "the CLI and the MCP fetch these from another origin");
});

/**
 * The immutability promise, which is the whole point of the pinned URL.
 */
/**
 * Cloudflare answers a pinned file's `@` with a 307 to its `%40`
 * form, and `_headers` matches the path as requested: the immutable rule
 * matched only the redirect, and the file itself was served
 * `max-age=0, must-revalidate`. Both spellings are held to the promise, and
 * the client asks for the one that's served.
 */
test("a pinned /e/ version is immutable as it's served, at %40", () => {
  const served = Object.assign({}, ...ruled("/e/hardware-button%400.2.0.json").map((r) => r.headers)) as Record<string, string>;
  assert.match(served["cache-control"] ?? "", /immutable/, "the file Cloudflare serves, after its redirect");
  assert.equal(ruled("/e/hardware-button%400.2.0.json").filter((r) => "cache-control" in r.headers).length, 1);
  // And the moving pointer still isn't matched by it.
  assert.ok(!ruled("/e/hardware-button.json").some((r) => /immutable/.test(r.headers["cache-control"] ?? "")));
});

test("a pinned /e/ version is immutable, and a moving pointer is not", () => {
  const pinned = Object.assign(
    {},
    ...ruled("/e/hardware-button@0.2.0.json").map((r) => r.headers),
  ) as Record<string, string>;
  assert.match(
    pinned["cache-control"] ?? "",
    /immutable/,
    "a URL promised never to change should never be revalidated",
  );

  for (const pointer of ["/e/index.json", "/e/hardware-button.json"]) {
    const applied = Object.assign({}, ...ruled(pointer).map((r) => r.headers)) as Record<string, string>;
    assert.ok(
      !/immutable/.test(applied["cache-control"] ?? ""),
      `${pointer} moves on every release and must never be cached as immutable`,
    );
  }
});

/**
 * The trap this format walks into. Cloudflare concatenates the values of every
 * matching rule, so a second Cache-Control rule over `/e/` does not override
 * the immutable one — it appends to it, and the result is a header no cache
 * can honour. Adding `Cache-Control` to the `/e/*` rule is the obvious, wrong
 * way to give the pointers an explicit policy.
 */
test("no /e/ path is given two Cache-Control rules", () => {
  const clashes: string[] = [];
  for (const { path } of PUBLIC_ARTIFACTS) {
    const setters = ruled(path).filter((r) => "cache-control" in r.headers);
    if (setters.length > 1) {
      clashes.push(`${path} is matched by ${setters.map((r) => r.pattern).join(" and ")}`);
    }
  }
  assert.deepEqual(clashes, [], "Cloudflare concatenates these into one invalid header");
});

/**
 * The list above is hand-written, so it can go stale the way `_headers` itself
 * did. This walks what the build actually produced.
 */
test("the artifact list still describes what the build writes", () => {
  let served: string[];
  try {
    served = readdirSync(join(publicDir, "e"));
  } catch {
    return; // /e/ is build output; nothing to check before `pnpm build:registry`
  }
  assert.ok(served.includes("index.json"), "/e/ has no index.json");
  const pinned = served.filter((f) => f.includes("@"));
  const pointers = served.filter((f) => !f.includes("@") && f !== "index.json");
  assert.ok(pinned.length > 0 && pointers.length > 0, "/e/ has no pinned versions or no pointers");

  const wrong: string[] = [];
  for (const file of [...pinned.slice(0, 5), ...pointers.slice(0, 5)]) {
    const path = `/e/${file}`;
    const applied = Object.assign({}, ...ruled(path).map((r) => r.headers)) as Record<string, string>;
    const immutable = /immutable/.test(applied["cache-control"] ?? "");
    if (file.includes("@") !== immutable) {
      wrong.push(`${path} is ${immutable ? "" : "not "}immutable`);
    }
  }
  assert.deepEqual(wrong, [], "a real /e/ file resolves to the wrong cache policy");
});

/**
 * What every response from the site carries, page or artifact. The site is
 * static and public, so these only narrow what a browser does with it: a JSON
 * file is never sniffed into a page, no other origin frames the site, a link
 * out names the site and not the page, and https stays https. Each is set by
 * one rule, since a second one would be concatenated into a header nobody can
 * read.
 */
const EVERY_RESPONSE: Record<string, RegExp> = {
  "x-content-type-options": /^nosniff$/,
  "x-frame-options": /^SAMEORIGIN$/,
  "referrer-policy": /^strict-origin-when-cross-origin$/,
  "strict-transport-security": /^max-age=\d{8,}/,
};

test("every response carries the browser-safety headers, each from one rule", () => {
  const wrong: string[] = [];
  for (const path of ["/", "/docs/switch", "/e/index.json", "/e/hardware-button@0.2.0.json", "/r/catalog.json", "/_next/static/chunks/main.js", "/plugin/echo-ui-claude.zip", "/opengraph-image.jpg"]) {
    for (const [name, value] of Object.entries(EVERY_RESPONSE)) {
      const setters = ruled(path).filter((r) => name in r.headers);
      if (setters.length !== 1) wrong.push(`${path}: ${name} is set by ${setters.length} rules`);
      else if (!value.test(setters[0]!.headers[name]!)) wrong.push(`${path}: ${name} is "${setters[0]!.headers[name]}"`);
    }
  }
  assert.deepEqual(wrong, []);
});

/**
 * The social card moved from a generated `opengraph-image.tsx`,
 * which Next exports as an extensionless `/opengraph-image`, to a photo,
 * `opengraph-image.jpg`, exported under its own name. The rule (and the
 * public artifacts above) still named the old path: it matched nothing, and
 * the card the site serves lost its cache rule. The card's path is read from
 * the app folder now, so the rule follows the file.
 */
test("the social card the app exports is the one its headers rule names", () => {
  const card = readdirSync(join(repoRoot, "apps/www/app")).find((f) => /^opengraph-image\.(png|jpe?g|tsx?|jsx?)$/.test(f));
  assert.ok(card, "the app has a social card");
  // A generated card is exported without an extension; a picture keeps its own.
  const path = /\.(tsx?|jsx?)$/.test(card) ? "/opengraph-image" : `/${card}`;
  const own = ruled(path).filter((r) => r.pattern !== "/*");
  assert.ok(own.some((r) => "cache-control" in r.headers), `${path} has no cache rule of its own`);
  // A picture's type comes from its extension; a rule naming another would break it for every scraper.
  if (path !== "/opengraph-image") assert.ok(own.every((r) => !("content-type" in r.headers)), `${path} has its type set by hand`);
});
