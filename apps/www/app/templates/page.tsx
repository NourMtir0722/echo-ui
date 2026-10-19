/**
 * The templates index.
 */
import type { Metadata } from "next";
import { SiteShell } from "@/components/site/SiteShell";
import { TemplatesIndex } from "@/components/TemplatePage";
import { TemplateList } from "@/components/TemplateList";

export const metadata: Metadata = {
  title: "Templates — Echo UI",
  description:
    "Whole screens built from shipped Echo components, each installable in one command. Each one proves something a component page cannot.",
};

export default function Page() {
  return (
    <SiteShell>
      <TemplatesIndex>
        <TemplateList withInstall withComingSoon />
      </TemplatesIndex>
    </SiteShell>
  );
}
