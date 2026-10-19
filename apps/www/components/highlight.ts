/**
 * Syntax colours for the site's code blocks, so code reads as code at a
 * glance: keywords, strings, components and props each in their own colour.
 *
 * sugar-high's core, with only the grammars the site shows (TypeScript with
 * TSX, JSON, CSS): a few kilobytes that run in the client components the code
 * blocks live in, where a build-time highlighter couldn't reach. Terminal
 * lines get their own small tokenizer, because a shell grammar paints a whole
 * command one colour; here the command, its flags and its arguments differ.
 *
 * The output is sugar-high's markup (`.sh__token--*`), coloured by the
 * `--sh-*` properties in component-doc.css. Everything is escaped: the
 * tokenizers return text, and HTML is only ever built from it here.
 */
import { parse, render } from "sugar-high/core";
import * as typescript from "sugar-high/lang/typescript";
import * as json from "sugar-high/lang/json";
import * as css from "sugar-high/lang/css";

export type CodeLang = "typescript" | "json" | "css" | "shell" | "plain";

/** What a block's label says it holds: a file path, a fence's language, or "terminal". */
export function langOf(label: string | undefined): CodeLang {
  const l = (label ?? "").trim().toLowerCase();
  if (/^(terminal|sh|bash|shell|zsh|console|claude code)$/.test(l)) return "shell";
  if (/(^|\.)(json|jsonc)$/.test(l)) return "json";
  if (/(^|\.)css$/.test(l)) return "css";
  if (/(^|\.)(tsx?|jsx?|mjs|cjs|typescript|javascript)$/.test(l)) return "typescript";
  return "plain";
}

const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const token = (type: string, value: string) => `<span class="sh__token--${type}">${escape(value)}</span>`;

/**
 * One command per line: the program in the keyword colour, flags as
 * properties, `--` and pipes as signs, quoted arguments as strings, the rest
 * as plain words. A `#` starts a comment; `$ ` is a prompt, drawn as a sign.
 */
function shell(code: string): string {
  return code
    .split("\n")
    .map((line) => {
      const out: string[] = [];
      let first = true;
      for (const part of line.match(/\s+|"[^"]*"?|'[^']*'?|[^\s]+/g) ?? []) {
        if (/^\s+$/.test(part)) out.push(escape(part));
        else if (part.startsWith("#")) {
          out.push(token("comment", line.slice(line.indexOf(part))));
          break;
        } else if (first && part === "$") out.push(token("sign", part));
        else if (first) {
          out.push(token("keyword", part));
          first = false;
        } else if (/^(--|\||&&|;)$/.test(part)) {
          // What follows starts another command (`claude mcp add echo-ui -- npx …`).
          out.push(token("sign", part));
          first = true;
        } else if (/^(>|<)$/.test(part)) out.push(token("sign", part));
        else if (/^-{1,2}[\w-]/.test(part)) out.push(token("property", part));
        else if (/^["']/.test(part)) out.push(token("string", part));
        else out.push(token("identifier", part));
      }
      return `<span class="sh__line">${out.join("")}</span>`;
    })
    .join("\n");
}

const GRAMMAR = { typescript, json, css } as const;

/** The block's HTML, or null when it's plain text and should stay plain. */
export function highlight(code: string, lang: CodeLang): string | null {
  if (lang === "plain") return null;
  if (lang === "shell") return shell(code);
  // Colours come from the stylesheet's classes, not inline styles.
  return render(parse(code, GRAMMAR[lang]), { mark: (t) => void (t.style = {}) });
}
