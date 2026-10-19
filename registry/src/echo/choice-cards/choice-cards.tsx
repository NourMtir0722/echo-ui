"use client";

/**
 * ChoiceCards. Choosing between things that need more than a word: a plan,
 * a template, an account. Each option is a card (title, a line, anything
 * else: a price, a preview) and the whole card is the choice. The chosen one
 * lights a rail along its edge and its pip; nothing else about it changes
 * colour, so one accent still means one thing.
 *
 * One choice is a radio group (arrow keys move and choose, one tab stop);
 * `multiple` is a group of checkboxes. Base UI RadioGroup/Radio and
 * CheckboxGroup/Checkbox own the roles, keys and value.
 */
import { forwardRef, useId, type ReactNode } from "react";
import type { EchoInterop } from "echo-ui-core/types";
import { RadioGroup as BaseRadioGroup } from "@base-ui/react/radio-group";
import { Radio as BaseRadio } from "@base-ui/react/radio";
import { CheckboxGroup as BaseCheckboxGroup } from "@base-ui/react/checkbox-group";
import { Checkbox as BaseCheckbox } from "@base-ui/react/checkbox";
import { useSoundOptional } from "echo-ui-core/sound";
import "../panel/panel.css";
import "./choice-cards.css";

export interface ChoiceCard {
  value: string;
  title: string;
  description?: ReactNode;
  /** Anything else on the card: a price, a preview, a badge. */
  extra?: ReactNode;
  disabled?: boolean;
}

interface ChoiceCardsOwnProps extends EchoInterop {
  /** The group's name, shown above it. */
  label: string;
  options: ChoiceCard[];
  /** Several at once (checkboxes). Default: one (radios). */
  multiple?: boolean;
  value?: string | string[];
  defaultValue?: string | string[];
  onValueChange?: (value: string | string[]) => void;
  /** Minimum card width before they wrap. Default "14rem". */
  minCardWidth?: string;
}

const Tick = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M3.5 8.5l3 3 6-7" />
  </svg>
);

export type ChoiceCardsProps = ChoiceCardsOwnProps;

/** `forwardRef` — see the note on `Field`. The ref lands on the group. */
export const ChoiceCards = forwardRef<HTMLDivElement, ChoiceCardsProps>(function ChoiceCards(
  { label, options, multiple = false, value, defaultValue, onValueChange, name, minCardWidth = "14rem", id: _id, disabled, ...interop },
  ref,
) {
  const id = useId();
  const sound = useSoundOptional();
  const face = (o: ChoiceCard) => (
    <>
      <span className="echo-choice-cards__mark" aria-hidden="true">
        {multiple ? (
          <BaseCheckbox.Indicator className="echo-choice-cards__tick">
            <Tick />
          </BaseCheckbox.Indicator>
        ) : (
          <BaseRadio.Indicator className="echo-choice-cards__pip" />
        )}
      </span>
      <span className="echo-choice-cards__text">
        <span className="echo-choice-cards__title">{o.title}</span>
        {o.description ? <span className="echo-choice-cards__description">{o.description}</span> : null}
        {o.extra ? <span className="echo-choice-cards__extra">{o.extra}</span> : null}
      </span>
    </>
  );
  const grid = { gridTemplateColumns: `repeat(auto-fit, minmax(min(${minCardWidth}, 100%), 1fr))` };
  const heading = (
    <span id={`${id}-name`} className="echo-choice-cards__name">
      {label}
    </span>
  );
  const changed = (next: unknown) => {
    sound?.play("select");
    onValueChange?.(next as string | string[]);
  };

  if (multiple) {
    return (
      <div className="echo-choice-cards">
        {heading}
        <BaseCheckboxGroup
          ref={ref}
          className="echo-choice-cards__grid"
          {...interop}
          {...(disabled !== undefined ? { disabled } : {})}
          style={grid}
          aria-labelledby={`${id}-name`}
          {...(value !== undefined ? { value: value as string[] } : {})}
          {...(defaultValue !== undefined ? { defaultValue: defaultValue as string[] } : {})}
          onValueChange={changed}
        >
          {options.map((o) => (
            <BaseCheckbox.Root
              key={o.value}
              value={o.value}
              className="echo-panel echo-choice-cards__card"
              data-variant="raised"
              {...(name ? { name } : {})}
              {...(o.disabled ? { disabled: true } : {})}
            >
              {face(o)}
            </BaseCheckbox.Root>
          ))}
        </BaseCheckboxGroup>
      </div>
    );
  }
  return (
    <div className="echo-choice-cards">
      {heading}
      <BaseRadioGroup
        ref={ref}
        className="echo-choice-cards__grid"
        {...interop}
        {...(disabled !== undefined ? { disabled } : {})}
        style={grid}
        aria-labelledby={`${id}-name`}
        {...(value !== undefined ? { value } : {})}
        {...(defaultValue !== undefined ? { defaultValue } : {})}
        {...(name ? { name } : {})}
        onValueChange={changed}
      >
        {options.map((o) => (
          <BaseRadio.Root
            key={o.value}
            value={o.value}
            className="echo-panel echo-choice-cards__card"
            data-variant="raised"
            {...(o.disabled ? { disabled: true } : {})}
          >
            {face(o)}
          </BaseRadio.Root>
        ))}
      </BaseRadioGroup>
    </div>
  );
});
