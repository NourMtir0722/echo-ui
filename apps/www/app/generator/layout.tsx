import type { ReactNode } from "react";
import { SiteShell } from "@/components/site/SiteShell";

/**
 * The tools render inside the same shell as the docs. They used to be bare
 * pages with no rail and no sidebar, so opening Themes left you with no way
 * back except the browser. The shell owns the page's one `<main>`.
 */
export default function ToolLayout({ children }: { children: ReactNode }) {
  return <SiteShell>{children}</SiteShell>;
}
