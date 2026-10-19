"use client";

/** Previous / next through the guides, in sidebar order. */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { GUIDES, guideHref } from "@/components/guides";

export function GuidePager() {
  const pathname = usePathname();
  const i = GUIDES.findIndex((g) => guideHref(g) === pathname);
  if (i === -1) return null;
  const prev = GUIDES[i - 1];
  const next = GUIDES[i + 1];

  return (
    <nav className="guide__pager" aria-label="Guides">
      {prev ? (
        <Link href={guideHref(prev)} className="guide__pager-link">
          <span className="guide__pager-dir">← Previous</span>
          {prev.title}
        </Link>
      ) : (
        <span />
      )}
      {next && (
        <Link href={guideHref(next)} className="guide__pager-link guide__pager-link--next">
          <span className="guide__pager-dir">Next →</span>
          {next.title}
        </Link>
      )}
    </nav>
  );
}
