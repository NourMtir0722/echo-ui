/**
 * Fieldset. A named group of fields: "Shipping address", "Notifications".
 * The legend is the group's name (and a screen reader says it before each
 * field inside); a description can follow it. `disabled` disables every
 * control inside at once. Base UI Fieldset.
 */
import type { ReactNode } from "react";
import { Fieldset as BaseFieldset } from "@base-ui/react/fieldset";
import "./fieldset.css";

export interface FieldsetProps {
  /** The group's name. */
  legend: string;
  /** A line under the legend. */
  description?: ReactNode;
  children: ReactNode;
  /** Disable every control inside. */
  disabled?: boolean;
}

export function Fieldset({ legend, description, children, disabled }: FieldsetProps) {
  return (
    <BaseFieldset.Root className="echo-fieldset" {...(disabled !== undefined ? { disabled } : {})}>
      <BaseFieldset.Legend className="echo-fieldset__legend">{legend}</BaseFieldset.Legend>
      {description ? <p className="echo-fieldset__description">{description}</p> : null}
      <div className="echo-fieldset__body">{children}</div>
    </BaseFieldset.Root>
  );
}
