import { z } from "zod";

export const appShellProps = z.object({
  bare: z
    .boolean()
    .default(false)
    .describe("Drop the sidebar column — for screens that are all content, where an empty rail is a margin pretending to be navigation."),
  embedded: z
    .boolean()
    .default(false)
    .describe("This shell is INSIDE another one (a preview, an embedded editor frame). Drops the skip link and demotes the landmarks — a page gets one <main>. Never set it on the shell that owns the page."),
  "Rail.brand": z.unknown().describe("The wordmark end: a logo, a product name, a home link."),
  "Rail.label": z.string().default("Main").describe("Landmark name for the rail's nav."),
  "Sidebar.label": z
    .string()
    .describe("Landmark name. Required — 'navigation' twice on one page tells a screen-reader user nothing."),
});

export const meta = {
  name: "echo-app-shell",
  title: "AppShell",
  description:
    "The app frame: a molded chassis rail lit from the key angle, a sticky sidebar, and the content between them. Slots, not props — the shell owns the layout, you own the contents. Ships the skip link by construction rather than as an option, and derives the sidebar's sticky offset from the rail's height so the two cannot drift. Below 900px the sidebar column is removed rather than stacked; pair it with a Sheet.",
  props: appShellProps,
  examples: [
    {
      title: "The frame",
      description: "Rail, sidebar, content. The skip link comes with it.",
      code: [
        "<AppShell>",
        "  <AppShell.Rail brand={<Wordmark />}>",
        '    <a href="/docs">Docs</a>',
        "  </AppShell.Rail>",
        '  <AppShell.Sidebar label="Components">{nav}</AppShell.Sidebar>',
        "  <AppShell.Content>{children}</AppShell.Content>",
        "</AppShell>",
      ].join("\n"),
    },
    {
      title: "No sidebar",
      description: "For a screen that is all content.",
      code: "<AppShell bare>\n  <AppShell.Rail brand={<Wordmark />} />\n  <AppShell.Content>{children}</AppShell.Content>\n</AppShell>",
    },
    {
      title: "Retuned metrics",
      description: "Both are custom properties, and the sidebar offset follows the rail.",
      code: '<AppShell\n  style={{ "--echo-shell-rail-h": "64px", "--echo-shell-side-w": "280px" } as React.CSSProperties}\n>\n  …\n</AppShell>',
    },
  ],
  feel: "The chassis the whole app sits in: a top rail, a lit sidebar, and a screen for the content.",
  usage: {
    imports: "import { AppShell } from \"@/echo/app-shell\";",
    code: [
      "<AppShell>",
      "  <AppShell.Rail brand={<Wordmark />}>",
      "    <a href=\"/docs\">Docs</a>",
      "  </AppShell.Rail>",
      "  <AppShell.Sidebar label=\"Components\">{nav}</AppShell.Sidebar>",
      "  <AppShell.Content>{children}</AppShell.Content>",
      "</AppShell>",
    ].join("\n"),
  },
  composition: "AppShell\n  AppShell.Rail\n  AppShell.Sidebar\n  AppShell.Content",
  a11y: [
    "Real landmarks: the rail is a `<header>` with a `<nav>`, the sidebar a `<nav>` named by `label`, the content a `<main>`.",
    "A skip link to the content comes first on every page. It is not optional.",
    "`embedded` (for a shell shown inside another page) drops the skip link and turns the landmarks into plain elements, because a page gets one `<main>`.",
    "Put `aria-current=\"page\"` on the link to the current page; the shell draws the lit rail from it, so the mark and the announcement cannot disagree. A key in the rail (a HardwareButton link) is announced as current but not marked: the mark would sit on its hit area.",
    "Focus is scrolled clear of the rail rather than under it (WCAG 2.4.11), from `scroll-margin-block-start` derived from `--echo-shell-rail-h` — so retuning the rail moves the offset with it. If you nest an `overflow` container inside Content, pad the document scrollport too: WebKit does not carry an element\u2019s scroll-margin out through a nested scrollport.",
  ],
  motion: {
    tokens: ["--echo-duration-swap"],
    reducedMotion: "Only colour changes on hover and selection; nothing moves.",
  },
  antiPatterns: [
    "Do not stack the sidebar above the content on a phone. It pushes every screen down by half a viewport and turns the nav into something you scroll past; below 900px the column is removed and the same list belongs in a Sheet behind a rail toggle.",
    "Never give the rail nav and the sidebar the same landmark name. Two navs called 'navigation' are two identical doors to a screen-reader user.",
    "Do not set the sidebar's sticky offset by hand. It is derived from --echo-shell-rail-h; hardcoding it leaves a dead band at the top of every sidebar the day the rail's height changes.",
    "Do not put page content in the Rail. It is sticky and it is a landmark — anything that scrolls away belongs in Content.",
    "Do not nest a shell inside another without `embedded`. AppShell.Content IS the page's <main>, and a second one is an axe violation — which is how the docs site's own preview of this component failed the suite.",
  ],
} as const;
