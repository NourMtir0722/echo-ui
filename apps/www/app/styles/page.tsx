"use client";

/**
 * The styles Echo publishes, on real components, and the switch between them.
 *
 * Themes is the page for colours; this is the page for whole looks. The two
 * share the site's one seed (theme-store.ts), so a style chosen here is worn by
 * every page the visitor opens next, and survives a reload, as a colour does.
 * Echo's own brings back what the visitor left: their colour on their device.
 *
 * The list is PUBLISHED_STYLES, the same files the CLI and the MCP server read,
 * so a style can't be in one and missing from another, and a new one shows here
 * by itself. A style also travels as a link, `/styles?style=ink-instrument`,
 * which is what the MCP server hands a builder (seed-link.ts).
 */
import { useEffect } from "react";
import { SoundProvider } from "echo-ui-core/sound";
import { runCommand } from "@registry/agent/guidance";
import { PUBLISHED_STYLES } from "@registry/agent/published-styles";
import { ChoiceCards } from "@registry/echo/choice-cards";
import { CodeBlock } from "@/components/CodeBlock";
import { StyleBench } from "@/components/StyleBench";
import { seedFromSearch } from "@/components/site/seed-link";
import { STYLE_PRESETS, setSiteSeed, useSiteSeed, wearEchoStyle } from "@/components/site/theme-store";
import "echo-ui-core/theme/material.css";
import "@/components/component-doc.css";
import "@/components/site/tool.css";
import "./styles.css";

/** Echo's own: the style the site wears when a seed names none. */
const ECHO = "echo";

const OPTIONS = PUBLISHED_STYLES.map((s) => ({ value: s.name, title: s.title, description: s.essence }));

export default function StylesPage() {
  const [seed] = useSiteSeed();
  const worn = seed.style ?? ECHO;

  // Open a style's link once, then take it out of the address bar: a reload
  // after switching must not put the link's style back.
  useEffect(() => {
    const incoming = seedFromSearch(window.location.search);
    if (!incoming?.style) return;
    setSiteSeed(incoming);
    window.history.replaceState(null, "", window.location.pathname + window.location.hash);
  }, []);

  const wear = (name: string) => {
    const style = STYLE_PRESETS.find((p) => p.seed.style === name);
    if (style) setSiteSeed(style.seed);
    else wearEchoStyle();
  };

  return (
    <SoundProvider>
      <div className="tool-page">
        <header className="tool-head">
          <p className="tool-eyebrow">Tools</p>
          <h1 className="tool-title">Styles</h1>
          <p className="tool-lede">
            A style is a whole look: its colours, its type, its corners and how every part is made. The components
            stay the same. Switch between the styles Echo publishes and the whole site wears the one you choose.
          </p>
        </header>

        <section className="styles__choice" aria-label="Choose a style">
          <ChoiceCards
            label="Style"
            options={OPTIONS}
            value={worn}
            onValueChange={(name) => wear(name as string)}
            minCardWidth="min(18rem, 100%)"
          />
          <CodeBlock code={runCommand(`style use ${worn}`)} label="terminal" copyLabel="the command" />
        </section>

        <StyleBench />
      </div>
    </SoundProvider>
  );
}
