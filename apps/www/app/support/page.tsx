import type { Metadata } from "next";
import { siteTheme } from "@/components/site/site-theme";
import { SEED_CHOSEN_ATTR } from "@/components/site/theme-boot";
import { LANDING_SEED } from "@/components/home/landing-seed";
import { SupportPage } from "@/components/support/SupportPage";

export const metadata: Metadata = {
  title: "Support Echo — Echo UI",
  description:
    "Echo UI is free, under the MIT licence. Support it once or monthly, and you get an Echo of your own on its island, with your name and your links.",
};

/** In the brand's blue, as the homepage and the island open, until the visitor has picked a colour of their own. */
const OPENING_CSS = siteTheme(LANDING_SEED, { selector: `:root:not([${SEED_CHOSEN_ATTR}])` }).css;

export default function Page() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: OPENING_CSS }} />
      <SupportPage />
    </>
  );
}
