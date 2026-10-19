"use client";

/**
 * Combobox. A Select you can type into: for a list long enough to search
 * (people, countries, labels). The text goes in Field's well; the list drops
 * from it in Select's plastic, with the same flowing highlight. `multiple`
 * keeps each choice as a tag in the well, budding in as it's chosen, with
 * Backspace or its × to take it out; `creatable` offers to add what you typed
 * when nothing matches.
 *
 * Base UI Combobox owns the filtering, the listbox, the active option, the
 * chips' keyboard and every announcement; Echo owns the look. Closed:
 * `options` in, values (strings) out.
 */
import { forwardRef, useId, useMemo, useState, type ReactNode } from "react";
import { Combobox as BaseCombobox } from "@base-ui/react/combobox";
import type { EchoPortalContainer, EchoTextInterop } from "echo-ui-core/types";
import { useLiquidHighlight } from "echo-ui-core/tactile";
import { useSoundOptional } from "echo-ui-core/sound";
import { useControlSize, type ControlSize } from "../size";
import "../select/select.css";
import "../tag/tag.css";
import "./combobox.css";

export interface ComboboxOption {
  value: string;
  label: string;
}

interface ComboboxOwnProps extends EchoTextInterop {
  /** The visible label and the input's accessible name. */
  label: string;
  options: ComboboxOption[];
  /** Several at once, each kept as a tag in the well. */
  multiple?: boolean;
  /** Chosen value (single) or values (multiple), controlled. */
  value?: string | string[] | null;
  defaultValue?: string | string[] | null;
  /** Called with the value (single, or null when cleared) or the values (multiple). */
  onValueChange?: (value: string | string[] | null) => void;
  /**
   * Offer to add what was typed when nothing matches: it becomes an option
   * (value and label the text), chosen at once, and `onCreate` hears about it.
   */
  creatable?: boolean;
  onCreate?: (label: string) => void;
  /** What the list says when nothing matches. Default "No matches". */
  emptyText?: ReactNode;
  /** Height on the control scale. Defaults to the nearest SizeProvider's size. */
  size?: ControlSize;
  container?: EchoPortalContainer;
}

export type ComboboxProps = ComboboxOwnProps;

type Item = ComboboxOption & { create?: string };

const Check = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M3.5 8.5l3 3 6-7" />
  </svg>
);
const Chevron = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M6 9l6 6 6-6" />
  </svg>
);
const Cross = () => (
  <svg viewBox="0 0 12 12" aria-hidden>
    <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

/** `forwardRef` — see the note on `Field`. The ref lands on the input. */
export const Combobox = forwardRef<HTMLInputElement, ComboboxProps>(function Combobox(
  {
    label,
    options,
    multiple = false,
    value,
    defaultValue,
    onValueChange,
    creatable = false,
    onCreate,
    placeholder,
    emptyText = "No matches",
    size: ownSize,
    container,
    id,
    name,
    disabled,
    required,
    readOnly,
    autoFocus,
    onBlur,
    onFocus,
    ...aria
  },
  ref,
) {
  const size = useControlSize(ownSize);
  const autoId = useId();
  const inputId = id ?? autoId;
  const sound = useSoundOptional();
  const glow = useLiquidHighlight();
  const [created, setCreated] = useState<ComboboxOption[]>([]);
  const [query, setQuery] = useState("");
  const all = useMemo(() => [...options, ...created.filter((c) => !options.some((o) => o.value === c.value))], [options, created]);
  const byValue = (v: string) => all.find((o) => o.value === v) ?? { value: v, label: v };

  const q = query.trim();
  const exact = all.some((o) => o.label.toLocaleLowerCase() === q.toLocaleLowerCase());
  const items: Item[] = creatable && q && !exact ? [...all, { value: `create:${q}`, label: `Create “${q}”`, create: q }] : all;

  const toItems = (v: string | string[] | null | undefined) =>
    v === undefined ? undefined : v === null ? null : Array.isArray(v) ? v.map(byValue) : byValue(v);

  const emit = (next: Item | Item[] | null) => {
    const list = Array.isArray(next) ? next : next ? [next] : [];
    const fresh = list.find((i) => i.create);
    if (fresh) {
      const option = { value: fresh.create!, label: fresh.create! };
      setCreated((c) => [...c, option]);
      onCreate?.(option.label);
      list.splice(list.indexOf(fresh), 1, option);
    }
    sound?.play("select");
    setQuery("");
    onValueChange?.(multiple ? list.map((i) => i.value) : (list[0]?.value ?? null));
  };

  const controlledValue = toItems(value);
  const input = (
    <BaseCombobox.Input
      ref={ref}
      className="echo-combobox__input"
      placeholder={placeholder}
      id={inputId}
      {...(autoFocus ? { autoFocus } : {})}
      {...(onBlur ? { onBlur } : {})}
      {...(onFocus ? { onFocus } : {})}
      {...aria}
    />
  );

  return (
    <BaseCombobox.Root
      items={items}
      multiple={multiple as never}
      itemToStringLabel={(i: Item) => i.label}
      itemToStringValue={(i: Item) => i.value}
      isItemEqualToValue={(a: Item, b: Item) => a.value === b.value}
      {...(controlledValue !== undefined ? { value: controlledValue as never } : {})}
      {...(defaultValue !== undefined ? { defaultValue: toItems(defaultValue) as never } : {})}
      onValueChange={(next) => emit(next as Item | Item[] | null)}
      inputValue={query}
      onInputValueChange={setQuery}
      {...(name ? { name } : {})}
      {...(disabled !== undefined ? { disabled } : {})}
      {...(required !== undefined ? { required } : {})}
      {...(readOnly !== undefined ? { readOnly } : {})}
    >
      <div className="echo-combobox" data-size={size} data-multiple={multiple ? "" : undefined}>
        <label className="echo-combobox__label" htmlFor={inputId}>
          {label}
        </label>
        <BaseCombobox.InputGroup className="echo-combobox__well">
          {multiple ? (
            <BaseCombobox.Value>
              {(chosen: Item[]) => (
                <BaseCombobox.Chips className="echo-combobox__chips" aria-label={chosen.length ? `${label}, chosen` : undefined}>
                  {chosen.map((c) => (
                    <BaseCombobox.Chip
                      key={c.value}
                      className="echo-tag echo-combobox__chip"
                      aria-label={c.label}
                      aria-description="Press Backspace or Delete to remove"
                    >
                      <span className="echo-tag__label">{c.label}</span>
                      <BaseCombobox.ChipRemove className="echo-tag__remove" aria-label={`Remove ${c.label}`}>
                        <Cross />
                      </BaseCombobox.ChipRemove>
                    </BaseCombobox.Chip>
                  ))}
                  {input}
                </BaseCombobox.Chips>
              )}
            </BaseCombobox.Value>
          ) : (
            input
          )}
          <BaseCombobox.Trigger className="echo-combobox__trigger" aria-label={`Show ${label} options`}>
            <Chevron />
          </BaseCombobox.Trigger>
        </BaseCombobox.InputGroup>
      </div>
      <BaseCombobox.Portal container={container}>
        <BaseCombobox.Positioner className="echo-select__positioner" side="bottom" align="start" sideOffset={8}>
          <BaseCombobox.Popup ref={glow.container} className="echo-select__popup echo-combobox__popup">
            <span ref={glow.light} className="echo-select__glow" aria-hidden>
              <span ref={glow.shape} className="echo-select__glow-shape" />
            </span>
            <BaseCombobox.Empty className="echo-combobox__empty">{emptyText}</BaseCombobox.Empty>
            <BaseCombobox.List className="echo-combobox__list">
              {(item: Item) => (
                <BaseCombobox.Item
                  key={item.value}
                  value={item}
                  className="echo-select__item"
                  data-create={item.create ? "" : undefined}
                >
                  <span>{item.label}</span>
                  <BaseCombobox.ItemIndicator className="echo-select__indicator">
                    <Check />
                  </BaseCombobox.ItemIndicator>
                </BaseCombobox.Item>
              )}
            </BaseCombobox.List>
          </BaseCombobox.Popup>
        </BaseCombobox.Positioner>
      </BaseCombobox.Portal>
    </BaseCombobox.Root>
  );
});
