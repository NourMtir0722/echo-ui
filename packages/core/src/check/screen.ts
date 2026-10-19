/**
 * The screen rules that need a rendered page to see: what's on screen at
 * once, across every file that put it there. Each message quotes its rule by
 * number and name, as `check` does in the source; the names are Echo's screen
 * rules, and a test in the registry holds the two together.
 */
import { PAGE_SCREEN_RULES, type PageFinding } from "./types";

type Rule = keyof typeof PAGE_SCREEN_RULES;
type Describe = (el: Element) => { where: string; selector: string };

const said = (n: Rule) => `Screen rule ${n}, ${PAGE_SCREEN_RULES[n].replace(/^./, (c) => c.toLowerCase())}`;

/** A primary cap: the one lit action of a decision. */
const LIT_CAP = '.echo-hw[data-variant="primary"]';
/** Where one decision ends. */
const DECISION = 'form, dialog, [role="dialog"], [role="alertdialog"], [role="toolbar"]';
/** A lit "you are here": the current link in Echo's navigation. */
const YOU_ARE_HERE = '.echo-side-nav__link[aria-current="page"], .echo-tab-bar__link[aria-current="page"]';

const words = (el: Element) => (el.textContent ?? "").replace(/\s+/g, " ").trim();

export function screenFindings(doc: Document, shown: (el: Element) => boolean, describe: Describe): PageFinding[] {
  const findings: PageFinding[] = [];
  const add = (n: Rule, el: Element, message: string) => {
    const { where, selector } = describe(el);
    findings.push({ rule: "screen", message: `${said(n)}: ${message}`, where, selector, element: el, key: `screen:${n}:${selector}` });
  };

  // 2. One lit cap per decision, across whatever files built the form or dialog.
  const decisions = new Map<Element, Element[]>();
  for (const cap of doc.querySelectorAll(LIT_CAP)) {
    const scope = cap.parentElement?.closest(DECISION);
    if (!scope || !shown(cap)) continue;
    decisions.set(scope, [...(decisions.get(scope) ?? []), cap]);
  }
  for (const [scope, caps] of decisions) {
    if (caps.length < 2) continue;
    const kind = scope.localName === "form" ? "form" : scope.getAttribute("role") === "toolbar" ? "toolbar" : "dialog";
    const labels = caps.map((c) => `"${words(c) || "an icon"}"`).join(", ");
    add(2, caps[1]!, `this ${kind} shows ${caps.length} primary caps (${labels}). Keep the one you'd keep if you could keep only one, and make the rest \`neutral\` or \`ghost\`.`);
  }

  // 3. One "you are here".
  const here = [...doc.querySelectorAll(YOU_ARE_HERE)].filter(shown);
  if (here.length > 1) {
    const navs = here.map((el) => `"${el.closest("nav")?.getAttribute("aria-label") ?? "navigation"}"`).join(" and ");
    add(3, here[1]!, `the page lights "you are here" ${here.length} times (${navs}). Show the current page once, in the navigation that owns it; hide the other at this width.`);
  }

  // 9. State is said, not coloured: an invalid field says what's wrong.
  for (const field of doc.querySelectorAll('[aria-invalid="true"]')) {
    if (!shown(field)) continue;
    const ids = `${field.getAttribute("aria-errormessage") ?? ""} ${field.getAttribute("aria-describedby") ?? ""}`.trim();
    const explained = ids
      .split(/\s+/)
      .map((id) => (id ? doc.getElementById(id) : null))
      .some((ref) => ref !== null && words(ref) !== "");
    if (!explained) {
      add(9, field, "this field is marked invalid, but no words say what's wrong, so the error is only a colour. Say it (Field's `error`), tied to the field with `aria-describedby`.");
    }
  }
  return findings;
}
