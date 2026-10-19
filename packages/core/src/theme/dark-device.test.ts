/**
 * The dark device, pinned.
 *
 * The light device gets its own ladder, its own primary label, and lit light
 * split from lit text. None of that may reach the dark device: every role it
 * emitted before the light device was redrawn (2026-09-28) is recorded in
 * dark-device.fixture.json, and a dark seed has to make exactly those values
 * again. The roles added since equal what they stand for on a dark device.
 *
 * Two changes since, on purpose (2026-09-29): a near-black body steps its caps
 * further, so the "dark chassis" seed's cap and rim moved; and lit
 * text is the glow lifted to read at APCA Lc 60, not the glow itself
 *. Every other pinned value is as it was.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { createEchoTheme } from "./create-echo-theme";
import { hexToOklch } from "./oklch";
import type { EchoSeedInput } from "./seed";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = JSON.parse(readFileSync(path.join(HERE, "dark-device.fixture.json"), "utf8")) as Record<
  string,
  { seed: EchoSeedInput; roles: Record<string, string> }
>;

for (const [name, { seed, roles }] of Object.entries(FIXTURE)) {
  test(`a dark device makes the theme it always did: ${name}`, () => {
    const now = createEchoTheme(seed, { quiet: true }).values.roles as Record<string, string>;
    for (const [role, value] of Object.entries(roles)) assert.equal(now[role], value, role);
  });

  test(`on a dark device the newer roles are the ones they stand for: ${name}`, () => {
    const r = createEchoTheme(seed, { quiet: true }).values.roles;
    // Lit text is the glow lifted, same hue, until a small label reads at APCA Lc 60.
    const ink = hexToOklch(r["accent-ink"]);
    const glow = hexToOklch(r["accent-glow"]);
    assert.ok(ink.L >= glow.L, "lit text is the glow or lighter");
    assert.ok(Math.abs(((ink.H - glow.H + 540) % 360) - 180) < 12 || glow.C < 0.02, "in the glow's hue");
    assert.equal(r["primary-cap-ink"], r.text, "the primary cap's label is the text");
    assert.deepEqual([r["pour-top"], r["pour-mid"], r["pour-base"]], [r["primary-cap-top"], r["primary-cap-mid"], r["primary-cap-base"]], "the pour is the primary cap");
  });
}
