/**
 * The slop police: the combinations that read as AI-made, as data.
 *
 * Slop is a choice nobody made: the model's average, filling a gap. Every
 * source that catalogues it agrees on that, and on one more thing: the known
 * slop is almost always a combination. A cream ground is fine, a serif is
 * fine, terracotta is fine; the three together are the most recognised
 * "tasteful" AI look. So the police bans pairings, plus a short list of
 * things banned anywhere, and a builder can keep a banned pairing only by
 * saying so (a style's `keeps`, with their reason). An agent never keeps one
 * on its own.
 *
 * Two halves read this file. `policeStyle` checks a style's own ingredients
 * (its seed and fonts), measured in OKLCH ranges and font kinds, so a program
 * decides, not a model: `style check`, `style use` and `style fit` run it.
 * `CODE_TELLS` names what `check` looks for in the code an agent writes
 * (check/slop.ts does the looking).
 *
 * Slop moves: each fix becomes the next default. The chart is dated, and its
 * sources are named so it can be checked against them again.
 *
 * Sources: Anthropic's `frontend-design` skill (its five clusters);
 * avoid-ai-design by funboy322 (MIT, the tell catalogue); taste-skill by
 * Leonxlnx (MIT, the premium palette families); Hallmark by Nutlope (MIT);
 * Impeccable by Paul Bakaus (Apache-2.0); Adrian Krebs's study of 1,590 Show
 * HN sites; the vibecoded-design-tells ranking of 3.2M Reddit posts.
 */
import { hexToOklch } from "echo-ui-core/theme";

import type { EchoStyle } from "./style-schema";

/** When the chart was last checked against its sources. */
export const CHART_DATE = "2026-09-29";

/* ------------------------------------------------------------ ingredients */

type Oklch = ReturnType<typeof hexToOklch>;

const inHue = (h: number, from: number, to: number) => (from <= to ? h >= from && h <= to : h >= from || h <= to);

/** Colour families, as OKLCH ranges measured on the sources' own examples. */
const COLOUR = {
  /** Warm parchment and cream: #F4F1EA, #EFEAE0, #E8DFCB. */
  cream: (c: Oklch) => c.L >= 0.88 && c.C >= 0.007 && c.C <= 0.05 && inHue(c.H, 50, 110),
  /** Pale and warm, cream to blush: the light half of the premium palette. */
  paleWarm: (c: Oklch) => c.L >= 0.85 && c.C >= 0.007 && c.C <= 0.06 && inHue(c.H, 15, 110),
  /** Terracotta, clay, rust, orange: #D97757, #B6553A, #F97316. */
  terracotta: (c: Oklch) => c.L >= 0.5 && c.L <= 0.8 && c.C >= 0.1 && inHue(c.H, 25, 60),
  /** Brass, gold, ochre: #B08947, #C7AC5E. */
  brass: (c: Oklch) => c.L >= 0.5 && c.L <= 0.82 && c.C >= 0.06 && c.C <= 0.16 && inHue(c.H, 65, 100),
  /** Oxblood and wine: #9A2436, #4B1B2B. */
  oxblood: (c: Oklch) => c.L >= 0.2 && c.L <= 0.5 && c.C >= 0.06 && inHue(c.H, 345, 25),
  /** Near-black, tinted or not: #0B0B0B, #111. */
  nearBlack: (c: Oklch) => c.L <= 0.24 && c.C <= 0.04,
  /** One acid signal: lime and acid green, or vermilion. */
  acid: (c: Oklch) => c.C >= 0.15 && ((inHue(c.H, 100, 150) && c.L >= 0.7) || (inHue(c.H, 20, 35) && c.L >= 0.55 && c.L <= 0.7 && c.C >= 0.18)),
  /** Tailwind's blue-600 through purple-600: the colour a model reaches for when nobody chose one. */
  aiViolet: (c: Oklch) => c.C >= 0.13 && c.L >= 0.35 && c.L <= 0.75 && inHue(c.H, 255, 310),
  /** White and near-white. */
  white: (c: Oklch) => c.L >= 0.9,
  /** A grey in the middle: neither a light device nor a dark one. */
  midGrey: (c: Oklch) => c.L >= 0.45 && c.L <= 0.8 && c.C <= 0.03,
};

/** The first family in a font stack, unquoted and lower case: `"Inter", system-ui` → `inter`. */
export function firstFamily(stack: string | undefined): string | undefined {
  const first = stack?.split(",")[0]?.trim().replace(/^["']|["']$/g, "").toLowerCase();
  return first || undefined;
}

/** The faces every tool and starter defaults to. */
const PLAIN = new Set([
  "inter", "inter tight", "roboto", "arial", "helvetica", "helvetica neue", "system-ui", "-apple-system", "blinkmacsystemfont",
  "segoe ui", "open sans", "lato", "geist", "sans-serif", "ui-sans-serif",
]);
/** The free faces that became the default "designed" choice (avoid-ai-design; Anthropic names Space Grotesk). */
const TASTEFUL = new Set(["space grotesk", "geist", "syne", "sora", "instrument serif", "fraunces", "cal sans"]);
const SERIFS = new Set(["georgia", "times", "times new roman", "garamond", "baskerville", "didot", "bodoni moda", "playfair display", "lora", "merriweather", "cormorant", "newsreader", "literata", "spectral", "fraunces"]);

export type FontKind = "plain" | "tasteful" | "serif" | "mono" | "other";

/** Whether a stack's first face is a serif, whatever else it is (Instrument Serif is also one of the "tasteful" set). */
export function isSerif(stack: string | undefined): boolean {
  const family = firstFamily(stack);
  return !!family && (SERIFS.has(family) || family === "serif" || (/serif/.test(family) && !/sans/.test(family)) || /garamond|caslon|baskerville/.test(family));
}

export function fontKind(stack: string | undefined): FontKind | undefined {
  const family = firstFamily(stack);
  if (!family) return undefined;
  if (/mono|code|courier|consolas|menlo|monaco/.test(family)) return "mono";
  if (TASTEFUL.has(family)) return "tasteful";
  if (PLAIN.has(family)) return "plain";
  if (isSerif(stack)) return "serif";
  return "other";
}

/** A style's ingredients, as the chart reads them. */
interface Ingredients {
  chassis?: { hex: string; c: Oklch };
  paper?: { hex: string; c: Oklch };
  accent?: { hex: string; c: Oklch };
  sans?: string;
  machine?: string;
}

function ingredients(style: EchoStyle): Ingredients {
  const colour = (hex: string | undefined) => (hex ? { hex, c: hexToOklch(hex) } : undefined);
  return { chassis: colour(style.seed.chassis), paper: colour(style.seed.paper), accent: colour(style.seed.accent), sans: style.seed.fontSans, machine: style.seed.fontMachine };
}

const family = (stack: string | undefined) => stack?.split(",")[0]?.trim().replace(/^["']|["']$/g, "");

/* ---------------------------------------------------------------- the chart */

export interface Pairing {
  id: string;
  /** The combination, as people say it. */
  name: string;
  /** Why it reads as AI-made, with what to change. */
  why: string;
  source: string;
  /** Echo's own tells, from its own audits, are ranked first; then those the sources name. */
  from: "echo" | "sources";
  /** The ingredients that make the combination, in words, or undefined when the style doesn't have it. */
  find(i: Ingredients): string[] | undefined;
}

export const PAIRINGS: readonly Pairing[] = [
  {
    id: "mid-grey-ground",
    name: "A mid-grey ground",
    why: "A ground in the middle reads as neither a light device nor a dark one: the page has no value structure. Move the chassis toward light or toward dark.",
    source: "Echo's own review of light devices",
    from: "echo",
    find: (i) => (i.chassis && COLOUR.midGrey(i.chassis.c) ? [`the chassis ${i.chassis.hex} is a mid grey`] : undefined),
  },
  {
    id: "cream-terracotta",
    name: "Cream with terracotta or orange",
    why: "A warm cream ground with a terracotta, clay or orange accent is the most recognised \"tasteful\" AI look (with a high-contrast serif it's the whole cluster, and #D97757 is Claude's own interface accent). Change one of them: an accent from another hue family, or a ground that isn't parchment.",
    source: "Anthropic, frontend-design (its first cluster); avoid-ai-design, the cream and terracotta look",
    from: "sources",
    find: (i) =>
      i.chassis && i.accent && COLOUR.cream(i.chassis.c) && COLOUR.terracotta(i.accent.c)
        ? [`the chassis ${i.chassis.hex} is a warm cream`, `the accent ${i.accent.hex} is terracotta or orange`, ...(isSerif(i.sans) || isSerif(i.machine) ? ["with a serif"] : [])]
        : undefined,
  },
  {
    id: "night-acid",
    name: "Near-black with one acid colour",
    why: "A near-black ground carrying a single acid green, lime or vermilion is the dark twin of the cream look: \"technical and confident\" by default. Go dark only when the product earns it, and choose the signal for what it means, not for voltage.",
    source: "Anthropic, frontend-design (its second cluster); avoid-ai-design, near-black with one acid accent",
    from: "sources",
    find: (i) =>
      i.chassis && i.accent && COLOUR.nearBlack(i.chassis.c) && COLOUR.acid(i.accent.c)
        ? [`the chassis ${i.chassis.hex} is near-black`, `the accent ${i.accent.hex} is an acid colour`]
        : undefined,
  },
  {
    id: "premium-heritage",
    name: "Cream, brass or oxblood, and a serif",
    why: "Warm cream with brass, gold, clay or oxblood and a serif is the palette a model gives anything \"premium\", \"artisan\" or \"heritage\". Keep it only if the board really is this; otherwise move one of the three.",
    source: "taste-skill, the premium-consumer palette ban; Anthropic, frontend-design (its first cluster)",
    from: "sources",
    find: (i) => {
      const pale = [i.chassis, i.paper].find((x) => x && COLOUR.paleWarm(x.c));
      const rich = [i.chassis, i.accent].find((x) => x && (COLOUR.brass(x.c) || COLOUR.oxblood(x.c) || COLOUR.terracotta(x.c)));
      const serif = [i.sans, i.machine].find((f) => isSerif(f));
      return pale && rich && serif ? [`${pale.hex} is a warm cream`, `${rich.hex} is brass, oxblood or clay`, `${family(serif)} is a serif`] : undefined;
    },
  },
  {
    id: "indigo-on-white",
    name: "Indigo or violet on white, in a stock sans",
    why: "An indigo-to-purple accent on a white ground in Inter or the system font is the first AI look there was: it traces to Tailwind's indigo-500 demos. Change one of the three: a colour from the product's own world, a ground that isn't white, or a face with a voice.",
    source: "avoid-ai-design, the indigo gradient, violet buttons and Inter for everything; the Reddit ranking puts the AI purple second",
    from: "sources",
    find: (i) => {
      if (!(i.accent && i.chassis && COLOUR.aiViolet(i.accent.c) && COLOUR.white(i.chassis.c))) return undefined;
      const kind = fontKind(i.sans);
      if (kind !== undefined && kind !== "plain" && kind !== "tasteful") return undefined;
      return [`the accent ${i.accent.hex} is in the indigo and violet band`, `the chassis ${i.chassis.hex} is white`, i.sans ? `${family(i.sans)} is a stock sans` : "no typeface is named, so it's the system font"];
    },
  },
  {
    id: "stock-face-alone",
    name: "One stock face, for everything",
    why: "Inter, the system font or one of the \"tasteful\" free faces (Space Grotesk, Geist, Syne, Sora, Instrument Serif, Fraunces) in every role, with nothing beside it, means no type decision was made. Pair it with a second face that differs clearly (a mono for data, a display face for headings), or choose one with a voice.",
    source: "avoid-ai-design, Inter for everything and the tasteful free fonts; Hallmark, \"Inter-everywhere\"",
    from: "sources",
    find: (i) => {
      const kind = fontKind(i.sans);
      if (!i.sans || (kind !== "plain" && kind !== "tasteful")) return undefined;
      if (i.machine && firstFamily(i.machine) !== firstFamily(i.sans)) return undefined;
      return [`${family(i.sans)} is the only face`];
    },
  },
];

/* -------------------------------------------------------------- in the code */

export interface CodeTell {
  id: string;
  name: string;
  /** What to do instead, for the agent that will fix it. */
  fix: string;
  source: string;
  /** The floor is never kept: fake content is wrong whatever the style. */
  floor?: boolean;
}

/** What `check`'s `slop` rule looks for in the code an agent writes around Echo's parts. */
export const CODE_TELLS: readonly CodeTell[] = [
  {
    id: "placeholder",
    name: "a stand-in where real content belongs",
    fix: "Use the real name, photo or text, or mark it plainly as sample data. Jane Doe, Acme and avatar services read as \"nothing real here yet\".",
    source: "avoid-ai-design, placeholder identities and media; Hallmark, placeholder names",
    floor: true,
  },
  {
    id: "gradient-text",
    name: "gradient text",
    fix: "Set headings in solid ink or the accent. Emphasis comes from size, weight and the line break, not a gradient fill.",
    source: "avoid-ai-design, gradient headline text; Hallmark, the gradient headline",
  },
  {
    id: "emoji-icon",
    name: "an emoji as an icon",
    fix: "Use one icon set chosen for the style, a mark of your own, or no icon. Emoji render differently on every device and break the icons' stroke.",
    source: "avoid-ai-design, emoji as icons; Hallmark, generic emoji as feature icon",
  },
  {
    id: "ai-sparkle",
    name: "the sparkle for \"AI\"",
    fix: "Show what the AI does (the thing it recommends, the answer it gives) instead of the most worn badge there is.",
    source: "avoid-ai-design, the overused icon set; Sailop, the icon fingerprint",
  },
  {
    id: "generic-cta",
    name: "a label that doesn't say what happens",
    fix: "Name the action and its object: \"Search flights\", \"Save changes\", \"Start a trip\". Keep the same verb through the flow.",
    source: "Anthropic, frontend-design, on writing; avoid-ai-design, generic CTA labels",
  },
  {
    id: "arrow-label",
    name: "an arrow glyph stapled to a label",
    fix: "Drop the glyph. If direction matters, use an icon component sized to the text.",
    source: "avoid-ai-design, arrow glyphs stapled to text; Anthropic, template chrome",
  },
  {
    id: "vague-copy",
    name: "a headline that could front any product",
    fix: "Say what this product does, for whom, in its own words. Specificity is the opposite of slop.",
    source: "avoid-ai-design, vague headlines and superlatives; 925studios, weightless headlines",
  },
  {
    id: "side-stripe",
    name: "a coloured stripe down one edge",
    fix: "Separate with Echo's seam or a Panel, or let position and weight carry emphasis. The stripe is \"almost as reliable a sign of AI design as the em-dash\".",
    source: "Krebs, design slop study; avoid-ai-design, border-accent cards; Hallmark, the side-stripe card",
  },
  {
    id: "spaced-caps",
    name: "hand-made spaced capitals",
    fix: "Most headings need no label above them. Where Echo prints a machine label, that's the device's voice; anywhere else, give the label information (a count, a date) in sentence case, or drop it.",
    source: "Anthropic, frontend-design, template chrome; avoid-ai-design, reflexive all-caps labels",
  },
  {
    id: "dot-string",
    name: "an A · B · C string",
    fix: "Put each item where it belongs (a line, a column, a label), or keep the one that matters.",
    source: "Anthropic, frontend-design, template chrome; avoid-ai-design, middle-dot meta strings",
  },
];

/** Numbers that look invented: said as notes, since a real one is fine. */
export const INVENTED_NUMBER = "a number that may be invented";

/** Every rule a style's `keeps` may name: the pairings, and the code tells above the floor. */
export const KEEPABLE: readonly string[] = [...PAIRINGS.map((p) => p.id), ...CODE_TELLS.filter((t) => !t.floor).map((t) => t.id)];
/** The floor: named here so a keep that tries one is told why it can't. */
export const FLOOR: readonly string[] = CODE_TELLS.filter((t) => t.floor).map((t) => t.id);

/* ------------------------------------------------------- the style's report */

export interface PoliceFinding {
  id: string;
  name: string;
  why: string;
  source: string;
  from: Pairing["from"];
  ingredients: string[];
}

export interface PoliceReport {
  /** Banned pairings the builder hasn't kept: the style can't be worn until they're kept or changed. */
  banned: PoliceFinding[];
  /** Banned pairings the builder kept, with their reason. */
  kept: (PoliceFinding & { reason: string })[];
}

/** A style's banned pairings, Echo's own tells first, and the ones its builder kept. */
export function policeStyle(style: EchoStyle): PoliceReport {
  const found = ingredients(style);
  const keeps = new Map((style.keeps ?? []).map((k) => [k.rule, k.reason]));
  const report: PoliceReport = { banned: [], kept: [] };
  const ordered = [...PAIRINGS.filter((p) => p.from === "echo"), ...PAIRINGS.filter((p) => p.from !== "echo")];
  for (const pairing of ordered) {
    const hit = pairing.find(found);
    if (!hit) continue;
    const finding: PoliceFinding = { id: pairing.id, name: pairing.name, why: pairing.why, source: pairing.source, from: pairing.from, ingredients: hit };
    const reason = keeps.get(pairing.id);
    if (reason !== undefined) report.kept.push({ ...finding, reason });
    else report.banned.push(finding);
  }
  return report;
}

/** What the builder is asked, in one wording: the agent asks, and never keeps a ban on its own. */
export function policeQuestion(finding: PoliceFinding): string {
  return `The slop police stops ${finding.name.toLowerCase()} (${finding.ingredients.join(", ")}). Keep it (you give the reason, and it's recorded in the style's \`keeps\`), or change one of them?`;
}
