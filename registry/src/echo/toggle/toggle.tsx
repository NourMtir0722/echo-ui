"use client";

/**
 * Toggle and ToggleGroup. The quiet key of a toolbar: bold, italic, grid or
 * list, a filter. Where LedKey announces a state with a light, a Toggle says
 * "on" the way a latching key does: the cap stays down in its well. Pressed
 * on, it travels down and holds there; pressed off, it springs back up.
 *
 * A ToggleGroup puts its Toggles in one long well, like keys on one bar,
 * with arrow-key focus between them. `multiple` lets any number be on (bold
 * and italic); without it, at most one (align left, centre, right). For
 * "exactly one of a few, always one", use Segmented.
 *
 * Base UI Toggle and ToggleGroup own `aria-pressed`, the roving focus and
 * the group's value; Echo owns the cap and its travel. Sizes are the control
 * scale, and read a SizeProvider. Inside a Toolbar they render through its
 * parts, so they join its one tab stop and arrow-key order.
 */
import { forwardRef, useCallback, type MutableRefObject, type ReactNode } from "react";
import { Toggle as BaseToggle } from "@base-ui/react/toggle";
import { ToggleGroup as BaseToggleGroup } from "@base-ui/react/toggle-group";
import { Toolbar as BaseToolbar } from "@base-ui/react/toolbar";
import { useInToolbar } from "../toolbar/toolbar-context";
import { useCapPhysics } from "echo-ui-core/tactile";
import type { EchoInterop } from "echo-ui-core/types";
import { useSoundOptional } from "echo-ui-core/sound";
import { SizeProvider, useControlSize, type ControlSize } from "../size";
import "./toggle.css";

interface ToggleOwnProps extends EchoInterop {
  /** The legend, when it has words. */
  children?: ReactNode;
  /** An icon; icon-only toggles need `aria-label`. */
  icon?: ReactNode;
  pressed?: boolean;
  defaultPressed?: boolean;
  onPressedChange?: (pressed: boolean) => void;
  /** Its value inside a ToggleGroup. */
  value?: string;
  /** Height on the control scale. Defaults to the group's or SizeProvider's size. */
  size?: ControlSize;
}

type ToggleName =
  | { children: ReactNode; "aria-label"?: string }
  | { children?: undefined; "aria-label": string };

export type ToggleProps = ToggleOwnProps & ToggleName;

export const Toggle = forwardRef<HTMLButtonElement, ToggleProps>(function Toggle(
  { children, icon, pressed, defaultPressed, onPressedChange, value, disabled, size: ownSize, ...interop },
  ref,
) {
  const size = useControlSize(ownSize);
  const sound = useSoundOptional();
  const inToolbar = useInToolbar();
  const cap = useCapPhysics<HTMLButtonElement>({ travel: 1, tilt: 3 });
  const setRef = useCallback(
    (node: HTMLButtonElement | null) => {
      cap.ref(node);
      if (typeof ref === "function") ref(node);
      else if (ref) (ref as MutableRefObject<HTMLButtonElement | null>).current = node;
    },
    [ref, cap],
  );
  const cap_ = (
    <BaseToggle
      ref={setRef}
      className="echo-toggle__cap"
      {...(pressed !== undefined ? { pressed } : {})}
      {...(defaultPressed !== undefined ? { defaultPressed } : {})}
      {...(value !== undefined ? { value } : {})}
      {...(disabled !== undefined ? { disabled } : {})}
      onPressedChange={(next) => {
        sound?.play("tap");
        onPressedChange?.(next);
      }}
      {...interop}
      {...cap.handlers}
    >
      {icon ? (
        <span className="echo-toggle__icon" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      {children != null ? <span className="echo-toggle__label">{children}</span> : null}
    </BaseToggle>
  );

  return (
    <span className="echo-toggle" data-size={size} data-icon-only={children == null ? "" : undefined}>
      {inToolbar ? <BaseToolbar.Button render={cap_} /> : cap_}
    </span>
  );
});

type GroupName = { "aria-label": string; "aria-labelledby"?: string } | { "aria-labelledby": string; "aria-label"?: string };

interface ToggleGroupOwnProps {
  /** Toggles, each with a `value`. */
  children: ReactNode;
  /** The values that are on (controlled). */
  value?: string[];
  defaultValue?: string[];
  onValueChange?: (value: string[]) => void;
  /** Any number can be on. Without it, at most one. Default false. */
  multiple?: boolean;
  orientation?: "horizontal" | "vertical";
  disabled?: boolean;
  /** Height on the control scale for every Toggle inside. */
  size?: ControlSize;
}

export type ToggleGroupProps = ToggleGroupOwnProps & GroupName;

export function ToggleGroup({
  children,
  value,
  defaultValue,
  onValueChange,
  multiple = false,
  orientation = "horizontal",
  disabled,
  size: ownSize,
  ...name
}: ToggleGroupProps) {
  const size = useControlSize(ownSize);
  const inToolbar = useInToolbar();
  const group = (
    <BaseToggleGroup
      className="echo-toggle-group"
      data-size={size}
      multiple={multiple}
      orientation={orientation}
      {...(value !== undefined ? { value } : {})}
      {...(defaultValue !== undefined ? { defaultValue } : {})}
      {...(disabled !== undefined ? { disabled } : {})}
      onValueChange={(next) => onValueChange?.(next as string[])}
      {...name}
    >
      {/* Every Toggle inside takes the group's size. */}
      <SizeProvider size={size}>{children}</SizeProvider>
    </BaseToggleGroup>
  );
  return inToolbar ? <BaseToolbar.Group render={group} /> : group;
}
