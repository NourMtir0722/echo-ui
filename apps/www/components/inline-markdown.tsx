/**
 * The markdown the docs' own strings use — meta.ts fields, CHANGELOG.md and
 * PRINCIPLES.md: `code`, **bold**, *emphasis* and [links](url) inline;
 * headings, paragraphs, bullet lists, pipe tables and fenced code as blocks.
 * Anything else stays literal text.
 *
 * Deliberately small. These strings are written by hand for these pages, so
 * the renderer only has to cover what they actually contain, and a test
 * (tests/docs.spec.ts) checks the changelog page shows no stray markup.
 */
import type { ReactNode } from "react";

import { CodeBlock } from "@/components/CodeBlock";

const INLINE = /(`[^`]+`|\*\*.+?\*\*|\*[^*\s][^*]*?\*|\[[^\]]+\]\([^)\s]+\))/g;

/**
 * Backticked identifiers render as code because every other identifier on the
 * page is already in the mono voice — literal backticks on screen would be the
 * one place the docs read as source rather than as prose.
 */
export function inline(text: string): ReactNode[] {
  return text.split(INLINE).map((part, i) => {
    if (i % 2 === 0) return part;
    if (part.startsWith("`")) return <code key={i}>{part.slice(1, -1)}</code>;
    if (part.startsWith("**")) return <strong key={i}>{inline(part.slice(2, -2))}</strong>;
    if (part.startsWith("*")) return <em key={i}>{inline(part.slice(1, -1))}</em>;
    const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part)!;
    // "./CONTRIBUTING.md" is a path in the repo, not on the site; show the words, not a dead link.
    if (!/^(https?:|\/|#)/.test(link[2]!)) return <span key={i}>{inline(link[1]!)}</span>;
    return (
      <a key={i} href={link[2]}>
        {inline(link[1]!)}
      </a>
    );
  });
}

type Block =
  | { kind: "h1" | "h2" | "h3" | "p"; text: string }
  | { kind: "ul"; items: string[] }
  | { kind: "table"; head: string[]; rows: string[][] }
  | { kind: "code"; language?: string; code: string };

/** `| a | b |` → ["a", "b"]. Not a parser: these tables are written by hand. */
const isRow = (line: string) => /^\|.*\|$/.test(line.trim());
const cells = (line: string) =>
  line
    .trim()
    .slice(1, -1)
    .split("|")
    .map((c) => c.trim());
/** The `| --- | --- |` line under a header. */
const isRule = (line: string) => isRow(line) && cells(line).every((c) => /^:?-{3,}:?$/.test(c));

function blocks(markdown: string): Block[] {
  const out: Block[] = [];
  let para: string[] = [];
  let list: string[] | null = null;
  let table: { head: string[]; rows: string[][] } | null = null;
  const flush = () => {
    if (para.length) out.push({ kind: "p", text: para.join(" ") });
    if (list) out.push({ kind: "ul", items: list });
    if (table) out.push({ kind: "table", ...table });
    para = [];
    list = null;
    table = null;
  };

  const lines = markdown.split(/\r?\n/);
  let fence: { indent: string; language?: string; code: string[] } | null = null;
  for (const [index, raw] of lines.entries()) {
    /*
     * A fenced block, which may sit indented under a list item (the
     * changelog's first one rendered as literal backticks). Its lines are kept
     * verbatim, minus the fence's own indent.
     */
    const fenceLine = /^(\s*)```(\w*)\s*$/.exec(raw);
    if (fence) {
      if (fenceLine) {
        out.push({ kind: "code", language: fence.language, code: fence.code.join("\n") });
        fence = null;
      } else {
        fence.code.push(raw.startsWith(fence.indent) ? raw.slice(fence.indent.length) : raw.trimStart());
      }
      continue;
    }
    if (fenceLine) {
      flush();
      fence = { indent: fenceLine[1]!, language: fenceLine[2] || undefined, code: [] };
      continue;
    }
    // Link-reference definitions ("[0.1.0]: https://…") are addresses for the
    // headings' version labels, not text; they are dropped, and the labels
    // below lose their brackets.
    if (/^\[[^\]]+\]:\s/.test(raw)) continue;
    const line = raw.trimEnd().replace(/^(#{1,3} )\[([^\]]+)\](?!\()/, "$1$2");
    // A row with a `| --- |` under it opens a table; rows continue it.
    if (isRow(line) && (table || isRule(lines[index + 1] ?? ""))) {
      if (!table) {
        flush();
        table = { head: cells(line), rows: [] };
        continue;
      }
      if (!isRule(line)) table.rows.push(cells(line));
      continue;
    }
    if (table) flush();

    const heading = /^(#{1,3}) (.*)$/.exec(line);
    if (heading) {
      flush();
      out.push({ kind: `h${heading[1]!.length}` as "h1" | "h2" | "h3", text: heading[2]! });
    } else if (/^- /.test(line)) {
      if (para.length) flush();
      (list ??= []).push(line.slice(2));
    } else if (!line.trim()) {
      flush();
    } else if (list && /^\s/.test(line)) {
      list[list.length - 1] += ` ${line.trim()}`;
    } else {
      if (list) flush();
      para.push(line.trim());
    }
  }
  flush();
  return out;
}

/** A whole markdown document, as the docs' headings, paragraphs and lists. */
export function MarkdownDocument({ source, headingIds }: { source: string; headingIds?: (text: string) => string }) {
  return (
    <>
      {blocks(source).map((b, i) => {
        switch (b.kind) {
          case "h1":
            return (
              <h1 key={i} className="doc__title">
                {inline(b.text)}
              </h1>
            );
          case "h2":
            return (
              <h2 key={i} id={headingIds?.(b.text)} className="doc__h2 guide__h2">
                {inline(b.text)}
              </h2>
            );
          case "h3":
            return (
              <h3 key={i} className="guide__h3">
                {inline(b.text)}
              </h3>
            );
          case "p":
            return <p key={i}>{inline(b.text)}</p>;
          case "ul":
            return (
              <ul key={i}>
                {b.items.map((item, j) => (
                  <li key={j}>{inline(item)}</li>
                ))}
              </ul>
            );
          case "code":
            return <CodeBlock key={i} code={b.code} label={b.language} />;
          case "table":
            return (
              /* Scrollable and focusable, like the guides' own tables: a wide
                 table that can only be reached with a mouse is not reachable.
                 A group rather than a landmark, for the reason in
                 mdx-components.tsx. */
              <div key={i} className="guide__table" tabIndex={0} role="group" aria-label={b.head.join(", ")}>
                <table>
                  <thead>
                    <tr>
                      {b.head.map((h, j) => (
                        <th key={j} scope="col">
                          {inline(h)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {b.rows.map((row, j) => (
                      <tr key={j}>
                        {row.map((cell, k) => (
                          <td key={k}>{inline(cell)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
        }
      })}
    </>
  );
}
