/**
 * The overlay: a small panel in the corner listing what the page check found, for
 * a person without the console open. Choosing a finding outlines its element
 * and scrolls to it.
 *
 * It lives in its own shadow root, outside the body, so the page's styles
 * don't reach it and the page check never looks at it.
 */
import type { PageFinding } from "./types";

const STYLE = `
:host { all: initial; position: fixed; left: 12px; bottom: 12px; z-index: 2147483647;
  font: 13px/1.45 system-ui, sans-serif; color: #f4f4f5; }
button { font: inherit; color: inherit; }
.pill { background: #1d1b22; border: 1px solid #5a5663; border-radius: 999px; padding: 6px 12px;
  font-weight: 600; cursor: pointer; }
.panel { position: absolute; left: 0; bottom: calc(100% + 8px); box-sizing: border-box;
  width: min(420px, calc(100vw - 24px)); max-height: min(60vh, 520px); overflow: auto; padding: 6px;
  background: #1d1b22; border: 1px solid #5a5663; border-radius: 12px; box-shadow: 0 12px 32px rgb(0 0 0 / 0.5); }
.panel[hidden], .box[hidden] { display: none; }
ol { list-style: none; margin: 0; padding: 0; }
.item { all: unset; box-sizing: border-box; display: grid; gap: 2px; width: 100%; padding: 8px 10px;
  border-radius: 8px; cursor: pointer; }
.item:hover { background: #2b2832; }
.rule { font-size: 11px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: #cfcbd6; }
.where { color: #cfcbd6; overflow-wrap: anywhere; }
.pill:focus-visible, .item:focus-visible { outline: 2px solid #f4f4f5; outline-offset: 2px; }
.box { position: fixed; pointer-events: none; border-radius: 4px; outline: 2px solid #ffffff;
  box-shadow: 0 0 0 4px #000000; }
`;

export interface Overlay {
  show(findings: readonly PageFinding[]): void;
  remove(): void;
}

export function createOverlay(): Overlay {
  const host = document.createElement("echo-check-overlay");
  host.setAttribute("data-echo-check", "");
  const root = host.attachShadow({ mode: "open" });
  // A constructed sheet, not a <style>: a strict Content Security Policy blocks the element, not this.
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(STYLE);
  root.adoptedStyleSheets = [sheet];
  root.innerHTML = `<section class="panel" id="panel" aria-label="Echo check" hidden><ol></ol></section>
<button class="pill" type="button" aria-expanded="false" aria-controls="panel">Echo check</button>
<div class="box" hidden></div>`;
  document.documentElement.appendChild(host);

  const pill = root.querySelector<HTMLButtonElement>(".pill")!;
  const panel = root.querySelector<HTMLElement>(".panel")!;
  const list = root.querySelector<HTMLOListElement>("ol")!;
  const box = root.querySelector<HTMLDivElement>(".box")!;

  const open = (next: boolean) => {
    panel.hidden = !next;
    pill.setAttribute("aria-expanded", String(next));
    if (!next) box.hidden = true;
  };
  // `hidden` may also be "until-found", which is still hidden.
  pill.addEventListener("click", () => open(panel.hidden !== false));
  host.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !panel.hidden) {
      open(false);
      pill.focus();
    }
  });
  const outline = (el: Element | undefined) => {
    const rect = el?.getBoundingClientRect();
    if (!rect || (rect.width === 0 && rect.height === 0)) {
      box.hidden = true;
      return;
    }
    Object.assign(box.style, { left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px` });
    box.hidden = false;
  };
  const hide = () => {
    box.hidden = true;
  };
  window.addEventListener("scroll", hide, { passive: true, capture: true });

  return {
    show(findings) {
      pill.textContent = findings.length === 0 ? "Echo check · nothing to fix" : `Echo check · ${findings.length}`;
      list.replaceChildren(
        ...findings.map((f) => {
          const item = document.createElement("li");
          const button = document.createElement("button");
          button.type = "button";
          button.className = "item";
          const rule = Object.assign(document.createElement("span"), { className: "rule", textContent: f.rule });
          const where = Object.assign(document.createElement("span"), { className: "where", textContent: f.where ?? "" });
          const message = Object.assign(document.createElement("span"), { textContent: f.message });
          button.append(rule, ...(f.where ? [where] : []), message);
          const el = f.element;
          button.addEventListener("pointerenter", () => outline(el));
          button.addEventListener("pointerleave", hide);
          button.addEventListener("focus", () => outline(el));
          button.addEventListener("blur", hide);
          button.addEventListener("click", () => {
            el?.scrollIntoView({ block: "center" });
            requestAnimationFrame(() => outline(el));
          });
          item.append(button);
          return item;
        }),
      );
      if (findings.length === 0) open(false);
    },
    remove() {
      window.removeEventListener("scroll", hide, { capture: true });
      host.remove();
    },
  };
}
