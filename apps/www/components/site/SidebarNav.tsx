"use client";

/**
 * The one component list, extracted so the desktop rail
 * and the mobile Sheet render the SAME markup from the SAME manifest.
 *
 * Duplicating it would have re-created the exact problem the manifest exists to remove:
 * two lists that can disagree. There is still one list; it is just shown two
 * ways.
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BRAND, TOOLS, type NavLink, type NavSection } from "@/components/site/site-nav";
import { GUIDE_SECTIONS, guideHref } from "@/components/guides";

/** The guide pages first, one group per reader. */
const GUIDE_GROUPS: readonly (readonly [string, readonly NavLink[]])[] = GUIDE_SECTIONS.map((s) => [
  s.label,
  s.guides.map((g) => ({ href: guideHref(g), label: g.title })),
]);

/** One group of links under its label. */
function Group({
  label,
  links,
  overview,
  pathname,
  onNavigate,
}: {
  label: string;
  links: readonly NavLink[];
  overview?: { href: string; label?: string };
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <div className="echo-sidenav__group">
      <span className="echo-sidenav__label">{label}</span>
      {overview && (
        <Link
          className="echo-sidenav__overview"
          href={overview.href}
          aria-current={pathname === overview.href ? "page" : undefined}
          onClick={onNavigate}
        >
          ↳ {overview.label ?? "overview"}
        </Link>
      )}
      {links.map((item) => (
        <Link key={item.href} href={item.href} aria-current={pathname === item.href ? "page" : undefined} onClick={onNavigate}>
          {item.label}
        </Link>
      ))}
    </div>
  );
}

/**
 * In the order a reader needs them: the guides, the tools, every component
 * by what you're building, and last the brand, which is Echo's own and not
 * something you install.
 */
/** `sections` are the docs groups, handed down from the server (see SiteShell). */
export function SidebarNav({ sections, onNavigate }: { sections: readonly NavSection[]; onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <>
      {GUIDE_GROUPS.map(([label, links]) => (
        <Group key={label} label={label} links={links} pathname={pathname} onNavigate={onNavigate} />
      ))}
      <Group label="Tools" links={TOOLS} pathname={pathname} onNavigate={onNavigate} />
      {sections.map((section) => (
        <Group
          key={section.group}
          label={section.group}
          links={section.items}
          overview={section.overview}
          pathname={pathname}
          onNavigate={onNavigate}
        />
      ))}
      <Group label="Brand" links={BRAND} pathname={pathname} onNavigate={onNavigate} />
    </>
  );
}
