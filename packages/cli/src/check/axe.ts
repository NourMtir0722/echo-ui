/**
 * axe-core on each page the page tests load (`test`, `check --url`, the Stop
 * gate), so an app built with Echo gets "axe on every page" with nothing to
 * install or configure.
 *
 * - It runs the WCAG 2.0, 2.1 and 2.2 A and AA rules: Echo's floor. Contrast
 *   stays Echo's own (`contrast` measures text on gradients and the material,
 *   which axe skips), so `color-contrast` is off.
 * - Only the top document is scanned (`iframes: false`): left on, axe waits
 *   for an answer from every frame that has no axe in it. The page's iframes
 *   are listed for a person to check instead.
 * - What isn't the app's markup is left out: Base UI's focus guards, which
 *   the app can't name or fix (tests/axe.ts says why); Echo's own
 *   `[data-echo-check]` probe; and the dev servers' own overlays, which `test`
 *   and the Stop gate usually meet, since they run against `npm run dev`.
 *   Next's (`<nextjs-portal>`, its dev tools and error dialog) and Vite's
 *   error overlay (`<vite-error-overlay>`) are elements of their own with a
 *   shadow tree, which axe scans: Vite's stack trace was flagged as a
 *   scrolling region a keyboard can't reach. Leaving one out leaves out its
 *   shadow tree.
 * - It runs after Echo's check, in its own step, with a time limit: axe
 *   failing on a page never costs that page Echo's findings.
 * - A problem is said once. When Echo's `name` has already said a control has
 *   no name, axe's naming rule on that same element is dropped, element by
 *   element, in the page (axe's selectors and Echo's never match).
 *
 * axe-core is the CLI's own dependency, pinned exactly (build.mjs says why),
 * and its script is evaluated in the page after load, the way
 * `@axe-core/playwright` does.
 */
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";

import { AXE_NAME_RULES, AXE_TAGS } from "@registry/agent/axe-rules";

import type { EchoFinding } from "./page";

/** How long axe has on one page before the page is reported without it. */
export const AXE_LIMIT = 10_000;

let script: Promise<string> | undefined;
/** axe-core's script, from the CLI's own pinned copy. */
export function axeScript(): Promise<string> {
  script ??= readFile(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");
  return script;
}

/** An axe rule's facts, carried as data so the team's levels, the report and `--json` don't read them out of words. */
export interface AxeAbout {
  /** The rule's id: `target-size`. */
  id: string;
  /** How much it gets in a person's way, as axe rates it. */
  impact?: "minor" | "moderate" | "serious" | "critical";
  /** The WCAG success criteria it checks: `2.5.8`. */
  wcag: string;
  level: "A" | "AA";
  /** Deque's page for the rule. */
  help: string;
}

/** One of axe's findings, in Echo's shape. */
export interface AxeFinding extends Omit<EchoFinding, "rule"> {
  rule: "axe";
  axe: AxeAbout;
}

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** A finding as it leaves the page: axe's facts and words, the element named Echo's way. */
export interface AxeRaw {
  id: string;
  impact?: string | null;
  tags: string[];
  help: string;
  helpUrl: string;
  /** axe's fix: "Fix any of the following:\n  …". */
  summary: string;
  /** The element is one of Echo's parts, or inside one. */
  echo: boolean;
  where: string;
  selector?: string;
  box?: Box;
}

export interface AxeScan {
  violations: AxeRaw[];
  /** What axe couldn't decide. */
  incomplete: AxeRaw[];
  /** Each iframe on the page, which axe didn't look inside. */
  frames: { where: string; title: string; src: string }[];
}

/**
 * In the page, after Echo's check: axe's scan, each element named the way
 * Echo names one. `off` is the axe rules the team turned off; `limit` ends a
 * scan that never finishes.
 */
export const AXE_IN_PAGE = (off: readonly string[], limit: number) => `(async () => {
  const rules = { "color-contrast": { enabled: false } };
  for (const id of ${JSON.stringify(off)}) rules[id] = { enabled: false };
  let timer;
  const late = new Promise((done) => { timer = setTimeout(() => done(undefined), ${limit}); });
  const scan = axe.run(
    { exclude: [["[data-base-ui-focus-guard]"], ["[data-echo-check]"], ["nextjs-portal"], ["vite-error-overlay"]] },
    { runOnly: { type: "tag", values: ${JSON.stringify(AXE_TAGS)} }, rules, resultTypes: ["violations", "incomplete"], iframes: false, elementRef: true },
  );
  const results = await Promise.race([scan, late]);
  clearTimeout(timer);
  if (!results) throw new Error("it didn't finish within ${limit / 1000}s");
  const naming = new Set(${JSON.stringify(AXE_NAME_RULES)});
  const echoPart = (el) => { for (let at = el; at; at = at.parentElement) if ([...at.classList].some((c) => c.startsWith("echo-"))) return true; return false; };
  const boxOf = (el) => {
    if (el === document.body || !document.body.contains(el)) return undefined;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 ? { x: r.left + scrollX, y: r.top + scrollY, width: r.width, height: r.height } : undefined;
  };
  const shape = (list) => list.flatMap((rule) => rule.nodes
    .filter((node) => !(naming.has(rule.id) && node.element && globalThis.__echoFound(node.element).includes("name")))
    .map((node) => {
      const el = node.element;
      const at = el ? globalThis.__echoWhere(el) : { where: node.target.join(" ") };
      return { id: rule.id, impact: node.impact ?? rule.impact, tags: rule.tags, help: rule.help, helpUrl: rule.helpUrl, summary: node.failureSummary ?? "", echo: el ? echoPart(el) : false, where: at.where, selector: at.selector, box: el ? boxOf(el) : undefined };
    }));
  const frames = [...document.querySelectorAll("iframe")]
    .filter((frame) => frame.getClientRects().length)
    .map((frame) => ({ where: globalThis.__echoWhere(frame).where, title: frame.title || frame.getAttribute("aria-label") || "", src: frame.getAttribute("src") || "" }));
  return { violations: shape(results.violations), incomplete: shape(results.incomplete), frames };
})()`;

/* ------------------------------------------------------------------ words */

/** "wcag258" is 2.5.8; "wcag1412" is 1.4.12. */
const criterion = (tag: string) => {
  const digits = /^wcag(\d)(\d)(\d+)$/.exec(tag);
  return digits ? `${digits[1]}.${digits[2]}.${digits[3]}` : undefined;
};

/** axe's fix, on one line: "Fix any of the following: this; that." */
export function axeFix(summary: string): string {
  const groups: { head: string; items: string[] }[] = [];
  for (const raw of summary.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    if (/^Fix (any|all) of the following:$/.test(line)) groups.push({ head: line, items: [] });
    else if (groups.length) groups.at(-1)!.items.push(line.replace(/\.$/, ""));
    else groups.push({ head: "", items: [line.replace(/\.$/, "")] });
  }
  const said = groups
    .filter((g) => g.items.length)
    .map((g) => (g.items.length === 1 ? g.items[0]! : `${g.head} ${g.items.join("; ")}`))
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1));
  return said.length ? `${said.join(". ")}.` : "";
}

/**
 * Echo's line for the rules agents hit, when one of Echo's parts or props is
 * the answer. Every other rule keeps axe's words.
 */
const ECHO_LINES: Record<string, (raw: AxeRaw) => string | undefined> = {
  "button-name": (raw) =>
    raw.echo
      ? `this Echo part has no name, so a screen reader says only "button". Give it words, or \`aria-label\` when it shows only an icon: an \`iconOnly\` HardwareButton's type asks for one.`
      : undefined,
  "image-alt": () => `this image has no \`alt\`, so a screen reader says its file name, or nothing. Give it \`alt\` that says what it shows, or \`alt=""\` when it's decoration.`,
  "target-size": (raw) => {
    const size = /insufficient size \((\d+px by \d+px)/.exec(raw.summary)?.[1];
    const room = /diameter of (\d+px)/.exec(raw.summary)?.[1];
    const measured = [size ? `this target is ${size}` : "", room ? `${size ? "with" : "it has"} ${room} of room around it` : ""].filter(Boolean).join(" ");
    const lead = measured ? `${measured}, where WCAG asks for 24px by 24px, or that much room` : "this target is under 24px by 24px, with too little room around it";
    return raw.echo
      ? `${lead}. Echo's parts are 24px and up, so something outside this one made it smaller: a size, padding or font set on it from outside. Take that off.`
      : `${lead}. Echo's parts are 24px and up: use the part (HardwareButton, Toggle, Link) instead of a raw control, or give this one 24px.`;
  },
  "aria-hidden-focus": () =>
    "this is hidden from screen readers (`aria-hidden`), but a keyboard still reaches what's inside it, so focus lands on something nobody hears. Make it `inert` instead, which hides it from both, or take `aria-hidden` off.",
};

/**
 * What an axe finding says, from the rule's id, its tags and axe's own words:
 * `target-size (WCAG 2.5.8, AA): this target is 14px by 14px …`.
 */
export function axeWords(raw: Pick<AxeRaw, "id" | "tags" | "help" | "summary" | "echo">): { message: string; wcag: string; level: "A" | "AA" } {
  const wcag = [...new Set(raw.tags.map(criterion).filter((c): c is string => c !== undefined))].join(", ");
  const level = raw.tags.some((t) => /^wcag2\d?aa$/.test(t)) ? "AA" : "A";
  const said = ECHO_LINES[raw.id]?.(raw as AxeRaw) ?? `${raw.help.replace(/\.$/, "")}. ${axeFix(raw.summary)}`.trim();
  return { message: `${raw.id} (WCAG ${wcag || "A and AA"}, ${level}): ${said}`, wcag, level };
}

const IMPACTS = new Set(["minor", "moderate", "serious", "critical"]);

/** One of axe's findings in Echo's shape, with its box for the crop. */
export function axeFinding(raw: AxeRaw): AxeFinding & { box?: Box } {
  const { message, wcag, level } = axeWords(raw);
  return {
    rule: "axe",
    message,
    where: raw.where,
    selector: raw.selector,
    key: `axe:${raw.id}:${raw.selector ?? raw.where}`,
    axe: {
      id: raw.id,
      impact: IMPACTS.has(raw.impact ?? "") ? (raw.impact as AxeAbout["impact"]) : undefined,
      wcag,
      level,
      help: raw.helpUrl.replace(/\?application=axeAPI$/, ""),
    },
    box: raw.box,
  };
}
