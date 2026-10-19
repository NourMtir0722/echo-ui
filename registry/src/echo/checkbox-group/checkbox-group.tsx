"use client";

/**
 * CheckboxGroup. A named set of checkboxes that share one value: the list of
 * what's checked. Each option is a row, the checkbox and its words (and a
 * line under them), the whole row a target. `parent` adds a checkbox above
 * the others that checks or clears them all, and shows a dash when only some
 * are on.
 *
 * Base UI CheckboxGroup keeps the value and the parent's state; each box is
 * Echo's Checkbox, with its drawn tick.
 */
import { forwardRef, useId, type ReactNode } from "react";
import type { EchoInterop } from "echo-ui-core/types";
import { CheckboxGroup as BaseCheckboxGroup } from "@base-ui/react/checkbox-group";
import { Checkbox } from "../checkbox";
import "./checkbox-group.css";

export interface CheckboxGroupOption {
  value: string;
  label: string;
  description?: ReactNode;
  disabled?: boolean;
}

interface CheckboxGroupOwnProps extends EchoInterop {
  /** The group's name, shown above it. */
  label: string;
  options: CheckboxGroupOption[];
  value?: string[];
  defaultValue?: string[];
  onValueChange?: (value: string[]) => void;
  /** A checkbox above the rest that checks or clears them all ("All notifications"). */
  parent?: string;
}

export type CheckboxGroupProps = CheckboxGroupOwnProps;

/** `forwardRef` — see the note on `Field`. The ref lands on the group. */
export const CheckboxGroup = forwardRef<HTMLDivElement, CheckboxGroupProps>(function CheckboxGroup(
  { label, options, value, defaultValue, onValueChange, parent, name, disabled, id: _id, ...interop },
  ref,
) {
  const id = useId();
  const all = options.filter((o) => !o.disabled).map((o) => o.value);
  const row = (key: string, text: string, box: ReactNode, description?: ReactNode) => (
    <label key={key} className="echo-checkbox-group__row">
      {box}
      <span className="echo-checkbox-group__text">
        <span id={`${id}-${key}`} className="echo-checkbox-group__label">
          {text}
        </span>
        {description ? <span className="echo-checkbox-group__description">{description}</span> : null}
      </span>
    </label>
  );
  return (
    <BaseCheckboxGroup
      ref={ref}
      className="echo-checkbox-group"
      {...interop}
      aria-labelledby={`${id}-name`}
      {...(value !== undefined ? { value } : {})}
      {...(defaultValue !== undefined ? { defaultValue } : {})}
      {...(parent ? { allValues: all } : {})}
      {...(disabled !== undefined ? { disabled } : {})}
      onValueChange={(next) => onValueChange?.(next as string[])}
    >
      <span id={`${id}-name`} className="echo-checkbox-group__name">
        {label}
      </span>
      {parent
        ? row("all", parent, <Checkbox aria-labelledby={`${id}-all`} {...({ parent: true } as object)} />)
        : null}
      <div className="echo-checkbox-group__options" data-nested={parent ? "" : undefined}>
        {options.map((o) =>
          row(
            o.value,
            o.label,
            <Checkbox
              aria-labelledby={`${id}-${o.value}`}
              {...({ value: o.value } as object)}
              {...(name ? { name } : {})}
              {...(o.disabled ? { disabled: true } : {})}
            />,
            o.description,
          ),
        )}
      </div>
    </BaseCheckboxGroup>
  );
});
