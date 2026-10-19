import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { APCA_FLOOR, apcaContrast, createEchoTheme, type EchoSeedInput } from "echo-ui-core/theme";

/**
 * An option that isn't chosen is still a word someone reads to choose
 * it. It was the text at 53% opacity over the well: 5.8:1 by WCAG 2, and APCA
 * Lc 38 on a near-black body, which the page check said on the travel test.
 */
const HERE = path.dirname(fileURLToPath(import.meta.url));
const css = readFileSync(path.join(HERE, "segmented.css"), "utf8");

/** The colour an option's label is drawn in when it isn't chosen, as the CSS writes it. */
const unchosen = /\.echo-segmented__option \{[^}]*?\n\s*color: ([^;]+);/.exec(css)?.[1]?.trim();

/** That colour on a theme: a role, or a role mixed toward transparent over the well it sits on. */
function resolve(value: string, roles: Record<string, string>): string {
  const role = /^var\(--echo-([a-z-]+)\)$/.exec(value);
  if (role) return roles[role[1]!]!;
  const mix = /^color-mix\(in oklab, var\(--echo-([a-z-]+)\) (\d+)%, transparent\)$/.exec(value);
  assert.ok(mix, `an unchosen label this test can't read: ${value}`);
  const over = (a: string, b: string, t: number) =>
    `#${[1, 3, 5].map((i) => Math.round(parseInt(a.slice(i, i + 2), 16) * t + parseInt(b.slice(i, i + 2), 16) * (1 - t)).toString(16).padStart(2, "0")).join("")}`;
  return over(roles[mix[1]!]!, roles.well!, Number(mix[2]) / 100);
}

const SEEDS: Record<string, EchoSeedInput> = {
  "Echo's own": {},
  "near-black body": { accent: "#0A33E3", chassis: "#030529", paper: "#FCFCFC" },
  "light device": { chassis: "#EBEBEB", paper: "#1D1D1D", accent: "#0594F9" },
};

test("an option that isn't chosen is a label people can read, on every body", () => {
  assert.ok(unchosen, "the unchosen label's colour");
  for (const [name, seed] of Object.entries(SEEDS)) {
    const roles = createEchoTheme(seed, { quiet: true }).values.roles as Record<string, string>;
    const label = resolve(unchosen!, roles);
    const lc = apcaContrast(label, roles.well!);
    assert.ok(lc >= APCA_FLOOR, `${name}: ${label} on the well ${roles.well}, APCA Lc ${lc.toFixed(1)}`);
  }
});
