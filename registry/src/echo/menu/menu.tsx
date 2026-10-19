"use client";

/**
 * Menu. Base UI Menu behavior —
 * typeahead, roving focus, submenu timing, checkbox/radio item semantics — with
 * the Echo floating-panel skin and two distinct sounds.
 *
 * Compound API, because the content is arbitrary:
 *   <Menu>
 *     <Menu.Trigger>Actions</Menu.Trigger>
 *     <Menu.Content>
 *       <Menu.Item onClick={…}>Rename</Menu.Item>
 *     </Menu.Content>
 *   </Menu>
 *
 * `Menu.Content` collapses Base UI's Portal → Positioner → Popup triple, which
 * every consumer would otherwise retype, and takes the placement props on
 * itself. The rest are thin skins, so anything Base UI's Menu can do — groups,
 * radio items, nested submenus — works here unchanged.
 *
 * ContextMenu is exported from the same item and shares every part but the
 * root and the trigger, which is exactly how Base UI factors it: a right-click
 * menu is the same menu with a different way of being summoned, and giving it
 * a separate skin would be two vocabularies for one object.
 *
 * SOUND. A menu has two events where a Popover has one, so it needs two
 * sounds: `transition` when the panel arrives (the Modal family — something
 * appeared) and `select` when an item commits (the Select family — a choice
 * was made). Using one token for both would make "opened" and "chose"
 * indistinguishable with your eyes closed, which is the whole point of Echo's sound.
 *
 * NOTE: the package is `@base-ui/react`, NOT `@base-ui-components/react`.
 */
import { useCallback, type ComponentProps, type MutableRefObject, type ReactNode } from "react";
import { Menu as BaseMenu } from "@base-ui/react/menu";
import { ContextMenu as BaseContextMenu } from "@base-ui/react/context-menu";
import { useSoundOptional } from "echo-ui-core/sound";
import { useLiquidHighlight, usePressable } from "echo-ui-core/tactile";
import "./menu.css";

const cx = (...c: (string | undefined)[]) => c.filter(Boolean).join(" ");

/** Narrow Base UI's string-or-function className to a plain string for skinning. */
type Skin<T> = Omit<T, "className"> & { className?: string };

export interface MenuContentProps extends Skin<ComponentProps<typeof BaseMenu.Popup>> {
  /** Preferred side of the trigger. Default "bottom". */
  side?: ComponentProps<typeof BaseMenu.Positioner>["side"];
  /** Alignment along that side. Default "start" — a menu hangs off its trigger. */
  align?: ComponentProps<typeof BaseMenu.Positioner>["align"];
  /** Gap between trigger and panel, in px. Default 8. */
  sideOffset?: number;
  /**
   * Where the panel mounts. Defaults to <body>. Pass an element inside a
   * scoped theme (`createEchoTheme(seed, { selector })`) and the panel wears
   * that theme too — mounted on <body>, it can only read the :root one.
   */
  container?: ComponentProps<typeof BaseMenu.Portal>["container"];
  children?: ReactNode;
}

function MenuRoot({ onOpenChange, ...props }: ComponentProps<typeof BaseMenu.Root>) {
  const sound = useSoundOptional();
  return (
    <BaseMenu.Root
      onOpenChange={(open, eventDetails) => {
        if (open) sound?.play("transition");
        onOpenChange?.(open, eventDetails);
      }}
      {...props}
    />
  );
}

/* The trigger is a molded cap, so it presses like the library's keys. */
function MenuTrigger({ className, ...props }: Skin<ComponentProps<typeof BaseMenu.Trigger>>) {
  const press = usePressable<HTMLButtonElement>(props, { tilt: 3 });
  return <BaseMenu.Trigger className={cx("echo-menu__trigger", className)} {...props} {...press} />;
}

/**
 * Portal + Positioner + Popup in one. Portalled so the panel escapes any
 * `overflow: hidden` ancestor — the failure that makes a menu inside a scroll
 * container silently clip.
 */
function MenuContent({
  side = "bottom",
  align = "start",
  sideOffset = 8,
  className,
  container,
  children,
  ref,
  ...props
}: MenuContentProps) {
  // The hovered item is marked by one cap flowing from item to item.
  const glow = useLiquidHighlight();
  const { container: glowContainer } = glow;
  const setPopup = useCallback(
    (node: HTMLDivElement | null) => {
      glowContainer(node);
      if (typeof ref === "function") ref(node);
      else if (ref) (ref as MutableRefObject<HTMLDivElement | null>).current = node;
    },
    [glowContainer, ref],
  );
  return (
    <BaseMenu.Portal container={container}>
      <BaseMenu.Positioner className="echo-menu__positioner" side={side} align={align} sideOffset={sideOffset}>
        <BaseMenu.Popup ref={setPopup} className={cx("echo-menu__popup", className)} {...props}>
          <span ref={glow.light} className="echo-menu__glow" aria-hidden>
            <span ref={glow.shape} className="echo-menu__glow-shape" />
          </span>
          {children}
        </BaseMenu.Popup>
      </BaseMenu.Positioner>
    </BaseMenu.Portal>
  );
}

function MenuItem({ className, onClick, ...props }: Skin<ComponentProps<typeof BaseMenu.Item>>) {
  const sound = useSoundOptional();
  return (
    <BaseMenu.Item
      className={cx("echo-menu__item", className)}
      onClick={(event) => {
        sound?.play("select");
        onClick?.(event);
      }}
      {...props}
    />
  );
}

function MenuLinkItem({ className, ...props }: Skin<ComponentProps<typeof BaseMenu.LinkItem>>) {
  return <BaseMenu.LinkItem className={cx("echo-menu__item", className)} {...props} />;
}

function MenuSeparator({ className, ...props }: Skin<ComponentProps<typeof BaseMenu.Separator>>) {
  return <BaseMenu.Separator className={cx("echo-menu__separator", className)} {...props} />;
}

function MenuGroup({ className, ...props }: Skin<ComponentProps<typeof BaseMenu.Group>>) {
  return <BaseMenu.Group className={cx("echo-menu__group", className)} {...props} />;
}

function MenuGroupLabel({ className, ...props }: Skin<ComponentProps<typeof BaseMenu.GroupLabel>>) {
  return <BaseMenu.GroupLabel className={cx("echo-menu__group-label", className)} {...props} />;
}

/** A checked item shows the same lit dot the Select uses for its selection. */
function MenuCheckboxItem({
  className,
  children,
  onCheckedChange,
  ...props
}: Skin<ComponentProps<typeof BaseMenu.CheckboxItem>>) {
  const sound = useSoundOptional();
  return (
    <BaseMenu.CheckboxItem
      className={cx("echo-menu__item", "echo-menu__item--marked", className)}
      onCheckedChange={(checked, eventDetails) => {
        sound?.play("select");
        onCheckedChange?.(checked, eventDetails);
      }}
      {...props}
    >
      <span className="echo-menu__label">{children}</span>
      {/* Explicit children, one mark: a check for a checkbox item. */}
      <BaseMenu.CheckboxItemIndicator className="echo-menu__indicator echo-menu__indicator--check">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M3.5 8.5l3 3 6-7" />
        </svg>
      </BaseMenu.CheckboxItemIndicator>
    </BaseMenu.CheckboxItem>
  );
}

function MenuRadioGroup({ className, ...props }: Skin<ComponentProps<typeof BaseMenu.RadioGroup>>) {
  return <BaseMenu.RadioGroup className={cx("echo-menu__group", className)} {...props} />;
}

function MenuRadioItem({
  className,
  children,
  ...props
}: Skin<ComponentProps<typeof BaseMenu.RadioItem>>) {
  const sound = useSoundOptional();
  return (
    <BaseMenu.RadioItem
      className={cx("echo-menu__item", "echo-menu__item--marked", className)}
      onClick={() => sound?.play("select")}
      {...props}
    >
      <span className="echo-menu__label">{children}</span>
      {/* A pip for a radio item — the same mark the RadioGroup lights. */}
      <BaseMenu.RadioItemIndicator className="echo-menu__indicator echo-menu__indicator--pip">
        <span />
      </BaseMenu.RadioItemIndicator>
    </BaseMenu.RadioItem>
  );
}

function MenuSubmenuTrigger({
  className,
  children,
  ...props
}: Skin<ComponentProps<typeof BaseMenu.SubmenuTrigger>>) {
  return (
    <BaseMenu.SubmenuTrigger
      className={cx("echo-menu__item", "echo-menu__item--marked", className)}
      {...props}
    >
      <span className="echo-menu__label">{children}</span>
      <span className="echo-menu__chevron" aria-hidden="true">
        ›
      </span>
    </BaseMenu.SubmenuTrigger>
  );
}

/** Base UI's submenu root, exported by name so the entry point can attach it. */
export const MenuSubmenuRoot = BaseMenu.SubmenuRoot;

// Assembled into `Menu` in index.ts, which isn't a client module.
export {
  MenuRoot,
  MenuTrigger,
  MenuContent,
  MenuItem,
  MenuLinkItem,
  MenuSeparator,
  MenuGroup,
  MenuGroupLabel,
  MenuCheckboxItem,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSubmenuTrigger,
};

/* ------------------------------------------------------------ context menu --- */

function ContextMenuContent({
  side = "bottom",
  align = "start",
  sideOffset = 2,
  className,
  container,
  children,
  ...props
}: MenuContentProps) {
  return (
    <BaseContextMenu.Portal container={container}>
      <BaseContextMenu.Positioner className="echo-menu__positioner" side={side} align={align} sideOffset={sideOffset}>
        <BaseContextMenu.Popup className={cx("echo-menu__popup", className)} {...props}>
          {children}
        </BaseContextMenu.Popup>
      </BaseContextMenu.Positioner>
    </BaseContextMenu.Portal>
  );
}

/**
 * The right-click menu. Same panel, same items — only the summoning differs,
 * so everything but Root/Trigger/Content is reused from Menu above.
 *
 * `ContextMenu.Trigger` is the REGION you right-click, not a button.
 */
export const ContextMenuRoot = BaseContextMenu.Root;
export const ContextMenuTrigger = BaseContextMenu.Trigger;
// Assembled into `ContextMenu` in index.ts, which isn't a client module.
export { ContextMenuContent };
