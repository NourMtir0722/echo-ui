/**
 * A supporter's links: what each kind is called, its mark, and how a link is
 * written where it can't be pressed (the video: "@ana", "in/ana", not a URL).
 * Pure, so the card, the video and the tests share one answer.
 */
import type { LinkKind } from "@/components/support/supporters";

export const LINK_NAME: Record<LinkKind, string> = { x: "X", linkedin: "LinkedIn", youtube: "YouTube", site: "Website" };

/** Each kind's mark on a 24-unit square: filled, or (the site's globe) drawn as a line. */
export const LINK_MARK: Record<LinkKind, { d: string; line?: boolean }> = {
  x: { d: "M17.75 3h3.07l-6.72 7.68L22 21h-6.2l-4.85-6.35L5.4 21H2.33l7.19-8.21L2 3h6.35l4.39 5.8L17.75 3zm-1.08 16.2h1.7L7.4 4.73H5.58L16.67 19.2z" },
  linkedin: {
    d: "M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9.75h4v11.25H3zM9.5 9.75h3.8v1.6h.06c.53-.95 1.83-1.95 3.77-1.95 4.03 0 4.77 2.6 4.77 6v5.6h-4v-4.96c0-1.18-.02-2.7-1.66-2.7-1.66 0-1.92 1.29-1.92 2.62V21h-4z",
  },
  youtube: {
    d: "M21.6 7.2a2.5 2.5 0 0 0-1.76-1.77C18.27 5 12 5 12 5s-6.27 0-7.84.43A2.5 2.5 0 0 0 2.4 7.2 26 26 0 0 0 2 12a26 26 0 0 0 .4 4.8 2.5 2.5 0 0 0 1.76 1.77C5.73 19 12 19 12 19s6.27 0 7.84-.43a2.5 2.5 0 0 0 1.76-1.77A26 26 0 0 0 22 12a26 26 0 0 0-.4-4.8zM10 15.2V8.8l5.2 3.2z",
  },
  site: {
    d: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm0 0c2.5 2.6 3.75 5.6 3.75 9S14.5 18.4 12 21M12 3C9.5 5.6 8.25 8.6 8.25 12S9.5 18.4 12 21M3.5 9h17M3.5 15h17",
    line: true,
  },
};

/** How a link reads written out: "@ana" on X and YouTube, "in/ana" on LinkedIn, a site by its address. */
export function handleOf(kind: LinkKind, href: string): string {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return href;
  }
  const parts = url.pathname.split("/").filter(Boolean);
  const host = url.hostname.replace(/^www\./, "");
  switch (kind) {
    case "x":
      return parts[0] ? `@${parts[0].replace(/^@/, "")}` : host;
    case "youtube":
      if (parts[0]?.startsWith("@")) return parts[0];
      return ["c", "user", "channel"].includes(parts[0] ?? "") && parts[1] ? parts[1] : (parts[0] ?? host);
    case "linkedin":
      return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : host;
    case "site":
      return host + (parts.length ? `/${parts.join("/")}` : "");
  }
}
