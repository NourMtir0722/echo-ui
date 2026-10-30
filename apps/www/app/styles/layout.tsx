import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SiteShell } from "@/components/site/SiteShell";

// The page is a client component, so it can't say this itself.
export const metadata: Metadata = {
  title: "Styles — Echo UI",
  description: "Switch between the styles Echo publishes on real components, and the whole site wears the one you choose.",
};

/** A tool, so it renders inside the same shell as the docs, as Themes does. */
export default function StylesLayout({ children }: { children: ReactNode }) {
  return <SiteShell>{children}</SiteShell>;
}
