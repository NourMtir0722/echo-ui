/**
 * How MDX elements render on the guide pages (Next's mdx-components
 * convention). Everything maps onto the same classes the component pages use,
 * so a guide and a component page read as one site.
 */
import type { MDXComponents } from "mdx/types";
import { isValidElement, type ReactElement, type ReactNode } from "react";
import { CodeBlock } from "@/components/CodeBlock";

/** Plain text of a heading's children, for its anchor id. */
function textOf(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (isValidElement<{ children?: ReactNode }>(node)) return textOf(node.props.children);
  return "";
}

export const slugify = (text: string) =>
  text
    .toLowerCase()
    .replace(/[`'"]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/** An h2/h3 with an id, so every section can be linked to. */
function anchored(Tag: "h2" | "h3", className: string) {
  return function Heading({ children }: { children?: ReactNode }) {
    return (
      <Tag id={slugify(textOf(children))} className={className}>
        {children}
      </Tag>
    );
  };
}

/**
 * A fenced block arrives as <pre><code className="language-x">…</code></pre>.
 * It becomes a CodeBlock — the same copyable surface as the component pages —
 * labelled with its language.
 */
function Pre({ children }: { children?: ReactNode }) {
  const code = children as ReactElement<{ className?: string; children?: ReactNode }>;
  const language = code?.props?.className?.replace(/^language-/, "");
  return <CodeBlock code={textOf(code?.props?.children).replace(/\n$/, "")} label={language} />;
}

/**
 * The text of a table's header cells, which is the only description of itself
 * a markdown table carries.
 *
 * Every one of these boxes used to be announced as "Table". One per
 * page passed; the moment a page had two, they were two landmarks with the
 * same name, and a reader tabbing between them was told the same word twice
 * with nothing to tell them apart.
 */
function headerText(node: ReactNode): string[] {
  if (Array.isArray(node)) return node.flatMap(headerText);
  if (!isValidElement<{ children?: ReactNode }>(node)) return [];
  if (node.type === "th") return [textOf(node.props.children).trim()].filter(Boolean);
  return headerText(node.props.children);
}

/**
 * A wide table scrolls inside its own box, which has to be reachable by
 * keyboard, and so needs a name.
 *
 * It is a `group`, not a `region`. A landmark is for a major area of a page —
 * the kind of thing a reader jumps between — and a table inside a paragraph of
 * prose is not one. Three flag tables on the CLI page were three landmarks,
 * and naming them by their headers did not help, because their headers are
 * legitimately the same words. The hand-labelled data tables on the
 * theming and token pages stay regions: those are what their page is about.
 */
function Table({ children }: { children?: ReactNode }) {
  const headers = headerText(children);
  return (
    <div
      className="guide__table"
      tabIndex={0}
      role="group"
      aria-label={headers.length ? headers.join(", ") : "Table"}
    >
      <table>{children}</table>
    </div>
  );
}

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    h1: ({ children }) => <h1 className="doc__title">{children}</h1>,
    h2: anchored("h2", "doc__h2 guide__h2"),
    h3: anchored("h3", "guide__h3"),
    pre: Pre,
    table: Table,
    ...components,
  };
}
