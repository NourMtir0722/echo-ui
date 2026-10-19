"use client";

/**
 * Toolbar and ButtonGroup. Several caps sharing one long well, like a row of
 * keys on one bar.
 *
 * ButtonGroup is the look alone: HardwareButtons that belong together (a
 * split "Save | ▾", Back and Next) in one well, each still its own tab stop.
 *
 * Toolbar is the look plus the behaviour of a toolbar: one tab stop for the
 * whole bar and the arrow keys between its controls (Base UI Toolbar), a
 * name, and `sm` controls unless you say otherwise. Put ToolbarButtons,
 * Toggles and ToggleGroups in it (they join its arrow-key order by
 * themselves), with ToolbarGroup to keep a few together and
 * ToolbarSeparator between groups. A toolbar that runs out of room wraps.
 */
import { forwardRef, type ReactNode } from "react";
import { Toolbar as BaseToolbar } from "@base-ui/react/toolbar";
import { HardwareButton, type HardwareButtonProps } from "../hardware-button";
import { SizeProvider, useControlSize, type ControlSize } from "../size";
import { InToolbar } from "./toolbar-context";
import "./toolbar.css";

type Named = { "aria-label": string; "aria-labelledby"?: string } | { "aria-labelledby": string; "aria-label"?: string };

export type ButtonGroupProps = {
  /** HardwareButtons that belong together. */
  children: ReactNode;
  /** Height on the control scale for every button inside. */
  size?: ControlSize;
} & Named;

export function ButtonGroup({ children, size: ownSize, ...name }: ButtonGroupProps) {
  const size = useControlSize(ownSize);
  return (
    <div className="echo-button-group" role="group" data-size={size} {...name}>
      <SizeProvider size={size}>{children}</SizeProvider>
    </div>
  );
}

export type ToolbarProps = {
  /** ToolbarButtons, Toggles, ToggleGroups, ToolbarGroups, ToolbarSeparators. */
  children: ReactNode;
  orientation?: "horizontal" | "vertical";
  /** Height on the control scale for everything inside. Default `sm`. */
  size?: ControlSize;
} & Named;

export function Toolbar({ children, orientation = "horizontal", size = "sm", ...name }: ToolbarProps) {
  return (
    <BaseToolbar.Root
      className="echo-toolbar"
      data-size={size}
      orientation={orientation}
      // Home and End jump to the bar's ends, as the toolbar pattern has it;
      // Base UI's roving focus follows wherever focus lands.
      onKeyDown={(e) => {
        if (e.key !== "Home" && e.key !== "End") return;
        const items = [...e.currentTarget.querySelectorAll<HTMLElement>("[data-focusable]:not([data-disabled])")];
        const to = e.key === "Home" ? items[0] : items.at(-1);
        if (!to) return;
        e.preventDefault();
        to.focus();
      }}
      {...name}
    >
      <InToolbar.Provider value={true}>
        <SizeProvider size={size}>{children}</SizeProvider>
      </InToolbar.Provider>
    </BaseToolbar.Root>
  );
}

/** A HardwareButton that takes its place in the Toolbar's arrow-key order. */
export const ToolbarButton = forwardRef<HTMLButtonElement, HardwareButtonProps>(function ToolbarButton(props, ref) {
  return <BaseToolbar.Button ref={ref} render={<HardwareButton {...props} />} />;
});

export type ToolbarGroupProps = { children: ReactNode; "aria-label"?: string };

/** A few of a Toolbar's controls kept together in their own well. */
export function ToolbarGroup({ children, ...name }: ToolbarGroupProps) {
  return (
    <BaseToolbar.Group className="echo-toolbar__group" {...name}>
      {children}
    </BaseToolbar.Group>
  );
}

/** An engraved line between a Toolbar's groups. */
export function ToolbarSeparator() {
  return <BaseToolbar.Separator className="echo-toolbar__separator" />;
}
