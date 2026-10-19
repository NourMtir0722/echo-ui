"use client";

/**
 * A code sample with its own copy button — the one code surface on a component
 * page, so the usage snippet, every example, the Code tab and the manual
 * install files all read and copy the same way.
 *
 * It's coloured by what it holds (highlight.ts), read from its label when
 * it isn't given: a terminal, a .tsx path, a fence's language. A file list or
 * a brief stays plain text. The copy button always copies the source as it
 * was given, never the markup.
 */
import { useMemo } from "react";
import { useCopy } from "@/components/use-copy";
import { highlight, langOf, type CodeLang } from "@/components/highlight";

export function CodeBlock({
  code,
  label,
  lang,
  copyLabel = "code",
}: {
  code: string;
  /** Shown top-left in the machine voice: a file path, or "tsx". */
  label?: string;
  /** What the code is, when the label doesn't say. */
  lang?: CodeLang;
  /** What the copy announces: "Copied {copyLabel} to clipboard". */
  copyLabel?: string;
}) {
  const { copied, copy } = useCopy();
  const html = useMemo(() => highlight(code, lang ?? langOf(label)), [code, lang, label]);
  return (
    <div className="doc-code">
      <div className="doc-code__bar">
        {label && <span className="doc-code__label">{label}</span>}
        <button type="button" className="doc-code__copy" onClick={() => copy(code)}>
          {copied ? "copied" : "copy"}
        </button>
        <span role="status" aria-live="polite" className="doc-sr-only">
          {copied ? `Copied ${copyLabel} to clipboard` : ""}
        </span>
      </div>
      {/* Focusable so a wide sample can be scrolled from the keyboard. */}
      {html === null ? (
        <pre className="doc-code__pre" tabIndex={0}>
          {code}
        </pre>
      ) : (
        <pre className="doc-code__pre" tabIndex={0}>
          {/* Built by highlight.ts from escaped tokens: no markup from `code` survives. */}
          <code className="doc-code__code" dangerouslySetInnerHTML={{ __html: html }} />
        </pre>
      )}
    </div>
  );
}
