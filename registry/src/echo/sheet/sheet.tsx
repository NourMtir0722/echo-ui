"use client";

/**
 * Sheet. A panel that slides in
 * from an edge: the console side panel and the mobile nav.
 *
 * BUILT ON BASE UI'S `Drawer`, NOT ON `Dialog`. It was first planned as
 * "Dialog + side variant", which was decided before Base UI 1.6 shipped a real
 * Drawer primitive. Drawer gives swipe-to-dismiss, the swipe-progress custom
 * properties the backdrop tracks, and the overscroll bleed — none of which a
 * Dialog with a translated popup would have, and all of which are exactly what
 * a mobile nav needs. Dialog would have been a hand-rolled worse version.
 *
 *   <Sheet side="right">
 *     <Sheet.Trigger>Open</Sheet.Trigger>
 *     <Sheet.Content title="Channels" description="Pick one.">
 *       …
 *     </Sheet.Content>
 *   </Sheet>
 *
 * `side` sets BOTH the swipe direction and the edge the panel is pinned to, so
 * a right-hand sheet cannot end up dismissing on an upward swipe — the pair is
 * one decision, and splitting it across two props is how they drift apart.
 *
 * NOTE: the package is `@base-ui/react`, NOT `@base-ui-components/react`.
 */
import { createContext, useContext, type ComponentProps, type ReactNode } from "react";
import { Drawer } from "@base-ui/react/drawer";
import { useSoundOptional } from "echo-ui-core/sound";
import { usePressable } from "echo-ui-core/tactile";
import "./sheet.css";

const cx = (...c: (string | undefined)[]) => c.filter(Boolean).join(" ");

/** Narrow Base UI's string-or-function className to a plain string for skinning. */
type Skin<T> = Omit<T, "className"> & { className?: string };

export type SheetSide = "left" | "right" | "top" | "bottom";

export interface SheetProps extends Omit<ComponentProps<typeof Drawer.Root>, "swipeDirection"> {
  /** Edge the sheet is pinned to, and the direction it swipes away. Default "right". */
  side?: SheetSide;
}

export interface SheetContentProps
  // `title` is omitted from the passthrough because Drawer.Popup inherits the
  // DOM title attribute (a string tooltip) and ours is the panel's heading.
  extends Omit<Skin<ComponentProps<typeof Drawer.Popup>>, "title"> {
  /**
   * Accessible name for the panel. Required in practice: a drawer with no
   * title is an unlabelled region to anyone not looking at it.
   */
  title?: ReactNode;
  description?: ReactNode;
  /** Show the corner close control. Default true. */
  showClose?: boolean;
  /**
   * Where the panel mounts. Defaults to <body>. Pass an element inside a
   * scoped theme (`createEchoTheme(seed, { selector })`) and the panel wears
   * that theme too — mounted on <body>, it can only read the :root one.
   */
  container?: ComponentProps<typeof Drawer.Portal>["container"];
  children?: ReactNode;
}

/**
 * `side` has to reach Content (to pin the edge) as well as Root (to set the
 * swipe axis), and Content is a sibling subtree rather than a prop away — so
 * it travels by context. A module-level variable would be smaller and wrong:
 * two sheets with different sides on one page would overwrite each other, and
 * on the server every request would share the same slot.
 */
const SheetSideContext = createContext<SheetSide>("right");

/** Swipe axis for an edge. Pinning and dismissal are one decision, not two. */
const SWIPE: Record<SheetSide, "left" | "right" | "up" | "down"> = {
  left: "left",
  right: "right",
  top: "up",
  bottom: "down",
};

function SheetRoot({ side = "right", onOpenChange, children, ...props }: SheetProps) {
  const sound = useSoundOptional();

  return (
    <Drawer.Root
      swipeDirection={SWIPE[side]}
      onOpenChange={(open, eventDetails) => {
        if (open) sound?.play("transition");
        onOpenChange?.(open, eventDetails);
      }}
      {...props}
    >
      {/*
        Base UI allows children to be a payload render function (for
        handle-driven sheets), so the provider wraps the RESULT in that case
        rather than the function — narrowing children to ReactNode here would
        quietly drop a Drawer capability.
      */}
      {typeof children === "function"
        ? (arg: { payload: unknown }) => <SheetSideContext.Provider value={side}>{children(arg)}</SheetSideContext.Provider>
        : <SheetSideContext.Provider value={side}>{children}</SheetSideContext.Provider>}
    </Drawer.Root>
  );
}

/* The trigger, the close key and the actions are molded caps, so they press
   like the library's keys (usePressable). */
function SheetTrigger({ className, ...props }: Skin<ComponentProps<typeof Drawer.Trigger>>) {
  const press = usePressable<HTMLButtonElement>(props, { tilt: 3 });
  return <Drawer.Trigger className={cx("echo-sheet__trigger", className)} {...props} {...press} />;
}

function SheetCloseKey() {
  const press = usePressable<HTMLButtonElement>({}, { lift: 0, travel: 1.5, tilt: 0 });
  return (
    <Drawer.Close className="echo-sheet__close" aria-label="Close" {...press}>
      ✕
    </Drawer.Close>
  );
}

function SheetContent({
  title,
  description,
  showClose = true,
  className,
  container,
  children,
  ...props
}: SheetContentProps) {
  const side = useContext(SheetSideContext);

  return (
    <Drawer.Portal container={container}>
      <Drawer.Backdrop className="echo-sheet__backdrop" />
      <Drawer.Viewport className="echo-sheet__viewport" data-side={side}>
        <Drawer.Popup className={cx("echo-sheet__popup", className)} data-side={side} {...props}>
          <Drawer.Content className="echo-sheet__content">
            {title != null ? (
              <Drawer.Title className="echo-sheet__title">{title}</Drawer.Title>
            ) : null}
            {description != null ? (
              <Drawer.Description className="echo-sheet__desc">{description}</Drawer.Description>
            ) : null}
            {children}
          </Drawer.Content>
          {showClose ? (
            <SheetCloseKey />
          ) : null}
        </Drawer.Popup>
      </Drawer.Viewport>
    </Drawer.Portal>
  );
}

function SheetClose({ className, ...props }: Skin<ComponentProps<typeof Drawer.Close>>) {
  const press = usePressable<HTMLButtonElement>(props, { travel: 1.5, tilt: 3 });
  return <Drawer.Close className={cx("echo-sheet__action", className)} {...props} {...press} />;
}

// Assembled into `Sheet` in index.ts, which isn't a client module.
export { SheetRoot, SheetTrigger, SheetContent, SheetClose };
