"use client";

/**
 * AppShell. The frame every
 * app screen sits in: a top rail, a sidebar, and the content between them.
 *
 * This one has a built-in honesty test. `apps/www` hand-rolled exactly this
 * shell before this item existed and has been running it ever since, so the item is not
 * finished until the docs site can delete its own version and render this
 * instead. Anything the site still needs afterwards is a gap in the component,
 * not a special case — which is why the parts below are slots rather than
 * props: the shell owns the LAYOUT, the consumer owns the contents.
 *
 *   <AppShell>
 *     <AppShell.Rail brand={…}>…</AppShell.Rail>
 *     <AppShell.Sidebar label="Components">…</AppShell.Sidebar>
 *     <AppShell.Content>…</AppShell.Content>
 *   </AppShell>
 *
 * The sidebar is `position: sticky` under the rail rather than `fixed`, so it
 * scrolls its own overflow without the content jumping — and so a page with a
 * short sidebar does not leave a tall empty column.
 */
import { createContext, useContext, type HTMLAttributes, type ReactNode } from "react";
import "./app-shell.css";

const cx = (...c: (string | undefined)[]) => c.filter(Boolean).join(" ");

export interface AppShellProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
  /**
   * Hide the sidebar column. For screens that are all content — a login, a
   * settings page reached from elsewhere — where an empty rail is just a
   * margin pretending to be navigation.
   */
  bare?: boolean;
  /**
   * This shell is rendered INSIDE another one — a preview on a design-system
   * page, an embedded editor frame. Drops the skip link and demotes the
   * landmarks to plain elements, because a page gets one `<main>` and one
   * skip target, and a second of either is an accessibility defect rather
   * than a nicety. The layout is identical.
   *
   * Never set this on the shell that owns the page.
   */
  embedded?: boolean;
}

/**
 * Landmarks are the shell's job, so they travel down rather than being passed
 * to each part by the consumer — who would then be the one who forgets.
 */
const EmbeddedContext = createContext(false);

/**
 * The skip link is not optional and not a prop. Every keyboard user of every
 * screen built on this shell has to be able to get past the navigation, and
 * making it opt-in guarantees that someone ships without it.
 */
export function AppShellRoot({ children, bare, embedded, className, ...rest }: AppShellProps) {
  return (
    <EmbeddedContext.Provider value={Boolean(embedded)}>
      <div className={cx("echo-shell", className)} data-bare={bare ? "" : undefined} {...rest}>
        {!embedded && (
          <a className="echo-shell__skip" href="#echo-shell-content">
            Skip to content
          </a>
        )}
        {children}
      </div>
    </EmbeddedContext.Provider>
  );
}

export interface AppShellRailProps extends HTMLAttributes<HTMLElement> {
  /** The wordmark end — a logo, a product name, a home link. */
  brand?: ReactNode;
  /** Navigation and controls, pushed to the trailing edge. */
  children?: ReactNode;
  /** Landmark name. Two navs on a page need distinct names to be navigable. */
  label?: string;
}

export function AppShellRail({ brand, children, label = "Main", className, ...rest }: AppShellRailProps) {
  const embedded = useContext(EmbeddedContext);
  const Bar = embedded ? "div" : "header";
  const Nav = embedded ? "div" : "nav";
  return (
    <Bar className={cx("echo-shell__rail", className)} {...rest}>
      {brand != null ? <div className="echo-shell__brand">{brand}</div> : null}
      <Nav className="echo-shell__railnav" aria-label={embedded ? undefined : label}>
        {children}
      </Nav>
    </Bar>
  );
}

export interface AppShellSidebarProps extends HTMLAttributes<HTMLElement> {
  /**
   * Landmark name. Required in practice — "navigation" twice on one page tells
   * a screen-reader user nothing about which is which.
   */
  label: string;
  children?: ReactNode;
}

export function AppShellSidebar({ label, children, className, ...rest }: AppShellSidebarProps) {
  const embedded = useContext(EmbeddedContext);
  const Side = embedded ? "div" : "nav";
  return (
    <Side
      className={cx("echo-shell__side", className)}
      aria-label={embedded ? undefined : label}
      {...rest}
    >
      {children}
    </Side>
  );
}

export function AppShellContent({ children, className, ...rest }: HTMLAttributes<HTMLElement>) {
  const embedded = useContext(EmbeddedContext);
  // <main> and the skip target are the same element, so the link lands on the
  // landmark rather than next to it.
  const Content = embedded ? "div" : "main";
  return (
    <Content
      id={embedded ? undefined : "echo-shell-content"}
      className={cx("echo-shell__content", className)}
      {...rest}
    >
      {children}
    </Content>
  );
}

// The compound `AppShell` (AppShell.Rail, …) is assembled in index.ts, which is
// not a client module: parts attached here don't survive a server component's
// import, so AppShell.Rail was undefined in a server layout.
