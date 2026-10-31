import type { Metadata } from "next";
import type { ReactNode } from "react";
import { analyticsScript } from "@/components/site/analytics";
import { siteTheme } from "@/components/site/site-theme";
import { THEME_BOOT_SCRIPT } from "@/components/site/theme-boot";
import { siteFonts } from "@/components/brand/fonts";
import { styleFonts } from "@/components/site/style-fonts";
import { CLI_RELEASED, REGISTRY_HOMEPAGE } from "@registry/agent/guidance";
import "./targets.css";

/**
 * `metadataBase` is what turns the generated social card into an absolute URL;
 * without it Next warns and crawlers get a relative path they cannot fetch. It
 * reads the registry's own homepage so the card, the install line and the
 * catalog all name one host (see `identity.test.ts`).
 */
export const metadata: Metadata = {
  metadataBase: new URL(REGISTRY_HOMEPAGE),
  title: "Echo UI",
  description:
    "Tactile UI components for React: buttons, knobs and switches that look like real hardware and click when you press them. Free, MIT-licensed and accessible.",
  /*
   * Belt and braces with `app/robots.ts`, and deliberately so: `robots.txt` is
   * a request a crawler may ignore, while a `noindex` on the page is a
   * directive it must obey to stay in the index at all. Until the packages
   * resolve, every install line on this site is a line that cannot work, and
   * the cost of it being found is paid over months of search results.
   *
   * Both come off together when `CLI_RELEASED` flips — `release-state.test.ts`
   * fails in both directions, so neither can be left behind.
   */
  ...(CLI_RELEASED ? {} : { robots: { index: false, follow: false } }),
};

/**
 * The token bootstrap for the whole site.
 *
 * Every page used to inject its own copy of this, which is why the chrome had
 * nowhere to get its colors from and ended up with hardcoded hexes. Emitting
 * it once at the root means the site chrome, the docs and the components all
 * read the same seed — reseed it and the navigation relights with them.
 */
const themeCss = siteTheme().css;

/*
 * This is the ONLY place a page gets its theme. Pages must not emit their own
 * `siteTheme().css`: a second :root block later in the document wins by order,
 * and it used to put every page back on the default seed whatever the visitor
 * had chosen. A chosen seed rides on top of this block (see theme-store.ts).
 */

/*
 * The type roles used to be declared here, in the docs app.
 *
 * That was the shape of the bug: `--echo-font-machine` and `--echo-font-lcd`
 * were referenced 60 times across the registry and defined nowhere at all,
 * while the two roles that WERE defined lived in the one place a consumer
 * installing from the registry would never get. `createEchoTheme` now emits
 * all four, so an installed component inherits its type from the theme and the
 * docs app is no longer a second source of truth.
 */

export default function RootLayout({ children }: { children: ReactNode }) {
  const analytics = analyticsScript();
  return (
    // The boot script marks <html> for a returning visitor's colour before React hydrates.
    // The faces of the styles Echo publishes are declared on every page, for the Themes switch,
    // and download only when a style that names them is worn (style-fonts.ts).
    <html lang="en" className={`${siteFonts} ${styleFonts}`} suppressHydrationWarning>
      <head>
        <style>{themeCss}</style>
        {/* The visitor's saved seed, before first paint. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
        {analytics && <script {...analytics} />}
      </head>
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          background: "var(--echo-well)",
          color: "var(--echo-text)",
          fontFamily: "var(--echo-font-sans)",
        }}
      >
        {children}
      </body>
    </html>
  );
}
