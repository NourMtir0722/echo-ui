import type { Metadata } from "next";
import { HomePage } from "@/components/home/HomePage";
import { registrySummary } from "@/components/docs-server";
import { siteTheme } from "@/components/site/site-theme";
import { SEED_CHOSEN_ATTR } from "@/components/site/theme-boot";
import { LANDING_SEED } from "@/components/home/landing-seed";
import { roadStyles } from "@/components/home/road-css";
import { REPO_PUBLIC } from "@/components/site/repo";

/*
 * The homepage opens on Sky until the visitor picks a colour. Rendered here,
 * on the server, so the first paint is already Sky; scoped to a root without
 * the chosen mark, so a saved choice (put back before paint by the boot
 * script) always wins.
 */
const OPENING_CSS = siteTheme(LANDING_SEED, { selector: `:root:not([${SEED_CHOSEN_ATTR}])` }).css;

export const metadata: Metadata = {
  title: "Echo UI — Tactile design system for React",
  // "Open source" only once the repository can be opened (REPO_PUBLIC, components/site/repo.ts).
  description: `A tactile design system for React: components that press, click and move, with your own style on top and an AI agent that keeps to it. Accessible (WCAG 2.2 AA), free ${REPO_PUBLIC ? "and open source " : ""}under the MIT licence, and copied into your project with npx echo-ui-cli.`,
};

export default function Page() {
  // Counted from the registry, so the page can't state a number that has moved.
  const { byType } = registrySummary();
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: OPENING_CSS }} />
      <HomePage
        counts={{ components: byType["registry:component"] ?? 0, templates: byType["registry:block"] ?? 0 }}
      />
      {/*
        The road's and the close's stylesheets (journey.css, blueprint.css), set into the page after its content instead of linked
        from its head: a stylesheet in the head holds the hero's first paint until it has downloaded,
        and the road, two screens down, needs its rules only by the time it's scrolled to.
      */}
      <style dangerouslySetInnerHTML={{ __html: roadStyles() }} />
    </>
  );
}
