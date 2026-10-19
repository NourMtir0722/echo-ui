import type { Metadata } from "next";
import { siteTheme } from "@/components/site/site-theme";
import { SEED_CHOSEN_ATTR } from "@/components/site/theme-boot";
import { LANDING_SEED } from "@/components/home/landing-seed";
import { Welcome } from "@/components/supporters/Welcome";

export const metadata: Metadata = {
  title: "Thank you — Echo UI",
  description: "Where a supporter puts their Echo on the island, right after supporting Echo.",
  // Only for the moment after a payment: nothing a search should send anyone to.
  robots: { index: false, follow: false },
};

/** In the brand's blue, as /supporters opens, until the visitor has picked a colour of their own. */
const OPENING_CSS = siteTheme(LANDING_SEED, { selector: `:root:not([${SEED_CHOSEN_ATTR}])` }).css;

export default function Page() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: OPENING_CSS }} />
      <Welcome />
    </>
  );
}
