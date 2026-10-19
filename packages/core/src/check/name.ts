/**
 * Does a control have a name? The part of the accessible-name computation
 * that answers it: `aria-labelledby`, `aria-label`, a `<label>`, the text
 * inside (for the roles that take their name from it), then `title` and
 * `placeholder`. It doesn't need the name's exact words, only whether a
 * screen reader has any to say, so the edge cases that only change the
 * wording are left out.
 */

/** Everything a person can operate, by element and by role. */
export const CONTROLS = [
  "button",
  "a[href]",
  'input:not([type="hidden"])',
  "select",
  "textarea",
  "summary",
  ...[
    "button",
    "link",
    "checkbox",
    "radio",
    "switch",
    "tab",
    "menuitem",
    "menuitemcheckbox",
    "menuitemradio",
    "option",
    "slider",
    "spinbutton",
    "combobox",
    "textbox",
    "searchbox",
    "treeitem",
  ].map((role) => `[role="${role}"]`),
].join(", ");

/** Roles that take their name from what's inside them. */
const FROM_CONTENT = new Set([
  "button",
  "link",
  "checkbox",
  "radio",
  "switch",
  "tab",
  "menuitem",
  "menuitemcheckbox",
  "menuitemradio",
  "option",
  "treeitem",
  "summary",
]);

const INPUT_ROLES: Record<string, string> = {
  checkbox: "checkbox",
  radio: "radio",
  range: "slider",
  number: "spinbutton",
  button: "button",
  submit: "button",
  reset: "button",
  image: "button",
  search: "searchbox",
};

type Style = (el: Element) => CSSStyleDeclaration;

/** The role a control has, written or implied by its element. */
export function roleOf(el: Element): string {
  const written = el.getAttribute("role")?.trim().split(/\s+/)[0];
  if (written) return written;
  switch (el.localName) {
    case "a":
      return "link";
    case "button":
      return "button";
    case "summary":
      return "summary";
    case "select":
      return "combobox";
    case "textarea":
      return "textbox";
    case "input":
      return INPUT_ROLES[(el as HTMLInputElement).type] ?? "textbox";
    default:
      return el.localName;
  }
}

/** Out of the accessibility tree: `aria-hidden`, `inert`, or not rendered. */
export function hiddenFromAssistiveTech(el: Element, style: Style): boolean {
  if (el.closest('[aria-hidden="true"], [inert]')) return true;
  const cs = style(el);
  return cs.display === "none" || cs.visibility === "hidden" || cs.visibility === "collapse";
}

/** Generated text (`content: "…"`), which counts toward a name. */
function generated(el: Element, pseudo: "::before" | "::after"): string {
  const content = getComputedStyle(el, pseudo).content;
  const m = /^"(.*)"$/.exec(content);
  return m ? ` ${m[1]} ` : "";
}

const squash = (s: string) => s.replace(/\s+/g, " ").trim();

/** An element's own name when it has one that isn't its content: a label, alt text, an SVG title. */
function ownName(el: Element): string | undefined {
  const label = el.getAttribute("aria-label")?.trim();
  if (label) return label;
  if (el.localName === "img") return el.getAttribute("alt") ?? "";
  if (el.localName === "svg") return el.querySelector(":scope > title")?.textContent ?? "";
  return undefined;
}

/** The text inside an element, as a name: hidden parts left out, `skip` (the control itself) too. */
function contentText(el: Element, style: Style, skip?: Element): string {
  let out = generated(el, "::before");
  for (const node of el.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      out += node.textContent ?? "";
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const child = node as Element;
      if (child === skip || child.getAttribute("aria-hidden") === "true") continue;
      const cs = style(child);
      if (cs.display === "none" || cs.visibility === "hidden") continue;
      // A control inside a label is the thing being named, or another one; its value isn't the label.
      if (/^(input|select|textarea)$/.test(child.localName)) continue;
      out += ` ${ownName(child) ?? contentText(child, style, skip)} `;
    }
  }
  return out + generated(el, "::after");
}

/** The name a screen reader says for `el`, or "" when it has none. */
export function accessibleName(el: Element, style: Style): string {
  const doc = el.ownerDocument;
  const labelledBy = el.getAttribute("aria-labelledby");
  if (labelledBy) {
    // What aria-labelledby points to counts even when it's hidden.
    const text = squash(
      labelledBy
        .split(/\s+/)
        .map((id) => doc.getElementById(id))
        .map((ref) => (ref ? (ref.getAttribute("aria-label")?.trim() || ref.textContent) ?? "" : ""))
        .join(" "),
    );
    if (text) return text;
  }
  const label = el.getAttribute("aria-label")?.trim();
  if (label) return label;

  const tag = el.localName;
  if (tag === "input" || tag === "select" || tag === "textarea") {
    const input = el as HTMLInputElement;
    if (input.type === "submit" || input.type === "reset") return input.value || input.type;
    if (input.type === "button" && input.value.trim()) return input.value.trim();
    if (input.type === "image") {
      const alt = el.getAttribute("alt")?.trim() || input.value.trim();
      if (alt) return alt;
    }
    for (const labelEl of input.labels ?? []) {
      const text = squash(contentText(labelEl, style, el));
      if (text) return text;
    }
  }
  if (FROM_CONTENT.has(roleOf(el))) {
    const text = squash(contentText(el, style));
    if (text) return text;
  }
  const title = el.getAttribute("title")?.trim();
  if (title) return title;
  if (tag === "input" || tag === "textarea") return el.getAttribute("placeholder")?.trim() ?? "";
  return "";
}
