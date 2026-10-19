/**
 * The slop police in the code an agent writes around Echo's parts
 * (the chart is registry/src/agent/slop.ts).
 *
 * Echo's closed components already rule out most component tells: no class
 * names, so no rounded-2xl shadow-lg, no gradient, no glow on an Echo part.
 * What's left is what the agent writes itself: copy, icons, imagery, the
 * app's own CSS. Each finding says what to do instead. A tell the builder
 * kept (the style's `keeps`, in echo.json) isn't flagged; the floor
 * (placeholder content) always is. Numbers that look invented are notes: a
 * real one is fine, and only the builder knows which it is.
 */
import { CODE_TELLS, INVENTED_NUMBER, type CodeTell } from "../slop";

import type { CssFile } from "./css";
import type { CheckProject } from "./model";
import type { Finding, FileResult } from "./rules";
import type { JsxElement, TsxFile } from "./tsx";

const TELL = new Map(CODE_TELLS.map((t) => [t.id, t]));

function message(tell: CodeTell): string {
  return `Slop police, ${tell.name}: ${tell.fix}${tell.floor ? "" : " (If the style chose it on purpose, only the builder can keep it: ask them.)"}`;
}

/** Whether the project's style keeps a tell. The floor is never kept. */
const kept = (project: CheckProject, id: string) => !TELL.get(id)?.floor && (project.keeps?.has(id) ?? false);

/* ---------------------------------------------------------------- patterns */

/** An emoji, minus the three marks that are typography: ©, ® and ™. */
const EMOJI = /(?![©®™])\p{Extended_Pictographic}/u;
const SPARKLE_GLYPH = /[✦✧✨]/;
/** Icons named for the sparkle, from any icon set. */
const SPARKLE_ICON = /sparkle|wandsparkles|magicwand|^(Bs|Hi|Io|Ri|Tb|Pi|Lu)?Stars?(Icon|Fill|Line)?$/i;
const ICON_PACKAGE = /^(lucide-react|lucide|@phosphor-icons\/|phosphor-react|@heroicons\/|@tabler\/icons|react-icons\/|@radix-ui\/react-icons|iconoir-react|@hugeicons\/|react-feather)/;
const GENERIC_LABEL = /^(get started|get started free|learn more|read more|submit|click here|start now|try it now|try it free|sign up now|explore|discover more)$/i;
const ARROW_END = /\s*(→|->|↗|»|›|⟶)\s*$/;
const VAGUE = /\b(elevate|unleash|supercharge|revolutioni[sz]e|seamless(?:ly)?|next[- ]gen(?:eration)?|cutting[- ]edge|best[- ]in[- ]class|all[- ]in[- ]one|game[- ]chang(?:er|ing)|empower(?:s|ing)? your|transform your|streamline your|the future of)\b/i;
const PLACEHOLDER_TEXT = /\b(?:john|jane)\s+(?:doe|smith)\b|\bacme(?:\s+(?:inc|corp|co)\.?)?\b|lorem ipsum/i;
const PLACEHOLDER_MEDIA = /pravatar\.cc|dicebear|randomuser\.me|ui-avatars\.com|placehold\.co|placeholder\.com|placekitten|picsum\.photos|loremflickr/i;
/** Two middle dots or more between words: "Flights · Hotels · Packages", or phrases, "140+ routes · 4.9/5 · …". */
const DOT_STRING = /\S\s+·\s+[^·]*\S\s+·\s+\S/;
/** "10× faster", "99.9%", "10,000+", "50k+", "4.9/5": the shapes invented proof takes. */
const INVENTED = /\b\d+(?:\.\d+)?\s?[x×]\s+(?:faster|more|better|cheaper|quicker)\b|\b99\.9+\s?%|\b\d{1,3}(?:,\d{3})+\+|\b\d+(?:\.\d+)?[kKmM]\+|\b[1-5]\.\d\s?\/\s?5\b/;

const isHeading = (el: JsxElement) => /^h[1-6]$/.test(el.tag) || /(Heading|Title|Headline)$/.test(el.tag);
const isAction = (el: JsxElement) => el.tag === "button" || el.tag === "a" || /(Button|Link)$/.test(el.tag);

/** A length in a border value, in px: `4px solid …` → 4. */
function borderWidth(value: string): number | undefined {
  const m = /(\d*\.?\d+)(px|rem|em)?\b/.exec(value);
  if (!m) return undefined;
  const n = parseFloat(m[1]!);
  return m[2] === "rem" || m[2] === "em" ? n * 16 : n;
}
/** Letter-spacing wide enough to read as tracked-out: 0.05em, or 1px at label sizes. */
function tracked(value: string): boolean {
  const m = /(-?\d*\.?\d+)(em|rem|px)?/.exec(value);
  if (!m) return false;
  const n = parseFloat(m[1]!);
  return m[2] === "px" ? n >= 1 : n >= 0.05;
}

const TW_GRADIENT_TEXT = /(?:^|\s)bg-clip-text(?=\s|$)/;
const TW_STRIPE = /(?:^|\s)border-(?:l|s)-(?:[3-8]|\[\d+px\])(?=\s|$)/;
const TW_SPACED_CAPS = (classes: string) => /(?:^|\s)uppercase(?=\s|$)/.test(classes) && /(?:^|\s)tracking-(?:wide|wider|widest|\[[^\]]+\])(?=\s|$)/.test(classes);

/* -------------------------------------------------------------------- TSX */

export function slopRules(file: string, tsx: TsxFile, project: CheckProject, result: FileResult) {
  const push = (id: string, at: { line: number; column: number }) => {
    if (kept(project, id)) return;
    result.findings.push({ rule: "slop", file, line: at.line, column: at.column, message: message(TELL.get(id)!) });
  };

  for (const [local, { from, imported, line }] of tsx.imports) {
    if (ICON_PACKAGE.test(from) && SPARKLE_ICON.test(imported === "default" ? local : imported)) push("ai-sparkle", { line: line ?? 1, column: 1 });
  }

  for (const el of tsx.elements) {
    for (const a of el.attrs) {
      if (a.value.kind === "string" && PLACEHOLDER_MEDIA.test(a.value.text)) push("placeholder", a);
    }
    const text = el.text;
    if (!text) continue;
    if (PLACEHOLDER_TEXT.test(text)) push("placeholder", el);
    if (SPARKLE_GLYPH.test(text)) push("ai-sparkle", el);
    else if (text.length <= 40 && (EMOJI.test([...text][0] ?? "") || EMOJI.test([...text].at(-1) ?? ""))) push("emoji-icon", el);
    if (isAction(el)) {
      const label = text.replace(ARROW_END, "").trim();
      if (ARROW_END.test(text)) push("arrow-label", el);
      if (GENERIC_LABEL.test(label)) push("generic-cta", el);
    }
    if ((isHeading(el) || el.tag === "p") && VAGUE.test(text)) push("vague-copy", el);
    if (DOT_STRING.test(text)) push("dot-string", el);
    if (INVENTED.test(text)) {
      result.notes.push({
        file,
        line: el.line,
        message: `Slop police, ${INVENTED_NUMBER}: \`${text.slice(0, 60)}\`. If it's real, keep it; if it's made up, use the real number or mark it as sample data. Round, confident numbers are the proof a model reaches for.`,
      });
    }
  }

  for (const site of tsx.classNames) {
    if (TW_GRADIENT_TEXT.test(site.text)) push("gradient-text", site);
    if (TW_STRIPE.test(site.text)) push("side-stripe", site);
    if (TW_SPACED_CAPS(site.text)) push("spaced-caps", site);
  }

  const byKey = new Map(tsx.styles.map((s) => [s.key, s]));
  const clip = byKey.get("backgroundClip") ?? byKey.get("WebkitBackgroundClip");
  if (clip && clip.value === "text") push("gradient-text", clip);
  const stripe = byKey.get("borderLeft") ?? byKey.get("borderInlineStart") ?? byKey.get("borderLeftWidth");
  if (stripe && stripe.value !== undefined && (borderWidth(String(stripe.value)) ?? 0) >= 3) push("side-stripe", stripe);
  const transform = byKey.get("textTransform");
  const spacing = byKey.get("letterSpacing");
  if (transform?.value === "uppercase" && spacing?.value !== undefined && tracked(String(spacing.value))) push("spaced-caps", transform);
}

/* -------------------------------------------------------------------- CSS */

export function slopCss(file: string, css: CssFile, project: CheckProject): Finding[] {
  const findings: Finding[] = [];
  const push = (id: string, at: { line: number; column: number }) => {
    if (kept(project, id)) return;
    findings.push({ rule: "slop", file, line: at.line, column: at.column, message: message(TELL.get(id)!) });
  };
  for (const r of css.rules) {
    const p = r.props;
    if (/^text$/i.test((p["background-clip"] ?? p["-webkit-background-clip"] ?? "").trim())) push("gradient-text", r);
    const stripe = p["border-left"] ?? p["border-inline-start"] ?? p["border-left-width"] ?? p["border-inline-start-width"];
    if (stripe !== undefined && (borderWidth(stripe) ?? 0) >= 3 && !/^(none|0)/.test(stripe.trim())) push("side-stripe", r);
    if (/uppercase/i.test(p["text-transform"] ?? "") && p["letter-spacing"] !== undefined && tracked(p["letter-spacing"])) push("spaced-caps", r);
  }
  return findings;
}
