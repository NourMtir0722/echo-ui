import type { ReactNode } from "react";
import { SiteShell } from "@/components/site/SiteShell";

/**
 * Galleries render inside the same shell as the docs: a gallery is the group
 * overview, not a separate section of the site.
 */
export default function GalleryLayout({ children }: { children: ReactNode }) {
  return <SiteShell>{children}</SiteShell>;
}
