import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { createEchoTheme } from "echo-ui-core/theme";
import {
  RADIUS_SCALE,
  TYPE_SCALE,
  SPACE_SCALE,
  CONTROL_HEIGHT,
  DURATION_SCALE,
  EASE_SCALE,
  Z_SCALE,
  WEIGHT_SCALE,
  LEADING_SCALE,
  TRACKING_SCALE,
  TEXT_STYLES,
  BORDER_SCALE,
  ICON_SCALE,
  BREAKPOINTS,
  SHADOW_RECIPES,
  shadowValue,
  type ShadowName,
} from "echo-ui-core/theme";

/**
 * The scale contract.
 *
 * These are lint rules for CSS. They live in the test
 * suite rather than in ESLint because ESLint does not read CSS, and a rule
 * nothing runs is not a rule.
 *
 * Every one of them is a RATCHET: it fails on a literal that a token should
 * carry, so the next person to write `border-radius: 11px` finds out at the
 * same moment they write it, rather than at the next review.
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

/** Strips comments, so prose about `11px` never fails a rule. */
const code = (css: string): string => css.replace(/\/\*[\s\S]*?\*\//g, "");

function scan(pattern: RegExp, allow: (value: string, line: string) => boolean): string[] {
  const offences: string[] = [];
  for (const [file, css] of componentStylesheets()) {
    code(css)
      .split("\n")
      .forEach((line, i) => {
        for (const m of line.matchAll(pattern)) {
          if (allow(m[1]!, line)) continue;
          offences.push(`${file}:${i + 1} ${line.trim()}`);
        }
      });
  }
  return [...new Set(offences)];
}

/**
 * Offences where `prop` isn't `var(--echo-<prefix>-<step>, <value>)` with the
 * value that step has. The fallback keeps a component working under an older
 * echo-ui-core that doesn't emit the token yet; checking it against the scale
 * keeps the two from drifting apart.
 */
function tokenOnly(prop: string, prefix: string, scale: Record<string, string>): string[] {
  return scan(new RegExp(`(?<![\\w-])${prop}:\\s*([^;]+);`, "g"), (value) => {
    const m = new RegExp(`^var\\(--echo-${prefix}-([a-z]+), (-?[\\d.]+(?:em)?)\\)$`).exec(value.trim());
    return m !== null && scale[m[1]!] === m[2];
  });
}

/* ------------------------------------------------------------- the tokens exist */

/**
 * Every CSS rule below reads `componentStylesheets()`, and every one of them
 * asserts that a list of offences is empty. If that map ever came back empty
 * — registry.json changing shape, the `src/echo/` path pattern drifting —
 * all fifteen would pass having read nothing at all. This is the one
 * assertion in the file that fails when the input disappears.
 */
test("there are component stylesheets to check", () => {
  const sheets = componentStylesheets();
  assert.ok(
    sheets.size > 40,
    `expected the whole library, read ${sheets.size} stylesheets — the CSS rules below are vacuous`,
  );
});

test("createEchoTheme emits every step of every scale", () => {
  const { css } = createEchoTheme();
  const expected = [
    ...Object.keys(RADIUS_SCALE).map((s) => `--echo-radius-${s}`),
    ...Object.keys(TYPE_SCALE).map((s) => `--echo-text-${s}`),
    ...Object.keys(SPACE_SCALE).map((s) => `--echo-space-${s}`),
    ...Object.keys(CONTROL_HEIGHT).map((s) => `--echo-control-${s}`),
    ...Object.keys(DURATION_SCALE).map((s) => `--echo-duration-${s}`),
    ...Object.keys(EASE_SCALE).map((s) => `--echo-ease-${s}`),
    ...Object.keys(Z_SCALE).map((s) => `--echo-z-${s}`),
    ...Object.keys(BORDER_SCALE).map((s) => `--echo-border-${s}`),
    ...Object.keys(ICON_SCALE).map((s) => `--echo-icon-${s}`),
    ...Object.keys(WEIGHT_SCALE).map((s) => `--echo-weight-${s}`),
    ...Object.keys(LEADING_SCALE).map((s) => `--echo-leading-${s}`),
    ...Object.keys(TRACKING_SCALE).map((s) => `--echo-tracking-${s}`),
    ...Object.keys(TEXT_STYLES).flatMap((s) => [`--echo-type-${s}`, `--echo-type-${s}-tracking`, `--echo-type-${s}-case`]),
    ...Object.keys(SHADOW_RECIPES).map((s) => `--echo-shadow-${s}`),
  ];
  const missing = expected.filter((token) => !css.includes(`${token}:`));
  assert.deepEqual(missing, [], "scale tokens the engine declares but does not emit");
});

/* ---------------------------------------------------------- weight, leading, tracking */

test("no component CSS hardcodes a font weight, line height or letter-spacing", () => {
  assert.deepEqual(
    [
      ...tokenOnly("font-weight", "weight", WEIGHT_SCALE),
      ...tokenOnly("line-height", "leading", LEADING_SCALE),
      ...tokenOnly("letter-spacing", "tracking", TRACKING_SCALE),
    ],
    [],
    "use var(--echo-weight-*), var(--echo-leading-*) and var(--echo-tracking-*) with the step's value as fallback",
  );
});

test("every text style is built from steps that exist", () => {
  for (const [name, t] of Object.entries(TEXT_STYLES)) {
    assert.ok(t.size in TYPE_SCALE, `${name}: no type step ${t.size}`);
    assert.ok(t.weight in WEIGHT_SCALE, `${name}: no weight ${t.weight}`);
    assert.ok(t.leading in LEADING_SCALE, `${name}: no leading ${t.leading}`);
    assert.ok(t.tracking in TRACKING_SCALE, `${name}: no tracking ${t.tracking}`);
  }
});

/* ---------------------------------------------------- borders, icons, widths */

/** A px value inside `var(--echo-<prefix>-<step>, <px>)` whose fallback matches the scale. */
function tokenised(value: string, prefix: string, scale: Record<string, string>): string {
  return value.replace(
    new RegExp(`var\\(--echo-${prefix}-([a-z]+), ([\\d.]+px)\\)`, "g"),
    (whole, step: string, px: string) => (scale[step] === px ? "" : whole),
  );
}

test("no component CSS hardcodes a border width", () => {
  const offences = scan(
    /(?<![\w-])border(?:-(?:top|right|bottom|left|block|inline)(?:-(?:start|end))?)?(?:-width)?:\s*([^;]+);/g,
    (value) => !/\d+(\.\d+)?px/.test(tokenised(value, "border", BORDER_SCALE)),
  );
  assert.deepEqual(offences, [], "use var(--echo-border-<step>, <px>) — see BORDER_SCALE");
});

test("icon sizes come from the icon scale", () => {
  const offences: string[] = [];
  for (const [file, css] of componentStylesheets()) {
    for (const m of code(css).matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      const selector = m[1]!.trim().split("\n").pop()!.trim();
      const isIcon = /\bsvg$/.test(selector);
      for (const d of m[2]!.matchAll(/(?<![\w-])(width|height|--hw-icon):\s*([^;]+);/g)) {
        if (!isIcon && d[1] !== "--hw-icon") continue;
        if (/\d+(\.\d+)?px/.test(tokenised(d[2]!, "icon", ICON_SCALE))) offences.push(`${file} ${selector} ${d[0]}`);
      }
    }
  }
  assert.deepEqual(offences, [], "use var(--echo-icon-<step>, <px>) — see ICON_SCALE");
});

/**
 * CSS can't read a custom property in a media query, so the breakpoints are
 * held to the named scale here instead: five ad-hoc widths became four.
 */
test("every media query width is a named breakpoint", () => {
  const allowed = new Set<string>(Object.values(BREAKPOINTS));
  const offences = scan(/@media[^{]*?(?:min|max)-width:\s*([\d.]+px)/g, (value) => allowed.has(value));
  assert.deepEqual(offences, [], `use one of BREAKPOINTS: ${[...allowed].join(", ")}`);
});

/* -------------------------------------------------------------------- radius */

test("no component CSS hardcodes a border radius", () => {
  const offences = scan(
    /border-radius:\s*([^;]+);/g,
    (value) =>
      // `0`, `50%`, token shorthands, and `calc()` off a component-local
      // tunable (the button well is `calc(var(--hw-radius) + 3px)`, which is
      // derived FROM a token rather than competing with one).
      value.includes("calc(") || !/\d+(\.\d+)?px/.test(value),
  );
  assert.deepEqual(offences, [], "use var(--echo-radius-*) — see RADIUS_SCALE");
});

test("the radius scale is at most seven steps plus `full`", () => {
  assert.ok(
    Object.keys(RADIUS_SCALE).length <= 8,
    `the radius scale has grown to ${Object.keys(RADIUS_SCALE).length} steps; 18 distinct radii is what it replaced`,
  );
});

/* ----------------------------------------------------------------- type size */

test("no component CSS hardcodes a font size", () => {
  const offences = scan(
    /font-size:\s*([^;]+);/g,
    (value) =>
      value.includes("var(") ||
      // Fluid display type. `clamp()` in rem is not a magic number — it still
      // responds to the reader's default size, which is what the rem type scale is for.
      (value.includes("clamp(") && !/\d+px/.test(value)) ||
      !/\d/.test(value),
  );
  assert.deepEqual(offences, [], "use var(--echo-text-*) — see TYPE_SCALE");
});

/**
 * The reason the type scale exists. Page zoom always worked, so this was never
 * a 1.4.4 failure — but a reader who has raised their browser's default text
 * size, the standard low-vision accommodation, got no change at all from an
 * Echo interface. 88 of 91 declarations were in `px`.
 */
test("every step of the type scale is in rem, so the browser's text size wins", () => {
  for (const [step, value] of Object.entries(TYPE_SCALE)) {
    assert.match(value, /rem$/, `--echo-text-${step} is ${value}, which does not respond to a user's default`);
  }
});

/*
 * Eight steps when the scale replaced fifteen sizes; nine with `3xl`, the
 * display step (40px) both Paperlab moodboard runs reached for and couldn't
 * have. A tenth needs a reason as good.
 */
test("the type scale is at most nine steps", () => {
  assert.ok(
    Object.keys(TYPE_SCALE).length <= 9,
    `the type scale has grown to ${Object.keys(TYPE_SCALE).length} steps; 15 sizes is what it replaced`,
  );
});

/* --------------------------------------------------------------------- space */

test("no component CSS hardcodes spacing", () => {
  const PROPS = /(?:^|\s)(?:padding|margin|gap|row-gap|column-gap)(?:-(?:top|right|bottom|left))?:\s*([^;]+);/g;
  const offences = scan(PROPS, (value) => {
    if (value.includes("clamp(") || value.includes("calc(")) return true; // fluid by intent
    // The visually-hidden idiom offsets by -1px; that is a clip, not spacing.
    if (/^-\d+px$/.test(value.trim())) return true;
    return !/\d+(\.\d+)?px/.test(value);
  });
  assert.deepEqual(offences, [], "use var(--echo-space-*) — see SPACE_SCALE");
});

/* -------------------------------------------------------------------- motion */

/**
 * `motion.ts` documents its own anti-pattern: "Never invent a duration
 * inline… scattered magic numbers are how a motion system dies." The CSS then
 * held 44 inline durations across 15 values, four of which matched a token.
 * The rule was right and was being broken, in writing, at scale, in the same
 * repository.
 */
test("no component CSS invents a duration", () => {
  const offences = scan(
    /(?<![\w-])(\d+(?:\.\d+)?)ms(?![\w-])/g,
    (value) => value === "0", // `transition-duration: 0ms` is a cancellation, not a duration
  );
  assert.deepEqual(offences, [], "use var(--echo-duration-*) — see DURATION_SCALE");
});

/**
 * The same rule in seconds, and across line breaks.
 *
 * The rule above scans for `ms` on a single line, which is two gaps at once.
 * `0.5s` is a duration it never looks at, and nine stylesheets write their
 * transitions over several lines:
 *
 *     transition:
 *       color 250ms ease,
 *       background 0.5s ease;
 *
 * — where the only line carrying the word `transition` carries no time at all.
 * A line-based scan reads the declaration's first line and finds nothing.
 *
 * So this one matches the DECLARATION, not the line: `[^;}]*` crosses
 * newlines, and every literal time inside is an offence unless it is the
 * reduced-motion kill switch. Seconds are only allowed on `animation`, which
 * is deliberate and is why this is scoped to `transition` rather than to any
 * time anywhere — a 1.6s idle sheen has no token and should not invent one.
 */
test("every time in a transition comes from the duration scale, across line breaks", () => {
  const offences: string[] = [];
  for (const [file, css] of componentStylesheets()) {
    const source = code(css);
    for (const decl of source.matchAll(/(?<![\w-])(transition(?:-duration|-delay)?)\s*:\s*([^;}]*)/g)) {
      const literals = [...decl[2]!.matchAll(/(?<![\w.-])(\d+(?:\.\d+)?)(m?s)(?![\w-])/g)].filter(
        (t) => Number(t[1]) !== 0,
      );
      if (literals.length === 0) continue;
      const line = source.slice(0, decl.index!).split("\n").length;
      offences.push(`${file}:${line} ${decl[1]} carries ${literals.map((t) => t[0]).join(", ")}`);
    }
  }
  assert.deepEqual(
    offences,
    [],
    "interaction timing is a token — use var(--echo-duration-*), see DURATION_SCALE",
  );
});

test("every duration token has a CSS easing to go with it", () => {
  for (const step of Object.keys(DURATION_SCALE)) {
    assert.ok(
      step in EASE_SCALE,
      `--echo-duration-${step} has no --echo-ease-${step}; GSAP ease strings are not valid CSS`,
    );
  }
});

/**
 * The reduced-motion guards are the one thing a sweeping duration refactor
 * could quietly destroy, so they are counted rather than trusted.
 */
test("the reduced-motion overrides survived the duration migration", () => {
  let guards = 0;
  for (const [, css] of componentStylesheets()) {
    guards += [...css.matchAll(/@media\s*\(prefers-reduced-motion:\s*reduce\)/g)].length;
  }
  assert.ok(guards >= 15, `only ${guards} prefers-reduced-motion guards remain; there were 15+`);
});

/* ------------------------------------------------------------------- z-index */

/**
 * One stacking order. Eight raw values (0, 1, 2, 30, 40, 50, 51, 60) left
 * Select, Popover and Tooltip with none at all, so they opened behind the
 * dialog they were in. The fallback keeps a component working under
 * an older echo-ui-core that doesn't emit the token yet.
 */
test("no component CSS hardcodes a z-index", () => {
  assert.deepEqual(tokenOnly("z-index", "z", Z_SCALE), [], "use var(--echo-z-<step>, <value>) — see Z_SCALE");
});

test("page layers open in order: dialog, then its popups, then toasts and tooltips", () => {
  const order = ["sticky", "overlay", "modal", "popover", "toast", "tooltip", "skip"] as const;
  const values = order.map((step) => Number(Z_SCALE[step]));
  assert.deepEqual(values, [...values].sort((a, b) => a - b));
});

/* ------------------------------------------------------------------- shadow */

/**
 * Shadow recipes (echo-ui-core's shadow.ts). 237 shadow declarations held 148
 * distinct values; the depths the library shares are named, and a component
 * whose shadow IS one reads it by name, with the recipe as its fallback so it
 * still renders under a theme written before recipes existed.
 */
const flat = (v: string): string =>
  v.replace(/\s+/g, " ").replace(/\s*,\s*/g, ", ").replace(/\(\s+/g, "(").replace(/\s+\)/g, ")").trim();

const RECIPE_BY_VALUE = new Map(
  (Object.keys(SHADOW_RECIPES) as ShadowName[]).map((name) => [flat(shadowValue(name)), name]),
);

/** Every `var(--echo-shadow-<name>, <fallback>)` in a stylesheet, parens balanced. */
function recipeReads(css: string): { name: string; fallback: string | undefined }[] {
  const found: { name: string; fallback: string | undefined }[] = [];
  for (const m of css.matchAll(/var\(\s*--echo-shadow-([a-z-]+)\s*(,|\))/g)) {
    if (m[2] === ")") {
      found.push({ name: m[1]!, fallback: undefined });
      continue;
    }
    let depth = 1;
    let i = m.index! + m[0].length;
    const start = i;
    for (; i < css.length && depth > 0; i++) {
      if (css[i] === "(") depth++;
      else if (css[i] === ")") depth--;
    }
    found.push({ name: m[1]!, fallback: css.slice(start, i - 1) });
  }
  return found;
}

const shadowDeclarations = (css: string): string[] =>
  [...code(css).matchAll(/(?<![\w-])box-shadow\s*:\s*([^;{}]+);/g)].map((m) => flat(m[1]!.replace(/\s*!important$/, "")));

/** Core's own recipe classes use the recipes too. */
const materialCss = (): [string, string] => [
  "packages/core/src/theme/material.css",
  readFileSync(path.join(ROOT, "..", "packages/core/src/theme/material.css"), "utf8"),
];

test("every shadow recipe is the key light: gloss and shade alphas, and roles", () => {
  for (const name of Object.keys(SHADOW_RECIPES) as ShadowName[]) {
    const rest = shadowValue(name)
      .replace(/rgb\(255 255 255 \/ calc\([\d.]+ \* var\(--echo-gloss, 1\)\)\)/g, "")
      .replace(/color-mix\(in oklab, var\(--echo-cast-ink, black\) calc\([\d.]+ \* var\(--echo-shade, 1\) \* 100%\), transparent\)/g, "")
      .replace(/color-mix\(in ok(?:lch|lab), var\(--echo-[a-z0-9-]+\) \d+%, transparent\)/g, "")
      .replace(/var\(--echo-[a-z0-9-]+, var\(--echo-[a-z0-9-]+\)\)/g, "")
      // The drawn device's line and flag, with what an older theme falls back to: no line.
      .replace(/var\(--echo-[a-z0-9-]+, (?:0px|0|transparent)\)/g, "")
      .replace(/var\(--echo-[a-z0-9-]+\)/g, "");
    assert.doesNotMatch(rest, /rgb|#|oklch|hsl|var\(/, `${name} has a colour that isn't the key light or a role`);
  }
});

test("a component that reads a shadow recipe falls back to exactly that recipe", () => {
  const offences: string[] = [];
  for (const [file, css] of [...componentStylesheets(), materialCss()]) {
    for (const { name, fallback } of recipeReads(code(css))) {
      if (!(name in SHADOW_RECIPES)) offences.push(`${file}: --echo-shadow-${name} is not a recipe`);
      else if (fallback === undefined) offences.push(`${file}: --echo-shadow-${name} has no fallback`);
      else if (flat(fallback) !== flat(shadowValue(name as ShadowName))) offences.push(`${file}: --echo-shadow-${name}'s fallback isn't the recipe`);
    }
  }
  assert.deepEqual(offences, [], "write var(--echo-shadow-<name>, <the recipe>) — see SHADOW_RECIPES");
});

test("a shadow that is a recipe says so", () => {
  const offences: string[] = [];
  for (const [file, css] of [...componentStylesheets(), materialCss()]) {
    for (const value of shadowDeclarations(css)) {
      const name = RECIPE_BY_VALUE.get(value);
      if (name) offences.push(`${file}: ${value.slice(0, 60)}… is --echo-shadow-${name}`);
    }
  }
  assert.deepEqual(offences, [], "read the recipe by name: var(--echo-shadow-<name>, <the recipe>)");
});

/**
 * CSS resolves the var()s inside a custom property where the property is
 * declared. So a rule that re-declares a role a recipe reads (Scope's
 * reflective screens re-declare the glow) has to declare the recipe again,
 * or everything under it keeps the page's version.
 */
test("a rule that re-declares a role a recipe reads declares the recipe again", () => {
  const offences: string[] = [];
  for (const [file, css] of componentStylesheets()) {
    for (const m of code(css).matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      const selector = m[1]!.trim().split("\n").pop()!.trim();
      const body = m[2]!;
      const declared = new Set([...body.matchAll(/(--echo-[a-z0-9-]+)\s*:/g)].map((d) => d[1]!));
      for (const name of Object.keys(SHADOW_RECIPES) as ShadowName[]) {
        const reads = [...shadowValue(name).matchAll(/var\((--echo-[a-z0-9-]+)[,)]/g)].map((r) => r[1]!);
        if (!reads.some((token) => declared.has(token))) continue;
        const own = new RegExp(`--echo-shadow-${name}\\s*:\\s*([^;]+);`).exec(body);
        if (!own) offences.push(`${file} ${selector}: re-declares ${reads.filter((t) => declared.has(t)).join(", ")} but not --echo-shadow-${name}`);
        else if (flat(own[1]!) !== flat(shadowValue(name))) offences.push(`${file} ${selector}: --echo-shadow-${name} isn't the recipe`);
      }
    }
  }
  assert.deepEqual(offences, [], "declare the recipe again, with its exact value, where its roles are re-declared");
});

/**
 * Scope sets its accent's roles inline (the accent family: `--echo-accent*`,
 * `--echo-primary-cap-*`, `--echo-lcd-glow`), so the rule above can't see
 * them. Its element's rule declares again every recipe that reads one.
 */
test("a Scope's own accent reaches the recipes that read the accent", () => {
  const scope = code(readFileSync(path.join(ROOT, "src/echo/scope/scope.css"), "utf8"));
  const body = /(?:^|\n)\.echo-scope\s*\{([^{}]*)\}/.exec(scope)?.[1] ?? "";
  const missing: string[] = [];
  for (const name of Object.keys(SHADOW_RECIPES) as ShadowName[]) {
    if (!/var\(--echo-(accent|primary-cap|lcd-glow)/.test(shadowValue(name))) continue;
    const own = new RegExp(`--echo-shadow-${name}\\s*:\\s*([^;]+);`).exec(body);
    if (!own || flat(own[1]!) !== flat(shadowValue(name))) missing.push(name);
  }
  assert.deepEqual(missing, [], ".echo-scope must declare these recipes again, with their exact values");
});

/**
 * The shadows that are neither a recipe nor moving with their part: depths a
 * component was tuned to by eye. They stay (the look doesn't change), but a
 * new component starts from a recipe: if this number has to go up, say why
 * in the commit.
 */
test("the number of hand-tuned shadows does not grow", () => {
  let tuned = 0;
  for (const [, css] of componentStylesheets()) {
    for (const value of shadowDeclarations(css)) {
      if (/^(none|inherit|initial|unset)$/.test(value) || value.startsWith("var(--echo-shadow-")) continue;
      // It moves with its part: it reads the part's own variable (`--press`, `--lift`) or the Scope's pillow.
      if (/var\(--(?!echo-)|var\(--echo-pillow\b/.test(value)) continue;
      tuned++;
    }
  }
  assert.ok(tuned <= TUNED_SHADOWS, `${tuned} hand-tuned shadows; there were ${TUNED_SHADOWS}. Start from a recipe (SHADOW_RECIPES).`);
});
/**
 * 113 when the recipes arrived. 114 with the drawn device: HardwareButton's bed
 * is the well recipe without its drawn line, because a drawn key stands on its
 * own ink edge instead of being drawn sitting in a recess.
 */
const TUNED_SHADOWS = 114;

/* -------------------------------------------------------------------- hover */

/**
 * A tap leaves the tapped element under `:hover` until the next tap
 * somewhere else, so on a phone a hover style stays on after the finger
 * lifts. A device that can't hover never gets one: every `:hover`
 * rule sits inside `@media (hover: hover)`. tests/hover.spec.ts taps.
 */
test("every hover style is inside @media (hover: hover)", () => {
  const offences: string[] = [];
  for (const [file, css] of componentStylesheets()) {
    const text = code(css);
    const open: string[] = [];
    let header = "";
    for (const ch of text) {
      if (ch === "{") {
        const block = header.trim();
        if (/:hover/.test(block) && !block.startsWith("@") && !open.some((h) => /^@media[^{]*\(hover:\s*hover\)/.test(h))) {
          offences.push(`${file} ${block.split("\n").pop()!.trim()}`);
        }
        open.push(block);
        header = "";
      } else if (ch === "}") {
        open.pop();
        header = "";
      } else if (ch === ";") {
        header = "";
      } else {
        header += ch;
      }
    }
  }
  assert.deepEqual(offences, [], "wrap it in @media (hover: hover), so a tap doesn't leave it on");
});

/* ----------------------------------------------------------- colour literals */

/**
 * Two hardcoded `#fff` — segmented.css and tabs.css. They passed at 4.34-5.10:1,
 * so this was cosmetic, but they are exactly the residue `createEchoTheme`
 * exists to eliminate and they would not follow a seed into a light chassis.
 *
 * The rgba() key-light alphas are exempt and stay exempt: they are the
 * single-key-light material model, not palette. That distinction is the
 * whole reason this rule can be narrow enough to be useful.
 */
test("no component CSS contains a literal hex colour", () => {
  const offences = scan(/(#[0-9a-fA-F]{3,8})\b/g, () => false);
  assert.deepEqual(offences, [], "use a role token — createEchoTheme exists to remove these");
});

/**
 * The rest of "no raw colors". The only literal colors allowed are the key
 * light itself: white alphas scaled by the finish (`--echo-gloss`), and the
 * shade scaled by it (`--echo-shade`) in the theme's shadow ink, whose
 * fallback is black: a black shade written as `rgb(0 0 0 / …)` would grey a
 * light body out, so it isn't one of them. Plus `black` mixed into a role to
 * deepen a well: directly (a backdrop, which is dark on any device), or as the
 * fallback of the theme's shade ink, which is black on a dark device and the
 * body's own seam on a light one, so a well is set in rather than smudged.
 * Anything else is palette, and palette comes from the seed.
 */
test("every literal colour in component CSS is the key light, scaled by the finish", () => {
  const rgb = scan(/(rgba?\([^)]*\)\)?\)?)/g, (value) => /^rgb\(255 255 255 \/ calc\([\d.]+ \* var\(--echo-gloss, 1\)\)\)$/.test(value));
  const named = scan(
    /(?<![\w-])(white|black|red|green|blue|gray|grey|silver|pink|orange|yellow|purple|magenta|cyan)(?![\w-])/g,
    (value, line) =>
      value === "black" &&
      (/color-mix\(in ok(?:lch|lab), var\(--echo-[a-z-]+\) \d+%, (?:black|var\(--echo-shade-ink, black\))\)/.test(line) ||
        /color-mix\(in oklab, var\(--echo-cast-ink, black\) calc\([\d.]+ \* var\(--echo-shade, 1\) \* 100%\), transparent\)/.test(line)),
  );
  assert.deepEqual([...rgb, ...named], [], "colour comes from the seed: use a role, or the gloss/shade key-light alphas");
});

/**
 * And the third way a colour gets in: naming a colour space directly.
 *
 * The two rules above catch `#1fa8a0` and `red`. Neither catches
 * `oklch(0.62 0.19 29)` — which is the form this library's own colour system
 * is written in, so it is the one a contributor is most likely to reach for.
 * A raw `oklch()` is invisible to `createEchoTheme`: it will not follow a
 * seed, it will not relight in a light chassis, and nothing was looking at it.
 *
 * `color-mix(in oklch, …)` (and `in oklab`, for greys) is the
 * sanctioned form and stays: it NAMES the space but takes its colours from
 * roles. The lookbehind is what separates them — `in oklch,` has no
 * parenthesis, `oklch(` does.
 */
test("no component CSS names a colour space directly", () => {
  const offences = scan(
    /(?<![\w-])(oklch|oklab|hwb|lch|lab|hsla|hsl)\(/g,
    () => false,
  );
  assert.deepEqual(
    offences,
    [],
    "a raw colour does not follow the seed — use a var(--echo-*) role, or color-mix() over one",
  );
});

/**
 * The space a colour is mixed in.
 *
 * A light device's plastic is a near-grey: chroma about 0.012. Chromium drops
 * the hue of any colour under 0.02 chroma when it mixes in oklch, and a mix
 * with no hue is drawn at hue 0, which is rose. So every well on a lilac body
 * was pink. oklab has no hue to drop, and between two greys it's the right
 * space anyway; oklch stays for mixes with an accent in them, whose hue is
 * the point.
 *
 * `--echo-lcd-glow` counts as a grey: on a light device it's the screen glass.
 */
const NEUTRAL_OPERAND =
  /^(transparent|black|white|var\(--echo-(text|text-dim|cap|cap-highlight|cap-shadow|well|surface|lcd|lcd-glow|seam|shade-ink|paper-stock|paper-ink|screen-[a-z-]+)\b.*)$/;

/** Every `color-mix(...)` in a stylesheet, with its space and operands. */
function colourMixes(css: string): { space: string; operands: string[]; text: string }[] {
  const found: { space: string; operands: string[]; text: string }[] = [];
  for (const m of css.matchAll(/color-mix\(in (\w+),/g)) {
    let depth = 0;
    let i = m.index! + "color-mix(".length;
    const start = i;
    for (; i < css.length; i++) {
      if (css[i] === "(") depth++;
      else if (css[i] === ")") {
        if (depth === 0) break;
        depth--;
      }
    }
    const parts: string[] = [];
    let part = "";
    depth = 0;
    for (const ch of css.slice(start, i)) {
      if (ch === "(") depth++;
      if (ch === ")") depth--;
      if (ch === "," && depth === 0) {
        parts.push(part.trim());
        part = "";
      } else part += ch;
    }
    parts.push(part.trim());
    const operands = parts.slice(1).map((p) => p.replace(/\s+(calc\(.*\)|[\d.]+%)$/, "").trim());
    found.push({ space: m[1]!, operands, text: flat(css.slice(m.index!, i + 1)) });
  }
  return found;
}

test("a mix of greys is made in oklab, where a near-grey keeps its hue", () => {
  const offences: string[] = [];
  for (const [file, css] of [...componentStylesheets(), materialCss()]) {
    for (const mix of colourMixes(code(css))) {
      if (mix.space === "oklch" && mix.operands.every((o) => NEUTRAL_OPERAND.test(o))) offences.push(`${file}: ${mix.text}`);
    }
  }
  assert.deepEqual(offences, [], "mix greys in oklab: in oklch, Chromium draws a near-grey's mix rose");
});

/* ---------------------------------------------------------------- direction */

/**
 * Logical properties, so right-to-left works (tests/rtl.spec.ts checks the
 * result in a browser). `padding-inline-start`, not `padding-left`.
 * Vertical properties stay physical: Echo has no vertical writing mode.
 *
 * Physical on purpose, and nothing else:
 * - `left: 50%` with a -50% translate centres, which is the same both ways;
 * - Sheet's `side="left" | "right"` is a physical prop by design;
 * - the Tabs indicator reads Base UI's `--active-tab-left`, a physical measure;
 * - the button glint is the key light, which stays at the top left.
 */
test("component CSS uses logical properties for the inline direction", () => {
  const PHYSICAL =
    /(?<![\w-])(left|right|margin-(?:left|right)|padding-(?:left|right)|border-(?:left|right)(?:-[a-z]+)?|border-(?:top|bottom)-(?:left|right)-radius|float|clear)\s*:\s*([^;]+);|text-align:\s*(left|right)/g;
  const offences: string[] = [];
  for (const [file, css] of componentStylesheets()) {
    for (const m of code(css).matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      const selector = m[1]!.trim().split("\n").pop()!.trim();
      if (/\[data-side="(left|right)"\]/.test(selector)) continue;
      for (const d of m[2]!.matchAll(PHYSICAL)) {
        const [decl, prop, value] = d;
        if (prop === "left" && value!.trim() === "50%") continue;
        if (selector === ".echo-tabs__indicator" && value!.includes("--active-tab-left")) continue;
        offences.push(`${file} ${selector} { ${decl.trim()} }`);
      }
      // Four-value shorthands whose left and right differ are physical too.
      for (const d of m[2]!.matchAll(/(?<![\w-])(margin|padding|inset):\s*([^;]+);/g)) {
        const parts = d[2]!.trim().split(/\s+(?![^(]*\))/);
        if (parts.length === 4 && parts[1] !== parts[3] && selector !== ".echo-hw__glint") {
          offences.push(`${file} ${selector} { ${d[0].trim()} }`);
        }
      }
      for (const d of m[2]!.matchAll(/(?<![\w-])border-radius:\s*([^;]+);/g)) {
        const p = d[1]!.trim().split(/\s+(?![^(]*\))/);
        const symmetric = p.length === 1 || (p.length === 2 && p[0] === p[1]) || (p.length === 4 && p[0] === p[1] && p[2] === p[3]);
        if (!symmetric) offences.push(`${file} ${selector} { ${d[0].trim()} }`);
      }
    }
  }
  assert.deepEqual(offences, [], "use the logical property (inset-inline-start, padding-inline-end, border-end-end-radius, text-align: start…)");
});

/* ------------------------------------------------------------ control height */

test("controls with a height land on the control scale", () => {
  const offences: string[] = [];
  /*
   * Coarse-pointer blocks are excluded: a 44px inside
   * `@media (pointer: coarse)` is a TARGET size, not a control
   * height. They are different vocabularies that happen to share a number,
   * and conflating them would force touch targets onto the control scale.
   */
  const withoutCoarse = (css: string): string =>
    css.replace(/@media\s*\(pointer:\s*coarse\)\s*\{(?:[^{}]|\{[^{}]*\})*\}/g, "");

  for (const [file, css] of componentStylesheets()) {
    withoutCoarse(code(css))
      .split("\n")
      .forEach((line) => {
        const m = line.match(/^\s*height:\s*(\d+)px/);
        if (!m) return;
        const px = Number(m[1]);
        // Only full-size control boxes are in scope; glyphs, tracks, pips and
        // rails are parts, not controls.
        if (px < 30) return;
        if (!/(field|select|number-field|slider|textarea)/.test(file)) return;
        offences.push(`${file} height: ${px}px`);
      });
  }
  assert.deepEqual(offences, [], "use var(--echo-control-*) — see CONTROL_HEIGHT");
});

test("the control height scale is exactly compact / default / large", () => {
  assert.deepEqual(Object.keys(CONTROL_HEIGHT), ["compact", "default", "large"]);
});

/* -------------------------------------------------------------- long content */

/**
 * Long content.
 *
 * Across 48 styled components, `text-overflow` appeared ONCE and
 * `overflow-wrap`/`word-break` zero times, against 8 `nowrap` declarations and
 * only 9 `min-width: 0`. One ellipsis and no word-breaking means long content
 * had no defined behaviour anywhere, and seven of those `nowrap`s would simply
 * push their container open.
 *
 * The rule: a component that pins text to one line has to say what happens
 * when the text does not fit. `nowrap` on its own is not an answer.
 */
test("every component that refuses to wrap says what it does instead", () => {
  const offences: string[] = [];
  for (const [file, css] of componentStylesheets()) {
    const body = code(css);
    // Rule-by-rule, so the answer has to be in the SAME rule as the nowrap.
    for (const m of body.matchAll(/([^{}]+)\{([^}]*white-space:\s*nowrap[^}]*)\}/g)) {
      const selector = m[1]!.trim().split("\n").pop()!.trim();
      const rule = m[2]!;
      // The visually-hidden idiom is 1px by construction; it has no long content.
      if (/position:\s*absolute/.test(rule) && /clip-path/.test(rule)) continue;
      // Truncation: the answer is "an ellipsis".
      if (/text-overflow:\s*ellipsis/.test(rule)) continue;
      // "It never shrinks": legitimate for a fixed short string like a
      // wordmark, where wrapping to two lines is the bug and there is no long
      // content to handle in the first place.
      if (/flex-shrink:\s*0/.test(rule)) continue;
      /*
       * "Its container scrolls." Checked per FILE rather than per rule,
       * because the scroll region is an ancestor — the Table's header cells
       * sit inside `.echo-table__scroll`. That is looser than the rest of this
       * test on purpose: requiring the answer in the same rule would force
       * every cell in a scrolling table to repeat it.
       */
      if (/overflow(-x)?:\s*(auto|scroll)/.test(body)) continue;
      offences.push(`${file} ${selector}`);
    }
  }
  assert.deepEqual(
    offences,
    [],
    "these pin text to one line without saying what happens when it does not fit",
  );
});

/**
 * The other half, and the one that is easy to forget: a flex or grid child
 * floors at its own min-content width unless told otherwise, so truncation
 * that looks correct in CSS never gets a chance to apply.
 */
test("the library actually uses min-width: 0 where shrinking matters", () => {
  let count = 0;
  for (const [, css] of componentStylesheets()) {
    count += [...code(css).matchAll(/min-width:\s*0/g)].length;
  }
  assert.ok(count >= 20, `only ${count} min-width: 0 declarations; there were 9 before the long-content pass`);
});
