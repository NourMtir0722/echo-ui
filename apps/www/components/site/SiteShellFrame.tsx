"use client";

/**
 * The docs surface's frame.
 *
 * This used to be a hand-rolled shell — a sticky rail, a sticky sidebar and a
 * grid — written because no such component existed. Echo now ships
 * `echo-app-shell`, so it renders that instead: the item is not finished until
 * the site can delete its own version, and anything the site still needed
 * afterwards would have been a gap in the component rather than a special case.
 *
 * What is left here is genuinely this site's, not any app's: which links exist
 * (from the manifest, so there is still ONE list), which one is current, and
 * the phone nav Sheet behind the rail's toggle — which is the pairing
 * app-shell's own docs recommend, since below 900px it removes the sidebar
 * column rather than stacking it.
 */
import { useState, type ReactNode } from "react";
import { AppShell } from "@registry/echo/app-shell";
import { Sheet } from "@registry/echo/sheet";
import { TopNavLinks, Wordmark } from "@/components/site/SiteTopBar";
import { SidebarNav } from "@/components/site/SidebarNav";
import type { NavSection } from "@/components/site/site-nav";
import { useSidebarScroll } from "@/components/site/use-sidebar-scroll";
import "./site-shell.css";

export function SiteShellFrame({ children, sections }: { children: ReactNode; sections: readonly NavSection[] }) {
  const [navOpen, setNavOpen] = useState(false);
  useSidebarScroll();

  return (
    <AppShell>
      <AppShell.Rail label="Site" brand={<Wordmark />}>
        <Sheet side="left" open={navOpen} onOpenChange={setNavOpen}>
          <Sheet.Trigger className="echo-navtoggle" aria-label="Browse components">
            <span aria-hidden="true">☰</span>
            Components
          </Sheet.Trigger>
          <Sheet.Content title="Components" description="Every item in the registry.">
            <nav className="echo-sidenav echo-sidenav--sheet" aria-label="Components">
              <SidebarNav sections={sections} onNavigate={() => setNavOpen(false)} />
            </nav>
          </Sheet.Content>
        </Sheet>
        <TopNavLinks />
      </AppShell.Rail>

      <AppShell.Sidebar label="Components" className="echo-sidenav">
        <SidebarNav sections={sections} />
      </AppShell.Sidebar>

      <AppShell.Content>{children}</AppShell.Content>
    </AppShell>
  );
}
