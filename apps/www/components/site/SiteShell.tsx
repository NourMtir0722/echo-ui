/**
 * The docs surface's frame: SiteShellFrame, handed the sidebar's docs
 * sections from the server, so the manifest they come from never reaches the
 * browser.
 */
import type { ReactNode } from "react";
import { NAV_SECTIONS } from "@/components/site/docs-nav";
import { SiteShellFrame } from "@/components/site/SiteShellFrame";

export function SiteShell({ children }: { children: ReactNode }) {
  return <SiteShellFrame sections={NAV_SECTIONS}>{children}</SiteShellFrame>;
}
