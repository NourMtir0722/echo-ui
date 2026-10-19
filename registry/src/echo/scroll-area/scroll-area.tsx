"use client";

/**
 * ScrollArea. A region that scrolls inside itself, with the scrollbar in the
 * device's material: a thin groove cut into the surface and a molded thumb
 * that rides in it, fattening under the hand. Where there is more to see,
 * the edge sinks into shade, so a clipped list says it continues.
 *
 * Base UI ScrollArea draws the bars and keeps native scrolling (wheel,
 * touch, keyboard, find-in-page) untouched. The viewport takes focus, so a
 * keyboard can scroll it, which is why it needs a name: `aria-label` or
 * `aria-labelledby`, as on every Echo control.
 */
import type { ReactNode } from "react";
import { ScrollArea as BaseScrollArea } from "@base-ui/react/scroll-area";
import "./scroll-area.css";

interface ScrollAreaOwnProps {
  children: ReactNode;
  /** The most it may be before it scrolls, as a CSS length ("20rem", "60vh"). */
  maxHeight?: string;
  /** Which way it scrolls. Default "vertical". */
  orientation?: "vertical" | "horizontal" | "both";
}

type AccessibleName =
  | { "aria-label": string; "aria-labelledby"?: string }
  | { "aria-labelledby": string; "aria-label"?: string };

export type ScrollAreaProps = ScrollAreaOwnProps & AccessibleName;

export function ScrollArea({ children, maxHeight, orientation = "vertical", ...name }: ScrollAreaProps) {
  const vertical = orientation !== "horizontal";
  const horizontal = orientation !== "vertical";
  return (
    <BaseScrollArea.Root className="echo-scroll-area" data-orientation={orientation}>
      <BaseScrollArea.Viewport
        className="echo-scroll-area__viewport"
        role="region"
        tabIndex={0}
        style={maxHeight ? { maxHeight } : undefined}
        {...name}
      >
        <BaseScrollArea.Content className="echo-scroll-area__content">{children}</BaseScrollArea.Content>
      </BaseScrollArea.Viewport>
      {vertical ? (
        <BaseScrollArea.Scrollbar className="echo-scroll-area__bar" orientation="vertical">
          <BaseScrollArea.Thumb className="echo-scroll-area__thumb" />
        </BaseScrollArea.Scrollbar>
      ) : null}
      {horizontal ? (
        <BaseScrollArea.Scrollbar className="echo-scroll-area__bar" orientation="horizontal">
          <BaseScrollArea.Thumb className="echo-scroll-area__thumb" />
        </BaseScrollArea.Scrollbar>
      ) : null}
      {vertical && horizontal ? <BaseScrollArea.Corner /> : null}
    </BaseScrollArea.Root>
  );
}
