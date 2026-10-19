/**
 * The guide pages, in sidebar order, grouped by reader:
 * a developer wiring components, a designer retheming them, an agent building
 * with them.
 *
 * The pages themselves are MDX under app/docs/(guides)/<slug>/content.mdx,
 * rendered by a page.tsx beside it that carries the metadata. This list is
 * what the sidebar and the pager read; docs.spec.ts fails if a guide
 * directory exists that is not listed here, or the other way round.
 */

export interface Guide {
  /** URL segment under /docs; "" is /docs itself. */
  slug: string;
  title: string;
  /** One line, for the Introduction's "start here" paths and link previews. */
  blurb: string;
}

export interface GuideSection {
  label: string;
  guides: readonly Guide[];
}

export const GUIDE_SECTIONS: readonly GuideSection[] = [
  {
    label: "Get started",
    guides: [
      { slug: "", title: "Introduction", blurb: "What Echo is, how the registry works, and where to start." },
      { slug: "workflow", title: "The workflow", blurb: "Mood board to style to screen: the five steps, and the feature behind each one." },
      { slug: "installation", title: "Installation", blurb: "Set the project up, add a component, wire the theme." },
      { slug: "components", title: "Components", blurb: "Every item, grouped, with what it is for." },
      { slug: "cli", title: "CLI", blurb: "init, which, docs, check, test, style, add, list, diff, update and agent, and what the CLI refuses to do." },
      { slug: "checks", title: "Checks and tests", blurb: "What each check reads, when it runs and what it finds: the check, the page check, Echo's tests, the Stop gate and CI." },
      { slug: "in-your-project", title: "What Echo puts in your project", blurb: "Every file and block init writes, and how each one comes back out." },
      { slug: "echo-json", title: "echo.json", blurb: "Every field: the folder, the registry, the seed and style, the check's rules and what the tests run on." },
      { slug: "registry", title: "Registry", blurb: "How items, types and dependencies are laid out." },
      { slug: "changelog", title: "Changelog", blurb: "What changed, release by release." },
    ],
  },
  {
    label: "Design",
    guides: [
      { slug: "principles", title: "Principles", blurb: "What Echo believes, and what it leaves to you." },
      { slug: "theming", title: "Theming", blurb: "One seed in; every colour role derived from it." },
      { slug: "styles", title: "Styles", blurb: "A look of your own: read a moodboard, pick a style, wear it, on a dark device or a light one." },
      { slug: "typeset", title: "Typeset", blurb: "The four type roles and the scale." },
      { slug: "motion-and-sound", title: "Motion & sound", blurb: "What each token means, and how to bind it." },
      { slug: "patterns", title: "Patterns", blurb: "Forms, destructive actions, the four states of a screen, and a sound switch." },
      { slug: "content", title: "Content", blurb: "The words that go in the slots: labels, buttons, errors." },
    ],
  },
  {
    label: "AI",
    guides: [
      { slug: "mcp", title: "MCP server", blurb: "Give your agent the catalog, Echo's check and its styles, as ten tools it can call." },
      { slug: "plugin", title: "Plugin", blurb: "Echo in Claude and ChatGPT: the hosted server and the three skills, in one install." },
      { slug: "ai", title: "For AI agents", blurb: "What init tells an agent, how it asks, and how the check catches it." },
    ],
  },
];

export const GUIDES: readonly Guide[] = GUIDE_SECTIONS.flatMap((s) => s.guides);

export const guideHref = (g: Guide) => (g.slug ? `/docs/${g.slug}` : "/docs");
