"use client";

/**
 * SideNav. The navigation down the side of an app: groups under machine-voice
 * headings, items with an icon and a count, nested items that fold away, and
 * one lit rail that marks where you are. Navigate and the rail travels to the
 * new item as a drop, stretching toward it and settling, so the eye follows.
 *
 * `collapsed` folds it to its icons (for AppShell's sidebar on a narrow
 * desktop); every link keeps its name, and its label shows as a tip on
 * hover or focus. Nested groups open by themselves when they hold the
 * current page.
 *
 * Closed and data-driven: `groups` of `items`, `current` is the href you're
 * on, and `renderLink` hands each link to your router.
 */
import { useId, useLayoutEffect, useRef, useState, type CSSProperties, type ReactElement, type ReactNode } from "react";
import { Collapsible as BaseCollapsible } from "@base-ui/react/collapsible";
import { useSoundOptional } from "echo-ui-core/sound";
import "./side-nav.css";

export interface SideNavItem {
  label: string;
  href?: string;
  icon?: ReactNode;
  /** A count beside it: unread, open, new. */
  badge?: number;
  /** Nested items: this one becomes a group that folds open. */
  items?: SideNavItem[];
}

export interface SideNavGroup {
  /** The group's heading; leave it out for an ungrouped list. */
  label?: string;
  items: SideNavItem[];
}

export interface LinkProps {
  href: string;
  className: string;
  "aria-current"?: "page";
  children: ReactNode;
  onClick?: () => void;
}

export interface SideNavProps {
  /** Names the navigation landmark ("Main", "Workspace"). */
  label: string;
  groups: SideNavGroup[];
  /** The href of the page you're on. */
  current?: string;
  /** Folded to its icons. */
  collapsed?: boolean;
  /** Called after any link is followed (close a mobile sheet here). */
  onNavigate?: () => void;
  /** Render each link through your router: `(props) => <NextLink {...props} />`. */
  renderLink?: (props: LinkProps) => ReactElement;
}

const holds = (item: SideNavItem, current?: string): boolean =>
  !!current && (item.href === current || !!item.items?.some((i) => holds(i, current)));

function Chevron() {
  return (
    <svg className="echo-side-nav__chevron" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M6 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function SideNav({ label, groups, current, collapsed = false, onNavigate, renderLink }: SideNavProps) {
  const root = useRef<HTMLElement>(null);
  const rail = useRef<HTMLSpanElement>(null);
  const sound = useSoundOptional();
  const [placed, setPlaced] = useState(false);
  const uid = useId();

  // The one rail: moved to the current link, stretched toward it on the way.
  useLayoutEffect(() => {
    const el = root.current;
    const r = rail.current;
    if (!el || !r) return;
    const place = () => {
      const link = el.querySelector<HTMLElement>('[aria-current="page"]');
      if (!link || link.offsetParent === null) {
        r.style.opacity = "0";
        return;
      }
      const box = link.getBoundingClientRect();
      const frame = el.getBoundingClientRect();
      r.style.opacity = "1";
      r.style.transform = `translateY(${(box.top - frame.top + el.scrollTop).toFixed(1)}px)`;
      r.style.height = `${box.height.toFixed(1)}px`;
    };
    place();
    setPlaced(true);
    const ro = new ResizeObserver(place);
    ro.observe(el);
    return () => ro.disconnect();
  }, [current, collapsed]);

  const link = (item: SideNavItem, depth: number) => {
    const here = item.href === current;
    const content = (
      <>
        {item.icon ? (
          <span className="echo-side-nav__icon" aria-hidden="true">
            {item.icon}
          </span>
        ) : null}
        <span className="echo-side-nav__text">{item.label}</span>
        {item.badge ? (
          <span className="echo-side-nav__badge">
            {item.badge > 99 ? "99+" : item.badge}
            <span className="echo-side-nav__sr"> new</span>
          </span>
        ) : null}
      </>
    );
    const props: LinkProps = {
      href: item.href!,
      className: "echo-side-nav__link",
      ...(here ? { "aria-current": "page" as const } : {}),
      onClick: () => {
        sound?.play("tap");
        onNavigate?.();
      },
      children: content,
    };
    return (
      <li key={item.href ?? item.label} style={{ "--depth": depth } as CSSProperties} data-tip={collapsed ? item.label : undefined}>
        {renderLink ? renderLink(props) : <a {...props} />}
      </li>
    );
  };

  const entry = (item: SideNavItem, depth: number): ReactNode => {
    if (!item.items?.length) return link(item, depth);
    return (
      <li key={item.label} style={{ "--depth": depth } as CSSProperties}>
        <BaseCollapsible.Root defaultOpen={holds(item, current)}>
          <BaseCollapsible.Trigger className="echo-side-nav__link echo-side-nav__folder" data-tip={collapsed ? item.label : undefined}>
            {item.icon ? (
              <span className="echo-side-nav__icon" aria-hidden="true">
                {item.icon}
              </span>
            ) : null}
            <span className="echo-side-nav__text">{item.label}</span>
            <Chevron />
          </BaseCollapsible.Trigger>
          <BaseCollapsible.Panel className="echo-side-nav__panel">
            <ul className="echo-side-nav__list">{item.items.map((i) => entry(i, depth + 1))}</ul>
          </BaseCollapsible.Panel>
        </BaseCollapsible.Root>
      </li>
    );
  };

  return (
    <nav ref={root} className="echo-side-nav" aria-label={label} data-collapsed={collapsed ? "" : undefined} data-placed={placed ? "" : undefined}>
      <span ref={rail} className="echo-side-nav__rail" aria-hidden="true" />
      {groups.map((g, gi) => (
        <div key={g.label ?? gi} className="echo-side-nav__group">
          {g.label ? (
            <span className="echo-side-nav__heading" id={`${uid}-${gi}`}>
              {g.label}
            </span>
          ) : null}
          <ul
            className="echo-side-nav__list"
            {...(g.label ? { "aria-labelledby": `${uid}-${gi}` } : {})}
          >
            {g.items.map((i) => entry(i, 0))}
          </ul>
        </div>
      ))}
    </nav>
  );
}
