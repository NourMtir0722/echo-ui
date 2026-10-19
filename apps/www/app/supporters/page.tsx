import type { Metadata } from "next";
import { siteTheme } from "@/components/site/site-theme";
import { SEED_CHOSEN_ATTR } from "@/components/site/theme-boot";
import { LANDING_SEED } from "@/components/home/landing-seed";
import { SupportersPage } from "@/components/supporters/SupportersPage";
import { DONATION_AMOUNTS } from "@/components/support/donation-links";

export const metadata: Metadata = {
  title: "Supporters — Echo UI",
  description: `Echo's island: everyone who supports Echo has an Echo there, with their name and their links. Find yourself, or get your own Echo on the island, from $${DONATION_AMOUNTS[0]}.`,
};

/** In the brand's blue, as the homepage opens, until the visitor has picked a colour of their own. */
const OPENING_CSS = siteTheme(LANDING_SEED, { selector: `:root:not([${SEED_CHOSEN_ATTR}])` }).css;

export default function Page() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: OPENING_CSS }} />
      <SupportersPage />
    </>
  );
}
