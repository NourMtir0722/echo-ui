/**
 * Whether a page kept the look its project wears: the device (a light page
 * for a light style, a dark one for a dark) and the type (its text set in the
 * style's families, and the web fonts it names actually loaded).
 *
 * What the project wears is read from its own echo.json, as `init` or
 * `style use` left it, so the same scoring serves Echo's default look and any
 * style. Colour is left to the counts: a literal colour in the agent's lines
 * is already a finding, and a colour Echo mixed from the theme isn't one.
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Page } from "@playwright/test";

import { devicePolarity } from "../../../packages/core/src/theme/create-echo-theme";
import { SEED_DEFAULTS } from "../../../packages/core/src/theme/seed";

type Device = "light" | "dark";

/** What a project wears, from its echo.json. */
export interface WornLook {
  /** The style's name, or null for a project wearing only a seed. */
  style: string | null;
  device: Device;
  /** Its type roles' families, as the page's text is compared: a system stack is one family. */
  families: string[];
  /** Of those, the web fonts: the page has to load them. */
  webFonts: string[];
}

const SYSTEM: Record<string, string> = Object.fromEntries([
  ...["ui-sans-serif", "system-ui", "-apple-system", "blinkmacsystemfont", "segoe ui", "sans-serif"].map((f) => [f, "system"]),
  ...["ui-monospace", "sfmono-regular", "sf mono", "menlo", "consolas", "monospace"].map((f) => [f, "system mono"]),
  // The browser's own default, which text gets when nothing sets a family.
  ...["ui-serif", "serif", "times", "times new roman"].map((f) => [f, "system serif"]),
]);

/**
 * A family as the page names it, the way it's compared: unquoted; a system
 * stack as one family; and a family next/font renamed (`__Inter_Tight_5a0f1f`,
 * or its fallback twin) back to its own name.
 */
export function familyKey(family: string): string {
  const name = family.trim().replace(/^["']|["']$/g, "");
  const renamed = /^__(.+?)(?:_Fallback)?_[0-9a-f]{5,8}$/i.exec(name);
  const plain = (renamed ? renamed[1]!.replace(/_/g, " ") : name).replace(/ Fallback$/, "");
  return SYSTEM[plain.toLowerCase()] ?? plain;
}

/** The first family of a `font-family` value. */
export const firstFamily = (stack: string) => familyKey(stack.split(",")[0] ?? "");

/** What the project at `app` wears, or null for an app that isn't Echo's. */
export async function wornLook(app: string): Promise<WornLook | null> {
  let config: { seed?: Record<string, unknown>; style?: { name?: string } };
  try {
    config = JSON.parse(await readFile(join(app, "echo.json"), "utf8"));
  } catch {
    return null;
  }
  const seed = { ...SEED_DEFAULTS, ...config.seed } as typeof SEED_DEFAULTS;
  const families = [...new Set([seed.fontSans, seed.fontMachine, seed.fontMono, seed.fontLcd].map(firstFamily))];
  return {
    style: config.style?.name ?? null,
    device: devicePolarity(seed.chassis),
    families,
    webFonts: families.filter((f) => !Object.values(SYSTEM).includes(f)),
  };
}

/** What the page showed, read in the browser. */
export interface LookReading {
  /** The colour each point of a grid over the first screen stands on, as `rgb(r, g, b)`. */
  ground: string[];
  /** Visible characters of text, by the first family their element asks for. */
  text: Record<string, number>;
  /** Every family the page has a loaded web font for, as `document.fonts` names it. */
  loaded: string[];
}

/** The browser half, read once: a plain script, sent to the page as written. */
let script: Promise<string> | undefined;

/** Reads the page as it stands. */
export async function readLook(page: Page): Promise<LookReading> {
  script ??= readFile(new URL("./read-look.browser.js", import.meta.url), "utf8");
  return (await page.evaluate(await script)) as LookReading;
}

/** How the page measured against the look. */
export interface LookScore {
  device: {
    wanted: Device;
    /** The colour most of the first screen stands on. */
    ground: string;
    got: Device;
    held: boolean;
  };
  /** The share of the page's visible text set in the look's families, or null for a page with no text. */
  typeShare: number | null;
  /** The look's web fonts the page never loaded. */
  fontsMissing: string[];
}

/** `rgb(r, g, b)` as `#rrggbb`. */
const hex = (rgb: string) =>
  `#${(rgb.match(/\d+(?:\.\d+)?/g) ?? ["0", "0", "0"])
    .slice(0, 3)
    .map((n) => Math.round(Number(n)).toString(16).padStart(2, "0"))
    .join("")}`;

export function judgeLook(worn: WornLook, reading: LookReading): LookScore {
  const counts = new Map<string, number>();
  for (const c of reading.ground) counts.set(c, (counts.get(c) ?? 0) + 1);
  const ground = [...counts].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "rgb(255, 255, 255)";
  // The device is the one most of the screen reads as, not only the commonest colour.
  const light = reading.ground.filter((c) => devicePolarity(hex(c)) === "light").length;
  const got: Device = light * 2 > reading.ground.length ? "light" : "dark";

  let total = 0;
  let inLook = 0;
  for (const [family, chars] of Object.entries(reading.text)) {
    total += chars;
    if (worn.families.includes(familyKey(family))) inLook += chars;
  }
  const loaded = new Set(reading.loaded.map(familyKey));
  return {
    device: { wanted: worn.device, ground: hex(ground), got, held: got === worn.device },
    typeShare: total ? inLook / total : null,
    fontsMissing: worn.webFonts.filter((f) => !loaded.has(f)),
  };
}
