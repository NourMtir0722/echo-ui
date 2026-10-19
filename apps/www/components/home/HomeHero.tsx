"use client";

/**
 * The hero: a rounded card that is the whole first screen.
 *
 * The nav is part of the card, laid out the way a product's is: the wordmark
 * on the left, the links in the middle; GitHub (once the repository is
 * public), X and Support on the right (NavTools.tsx). The site's own top bar stays out of the way until the card has
 * scrolled past (landing.css, `data-hero-passed`), and on a phone the card
 * leaves navigation to it.
 *
 * In the card: the brand's device, upright and floating a little, over a
 * faded grid, with DESIGN and SYSTEM right up against it on either side (what
 * makes Echo different: one design system, every component from the same
 * material), and the small words that finish the sentence: "The" over DESIGN,
 * "your AI agent builds with." under SYSTEM. The big words keep their balance;
 * read in order, the hero says who Echo is for. Then what it is, at the bottom
 * left, as wide as the two ways in under it: the plugin (Echo's listing in
 * ChatGPT, nothing to install) and the one command (in your code).
 *
 * The device is the brand's own (brand/Device.tsx), with its real keys, and
 * you can turn it over (DeviceSpinner). Echo lives on its screen; scroll, and
 * Echo steps out and comes down the page with you.
 */
import { useEffect, useRef, type ReactNode } from "react";
import { HardwareButton } from "@registry/echo/hardware-button";
import { ECHO_CLI } from "@registry/agent/guidance";
import { BrandDevice } from "@/components/brand/Device";
import { DeviceSpinner } from "@/components/home/DeviceSpinner";
import { NavTools } from "@/components/home/NavTools";
import { TOP_NAV } from "@/components/site/site-nav";
import { Wordmark } from "@/components/site/SiteTopBar";
import { useCopy } from "@/components/use-copy";
import { HeroLight } from "@/components/home/light/HeroLight";
import { OpenAIMark } from "@/components/home/blueprint/openai-mark";
import { CHATGPT_LISTING_URL } from "../../../../mcp/src/plugin-downloads";

const INIT = `npx ${ECHO_CLI} init`;

/**
 * The nav's left side: where most visits go. The rest are in the site's bar
 * and the footer. The plugin is here for the visitor with no terminal;
 * Templates isn't, while most of its screens are still to come.
 */
const PLUGIN = { href: "/docs/plugin", label: "Plugin" };
const LINKS = [
  ...TOP_NAV.filter((l) => l.href === "/docs"),
  PLUGIN,
  ...TOP_NAV.filter((l) => ["/motion", "/generator"].includes(l.href)),
];

function Icon({ children, fill = false }: { children: ReactNode; fill?: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill={fill ? "currentColor" : "none"}
      stroke={fill ? "none" : "currentColor"}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

function Command() {
  const { copied, copy } = useCopy();
  return (
    <button type="button" className="hero4__cmd" onClick={() => copy(INIT)} aria-label={copied ? "Copied" : `Copy the command: ${INIT}`}>
      <span className="hero4__cmd-prompt" aria-hidden="true">
        $
      </span>
      <code>{INIT}</code>
      <span className="hero4__cmd-icon" aria-hidden="true">
        {copied ? (
          <Icon>
            <path d="M5 12l5 5L20 7" />
          </Icon>
        ) : (
          <Icon>
            <rect x="9" y="9" width="11" height="11" rx="2" />
            <path d="M5 15V6a2 2 0 0 1 2-2h8" />
          </Icon>
        )}
      </span>
    </button>
  );
}


export function HomeHero({
  away = false,
}: {
  /** Echo is out on the page, not on the device's screen. */
  away?: boolean;
}) {
  const card = useRef<HTMLElement>(null);

  // The site's own top bar comes back once the card (and its nav) has scrolled away.
  useEffect(() => {
    const el = card.current;
    if (!el) return;
    const root = document.documentElement;
    const io = new IntersectionObserver(([e]) => root.toggleAttribute("data-hero-passed", !e!.isIntersecting), {
      rootMargin: "-72px 0px 0px 0px",
    });
    io.observe(el);
    return () => {
      io.disconnect();
      root.removeAttribute("data-hero-passed");
    };
  }, []);

  return (
    <section ref={card} className="hero4" aria-labelledby="hero-h" data-guide-section="">
      <HeroLight />
      <div className="hero4__grid" aria-hidden="true" />

      <header className="hero4__nav">
        {/* Whose page this is, where every visitor looks first: the top-left corner. */}
        <span className="hero4__brand">
          <Wordmark />
        </span>
        <nav className="hero4__links" aria-label="Main">
          {LINKS.map((l) => (
            <a key={l.href} className="hero4__link" href={l.href}>
              {l.label}
            </a>
          ))}
        </nav>
        <div className="hero4__support">
          <NavTools />
          <HardwareButton size="sm" href="/support">
            Support Echo
          </HardwareButton>
        </div>
      </header>

      {/* The words beside the device say it on the screen; the heading says it to everyone else. */}
      <h1 id="hero-h" className="hero4__sr">
        Echo: The design system your AI agent builds with
      </h1>

      <div className="hero4__device">
        {/*
          What Echo is, either side of the device and close to it, and the small words that
          make it a sentence. A picture of the words (the heading says it), so hidden from
          screen readers.
        */}
        <span className="hero4__small hero4__small--before" aria-hidden="true">
          The
        </span>
        <span className="hero4__word hero4__word--left" aria-hidden="true">
          DESIGN
        </span>
        <span className="hero4__word hero4__word--right" aria-hidden="true">
          SYSTEM
        </span>
        <span className="hero4__small hero4__small--after" aria-hidden="true">
          your AI agent builds with
        </span>
        {/* Upright and facing you, so Echo on its screen is easy to see; it floats a little at rest. */}
        <DeviceSpinner float>
          <BrandDevice away={away} />
        </DeviceSpinner>
      </div>

      <div className="hero4__offer">
        <p className="hero4__lede">
          {/* Open source already: the code ships under MIT through npm and the CLI. "on-brand" kept whole: a narrow line broke it at its hyphen. */}
          An open-source UI library for AI agents, and the check that keeps every screen{" "}
          <span style={{ whiteSpace: "nowrap" }}>on-brand</span> and accessible.
        </p>
        <div className="hero4__ctas">
          {/* The two ways in: in a chat, Echo's listing in ChatGPT, one click to add it; in your code, one command. */}
          <HardwareButton variant="primary" size="lg" impact href={CHATGPT_LISTING_URL} icon={<OpenAIMark className="hero4__key-mark" />}>
            chatgpt plugin
          </HardwareButton>
          <Command />
        </div>
      </div>
    </section>
  );
}
