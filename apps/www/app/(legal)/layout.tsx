import type { ReactNode } from "react";
import { SiteShell } from "@/components/site/SiteShell";
import "@/components/component-doc.css";
import "@/components/guides/guide.css";

/**
 * The privacy policy, the terms and the contact page: prose in the guides'
 * frame, inside the site's shell, at addresses of their own (`/privacy`,
 * `/terms`, `/contact`) rather than under `/docs`, because the plugin
 * directories link to them from outside.
 */
export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <SiteShell>
      <article className="doc guide">{children}</article>
    </SiteShell>
  );
}
