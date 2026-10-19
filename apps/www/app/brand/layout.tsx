import type { ReactNode } from "react";
import { SiteShell } from "@/components/site/SiteShell";

/** The brand pages render inside the site shell. The faces load at the root. */
export default function BrandLayout({ children }: { children: ReactNode }) {
  return (
    <SiteShell>{children}</SiteShell>
  );
}
