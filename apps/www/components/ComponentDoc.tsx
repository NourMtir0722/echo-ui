"use client";

/**
 * A component doc page, everything sourced from the
 * component's meta.ts:
 *
 *   title + about (+ feel) → preview / code → action row → installation
 *   (CLI / manual) → usage → composition → examples → accessibility →
 *   motion & sound → props → anti-patterns → changelog
 *
 * The order is the one `registry/src/agent/render.ts` prints for agents, so a
 * person on this page and an agent calling get_component meet the same
 * sections in the same place. A section whose meta field is unset is left out,
 * never shown empty — the same rule render.ts follows.
 *
 * Colors are --echo-* roles, not literals: the docs page is itself a demo of
 * the theme it documents. The page uses the library's own Tabs,
 * HardwareButton and Table for the same reason.
 */
import type { ReactNode } from "react";
import type { CatalogProp } from "@registry/agent/props";
import type { ItemChangelogEntry } from "@registry/agent/changelog";
import { kb, type FactCard } from "@registry/agent/facts";
import { HardwareButton } from "@registry/echo/hardware-button";
import { Table } from "@registry/echo/table";
import { Tabs } from "@registry/echo/tabs";
import { CORE_MODULES, isCoreModule } from "@registry/agent/core-modules";
import {
  CONFORMANCE_CHECKS,
  CONFORMANCE_LIMITS,
  CONFORMANCE_STANDARD,
} from "@registry/agent/conformance";
import { CodeBlock } from "@/components/CodeBlock";
import { InstallCommand } from "@/components/InstallCommand";
import { ManualInstall } from "@/components/ManualInstall";
import type { DocMeta } from "@/components/docs-manifest";
import type { DocPageData } from "@/components/docs-server";
import { showcaseFor } from "@/components/site/site-nav";
import { useCopy } from "@/components/use-copy";
import { inline } from "@/components/inline-markdown";
import "./component-doc.css";

/**
 * The conformance note every component page carries. Read from
 * `conformance.ts`, never typed here: the page, the published `/e/` item and
 * the MCP's answer are one record, so a claim cannot be true in one place and
 * stale in another.
 */
function Conformance() {
  return (
    <div className="doc-conformance">
      <p className="doc-note">
        Tested against <strong>{CONFORMANCE_STANDARD}</strong> on every release:
      </p>
      <ul className="doc-list">
        {CONFORMANCE_CHECKS.map((check) => (
          <li key={check.id}>
            <code>{check.id}</code> — {check.what}
          </li>
        ))}
      </ul>
      <p className="doc-note">
        <strong>Not covered:</strong> {CONFORMANCE_LIMITS.join("; ")}. Everything above is a
        machine check; a person has not yet driven this component with a screen reader.
      </p>
    </div>
  );
}

export function ComponentDoc({
  meta,
  props,
  preview,
  data,
}: {
  meta: DocMeta;
  /** Walked out of the meta's zod schema by the manifest. */
  props: readonly CatalogProp[];
  preview: ReactNode;
  data: DocPageData;
}) {
  const slug = meta.name.replace(/^echo-/, "");
  const showcase = showcaseFor(slug);

  // The Code tab shows the smallest working use; until an item's usage is
  // written, its first example stands in, and says so.
  const firstExample = meta.examples[0];
  const code = meta.usage
    ? { label: "tsx", text: `${meta.usage.imports.trim()}\n\n${meta.usage.code.trim()}` }
    : firstExample
      ? { label: `example: ${firstExample.title}`, text: firstExample.code }
      : undefined;

  return (
    <article className="doc">
      <header>
        <h1 className="doc__title">{meta.title}</h1>
        <p className="doc__about">{meta.description}</p>
        {meta.feel && (
          <p className="doc__feel">
            <span className="doc__feel-label">Feel</span> {meta.feel}
          </p>
        )}
      </header>

      <section aria-labelledby="preview" className="doc__section">
        <h2 id="preview" className="doc-sr-only">
          Preview
        </h2>
        <Tabs defaultValue="preview">
          <div className="doc__tabs-row">
            <Tabs.List aria-label="Preview or code">
              <Tabs.Tab value="preview">Preview</Tabs.Tab>
              {code && <Tabs.Tab value="code">Code</Tabs.Tab>}
            </Tabs.List>
            {showcase && (
              <a href={showcase.href} className="doc__showcase">
                every state →
              </a>
            )}
          </div>
          {/* Kept mounted so a preview keeps its state across a look at the code. */}
          <Tabs.Panel value="preview" keepMounted className="doc__panel">
            <div data-testid="preview" className="doc__preview">
              {preview}
            </div>
          </Tabs.Panel>
          {code && (
            <Tabs.Panel value="code" className="doc__panel">
              <CodeBlock code={code.text} label={code.label} />
            </Tabs.Panel>
          )}
        </Tabs>
      </section>

      <ActionRow slug={slug} agentMarkdown={data.agentMarkdown} />

      <Section id="installation" title="Installation">
        {isCoreModule(meta.name) ? (
          /*
           * A core module is not copied, so there is nothing to install by
           * hand and no registry item to read it from. Offering a Manual tab
           * here sent the reader to /r/<name>.json, which stopped existing
           * when these five moved into echo-ui-core.
           */
          <div className="doc__panel">
            <div data-testid="install">
              <InstallCommand item={meta.name} />
            </div>
            <p className="doc-note">
              This one ships in the <code>echo-ui-core</code> package rather than being copied into your
              project — <code>npx echo-ui-cli init</code> installs it for you. Import it from{" "}
              <code>{CORE_MODULES.find((m) => m.name === meta.name)!.entry}</code>.
            </p>
          </div>
        ) : (
          <Tabs defaultValue="cli">
            <Tabs.List aria-label="Install with">
              <Tabs.Tab value="cli">CLI</Tabs.Tab>
              <Tabs.Tab value="manual">Manual</Tabs.Tab>
            </Tabs.List>
            <Tabs.Panel value="cli" className="doc__panel">
              <div data-testid="install">
                <InstallCommand item={meta.name} />
              </div>
              <p className="doc-note">
                First time? Run <code>npx echo-ui-cli init</code> once —{" "}
                <a href="/docs/installation#set-the-project-up">it sets the project up</a>, and{" "}
                <code>add</code> refuses to run before it.
              </p>
            </Tabs.Panel>
            <Tabs.Panel value="manual" className="doc__panel">
              <ManualInstall item={meta.name} manual={data.manual} />
            </Tabs.Panel>
          </Tabs>
        )}
      </Section>

      {data.facts && (
        <Section id="at-a-glance" title="At a glance">
          <FactList facts={data.facts} />
        </Section>
      )}

      {meta.usage && (
        <Section id="usage" title="Usage">
          <CodeBlock code={`${meta.usage.imports.trim()}\n\n${meta.usage.code.trim()}`} label="tsx" />
        </Section>
      )}

      {meta.composition?.trim() && (
        <Section id="composition" title="Composition">
          <pre className="doc-tree" tabIndex={0}>
            {meta.composition.trimEnd()}
          </pre>
        </Section>
      )}

      <Section id="examples" title="Examples">
        {meta.examples.map((ex) => (
          <div key={ex.title} className="doc-example">
            <h3 className="doc-example__title">{ex.title}</h3>
            <p className="doc-example__about">{ex.description}</p>
            <CodeBlock code={ex.code} label="tsx" copyLabel={`${ex.title} example`} />
          </div>
        ))}
      </Section>

      {(meta.a11y?.length || !isCoreModule(meta.name)) && (
        <Section id="accessibility" title="Accessibility">
          {meta.a11y && meta.a11y.length > 0 && (
            <ul className="doc-list">
              {meta.a11y.map((line) => (
                <li key={line}>{inline(line)}</li>
              ))}
            </ul>
          )}
          {/*
           * What this component was actually tested against — the same record
           * its `/e/` item publishes and the MCP answers with. The
           * limits line is the part that earns the rest: six ticks and silence
           * about the seventh would read as "all of it is covered".
           */}
          {!isCoreModule(meta.name) && <Conformance />}
        </Section>
      )}

      {(meta.motion || (meta.sound && meta.sound.length > 0)) && (
        <Section id="motion-and-sound" title="Motion & sound">
          <dl className="doc-facts">
            {meta.motion && meta.motion.tokens.length > 0 && (
              <div className="doc-facts__row">
                <dt>Motion tokens</dt>
                <dd>
                  {meta.motion.tokens.map((t, i) => (
                    <span key={t}>
                      {i > 0 && ", "}
                      <code>{t}</code>
                    </span>
                  ))}
                </dd>
              </div>
            )}
            {meta.motion && (
              <div className="doc-facts__row">
                <dt>Reduced motion</dt>
                <dd>{inline(meta.motion.reducedMotion)}</dd>
              </div>
            )}
            {meta.sound?.map((line) => (
              <div key={line} className="doc-facts__row">
                <dt>Sound</dt>
                <dd>{inline(line)}</dd>
              </div>
            ))}
          </dl>
        </Section>
      )}

      <Section id="props" title="Props">
        <PropTable title={meta.title} props={props} note={meta.propsNote} />
      </Section>

      <Section id="anti-patterns" title="Anti-patterns" accent>
        <ul className="doc-list">
          {meta.antiPatterns.map((ap) => (
            <li key={ap}>{inline(ap)}</li>
          ))}
        </ul>
      </Section>

      {data.changelog.length > 0 && (
        <Section id="changelog" title="Changelog">
          <ChangelogList entries={data.changelog} />
        </Section>
      )}
    </article>
  );
}

/** One fact as a sentence; several as a list. */
function lines(facts: readonly string[]): ReactNode {
  if (facts.length === 1) return inline(facts[0]!);
  return (
    <ul className="doc-facts__list">
      {facts.map((line) => (
        <li key={line}>{inline(line)}</li>
      ))}
    </ul>
  );
}

/**
 * The fact card: what it weighs, what it needs, its keys, and what reduced
 * motion and sound do. Every line comes from the catalog the registry build
 * wrote, so it says what `docs` and the MCP server say.
 */
function FactList({ facts }: { facts: FactCard }) {
  const rows: [string, ReactNode][] = [];
  if (facts.version) rows.push(["Version", facts.version]);
  if (facts.weight) {
    rows.push([
      "Weight",
      <>
        {kb(facts.weight.js)}
        {facts.weight.withDependencies > facts.weight.js && <> · {kb(facts.weight.withDependencies)} with what it imports</>}
        {facts.weight.css > 0 && <> · {kb(facts.weight.css)} of CSS</>}
        <span className="doc-facts__aside"> (minified and gzipped; React not counted)</span>
      </>,
    ]);
  }
  if (facts.npm.length || facts.items.length) {
    rows.push([
      "Needs",
      [...facts.npm.map((d) => d), ...facts.items.map((i) => `${i} (Echo, brought with it)`)].join(", "),
    ]);
  }
  if (facts.keyboard.length) rows.push(["Keyboard", lines(facts.keyboard.map((line) => line.replace(/^Keyboard: /, "")))]);
  if (facts.reducedMotion) rows.push(["Reduced motion", inline(facts.reducedMotion)]);
  if (facts.sound.length) rows.push(["Sound", lines(facts.sound)]);
  return (
    <dl className="doc-facts">
      {rows.map(([term, detail]) => (
        <div key={term} className="doc-facts__row">
          <dt>{term}</dt>
          <dd>{detail}</dd>
        </div>
      ))}
    </dl>
  );
}

function Section({
  id,
  title,
  accent,
  children,
}: {
  id: string;
  title: string;
  /** Anti-patterns only: the one heading lit in the accent. */
  accent?: boolean;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="doc__section">
      <h2 id={id} className={accent ? "doc__h2 doc__h2--accent" : "doc__h2"}>
        {title}
      </h2>
      {children}
    </section>
  );
}

/**
 * Copy for AI agent, plus the MCP pointer.
 *
 * What it copies is the component's get_component answer, built on the server
 * by the same catalogComponent + renderComponent the MCP server uses — so a
 * person pasting it into a chat hands their agent exactly what an agent with
 * the MCP server would have fetched.
 */
function ActionRow({ slug, agentMarkdown }: { slug: string; agentMarkdown: string }) {
  const { copied, copy } = useCopy(2000);
  return (
    <div className="doc__actions">
      <HardwareButton size="sm" onClick={() => copy(agentMarkdown)}>
        {copied ? "Copied" : "Copy for AI agent"}
      </HardwareButton>
      <span role="status" aria-live="polite" className="doc-sr-only">
        {copied ? "Component docs copied as markdown — paste them into your agent" : ""}
      </span>
      <p className="doc__actions-note">
        Or let the agent fetch it: <code>get_component(&quot;{slug}&quot;)</code> on the{" "}
        <a href="/docs/mcp">Echo MCP server</a>.
      </p>
    </div>
  );
}

function ChangelogList({ entries }: { entries: readonly ItemChangelogEntry[] }) {
  return (
    <ul className="doc-changelog">
      {entries.map((e) => (
        <li key={`${e.version}:${e.category}:${e.text}`}>
          <span className="doc-changelog__meta">
            {e.version === "Unreleased" ? "Unreleased" : `v${e.version}`}
            {e.date && ` · ${e.date}`} · {e.category}
          </span>
          <span className="doc-changelog__text">{inline(e.text)}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * The prop table.
 *
 * Rendered with the registry's own Table rather than a bespoke <table>: the
 * docs site consuming its own components is the point, and Table already
 * solves the two things a hand-rolled one gets wrong — a real <caption> that
 * names the table, and an overflow container that can take focus so a wide
 * table is reachable by keyboard.
 *
 * The name column is scope="row", so a screen reader announces "variant,
 * type, boolean" instead of reading a bare grid of cells.
 */
function PropTable({
  title,
  props,
  note,
}: {
  title: string;
  props: readonly CatalogProp[];
  note?: string;
}) {
  // A passthrough component has nothing to tabulate; the note says why.
  if (props.length === 0) {
    return <p className="doc-note">{note ? inline(note) : `${title} takes no props.`}</p>;
  }

  return (
    <Table caption={`${title} props`} hideCaption>
      <Table.Head>
        <Table.Row>
          <Table.HeaderCell>Prop</Table.HeaderCell>
          <Table.HeaderCell>Type</Table.HeaderCell>
          <Table.HeaderCell>Default</Table.HeaderCell>
        </Table.Row>
      </Table.Head>
      <Table.Body>
        {props.map((p) => (
          <Table.Row key={p.name}>
            <Table.HeaderCell scope="row">
              <code className="doc-prop__name">{p.name}</code>
              {p.required && (
                <>
                  {" "}
                  {/* The asterisk is decorative; "required" is the announced word. */}
                  <span aria-hidden="true" className="doc-prop__required">
                    *
                  </span>
                  <span className="doc-sr-only">required</span>
                </>
              )}
              {p.description && <span className="doc-prop__about">{inline(p.description)}</span>}
            </Table.HeaderCell>
            <Table.Cell>
              <code className="doc-prop__type">{p.type}</code>
            </Table.Cell>
            <Table.Cell>
              {p.defaultValue === undefined ? (
                <span aria-hidden="true" className="doc-prop__dim">
                  —
                </span>
              ) : (
                <code className="doc-prop__type">{p.defaultValue}</code>
              )}
            </Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  );
}
