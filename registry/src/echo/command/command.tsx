"use client";

/**
 * Command. The command palette,
 * as a dot-matrix readout you type into.
 *
 * WHY AUTOCOMPLETE AND NOT COMBOBOX. Base UI is explicit: Combobox is a
 * filterable Select whose input is restricted to the item set, and it points
 * search widgets at Autocomplete — which documents "filterable command pickers"
 * as its own use case. A palette takes free-form text and runs an action; it
 * does not hold a value. Combobox would have been the wrong semantics wearing
 * the right shape.
 *
 * WHY A DIALOG AROUND IT. Autocomplete anchors its list to the input. A palette
 * is not anchored to anything — it is summoned to the middle of the screen. So
 * Dialog owns the frame (backdrop, focus trap, Escape, scroll lock) and
 * Autocomplete owns the input, the filtering and the listbox semantics inside
 * it. `Autocomplete.List` falls back to being its own positioner when there is
 * no Positioner above it, which is what makes the inline list legal rather than
 * a hack.
 *
 * THE SKIN. The input sits in the LcdChip's recessed screen well, in the LCD
 * voice, with an emissive caret — so the palette reads as the device's readout
 * rather than as a web search box. That is the whole point of the item: a
 * command bar in this vocabulary is something no other library's version feels
 * like.
 *
 * NOTE: the package is `@base-ui/react`, NOT `@base-ui-components/react`.
 */
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { Autocomplete } from "@base-ui/react/autocomplete";
import type { EchoPortalContainer } from "echo-ui-core/types";
import { useSoundOptional } from "echo-ui-core/sound";
import { liquidBloom, usePopupMotion } from "echo-ui-core/presence";
import "./command.css";

export interface CommandItem {
  /** Stable identity. Also what `onRun` receives. */
  id: string;
  /** What the command is called. The primary thing matched and read. */
  label: string;
  /** Trailing hint — a shortcut, a destination, a current value. */
  hint?: string;
  /**
   * Extra words that should match this command without being shown. "trash"
   * finding "Delete take" is the difference between a palette people use and
   * one they give up on.
   */
  keywords?: string[];
  disabled?: boolean;
  /** Run it. The palette closes first, so this can open another surface. */
  run?: () => void;
}

export interface CommandGroup {
  label: string;
  items: CommandItem[];
}

export interface CommandProps {
  /** Grouped commands. Groups keep their order; items are filtered within them. */
  groups: CommandGroup[];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /**
   * Bind a global hotkey. Default "k" (with Cmd on Apple, Ctrl elsewhere).
   * Pass null for no binding — the right choice when the app owns its
   * shortcuts, or when two palettes could otherwise answer one keystroke.
   */
  shortcut?: string | null;
  placeholder?: string;
  /** Shown when nothing matches. Say what would help, not just "no results". */
  emptyMessage?: ReactNode;
  /** Fired with the item that was run, after the palette closes. */
  onRun?: (item: CommandItem) => void;
  /**
   * Where the palette mounts. Defaults to <body>. Pass an element inside a
   * scoped theme (`createEchoTheme(seed, { selector })`) and the palette wears
   * that theme too — mounted on <body>, it can only read the :root one.
   */
  container?: EchoPortalContainer;
}

/** Everything a query should match against, joined once per item. */
const searchText = (item: CommandItem) =>
  [item.label, item.hint, ...(item.keywords ?? [])].filter(Boolean).join(" ").toLowerCase();

export function Command({
  groups,
  open: controlledOpen,
  onOpenChange,
  shortcut = "k",
  placeholder = "Type a command…",
  emptyMessage = "No commands match.",
  onRun,
  container,
}: CommandProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const [query, setQuery] = useState("");
  const sound = useSoundOptional();

  const setOpen = useCallback(
    (next: boolean) => {
      if (controlledOpen === undefined) setUncontrolledOpen(next);
      onOpenChange?.(next);
    },
    [controlledOpen, onOpenChange],
  );

  // The global hotkey. Bound on the document so it works wherever focus is,
  // which is the entire proposition of a palette.
  useEffect(() => {
    if (!shortcut) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== shortcut.toLowerCase()) return;
      // metaKey on Apple, ctrlKey everywhere else — accepting either would
      // swallow Ctrl+K (delete-to-end-of-line) on macOS.
      if (!event.metaKey && !event.ctrlKey) return;
      event.preventDefault();
      setOpen(!open);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [shortcut, open, setOpen]);

  /*
   * Filtering is done here rather than by Base UI's own filter so that
   * `keywords` count — an item has to match on words it never displays. Groups
   * that end up empty are dropped, because a heading over nothing reads as a
   * rendering bug.
   */
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return groups;
    return groups
      .map((group) => ({ ...group, items: group.items.filter((i) => searchText(i).includes(q)) }))
      .filter((group) => group.items.length > 0);
  }, [groups, query]);

  const runItem = useCallback(
    (item: CommandItem) => {
      if (item.disabled) return;
      sound?.play("select");
      // Close BEFORE running: a command that opens another dialog would
      // otherwise race this one's exit and lose the focus trap.
      setOpen(false);
      setQuery("");
      item.run?.();
      onRun?.(item);
    },
    [onRun, setOpen, sound],
  );

  // Liquid bloom, the same arrival as Modal: out of a pill in the middle.
  const bloom = usePopupMotion(liquidBloom);

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (next) sound?.play("transition");
        else setQuery("");
        setOpen(next);
      }}
    >
      <Dialog.Portal container={container}>
        <Dialog.Backdrop className="echo-command__backdrop" />
        <Dialog.Popup
          ref={bloom}
          className="echo-command__popup"
          aria-label="Command palette"
          /*
           * Escape has to close the PALETTE. Autocomplete's own Escape closes
           * its list — and the list here is forced open, so it handles the key
           * and nothing happens, leaving a modal with no keyboard way out.
           * Capture runs before Autocomplete sees it.
           */
          onKeyDownCapture={(event) => {
            if (event.key !== "Escape") return;
            event.preventDefault();
            event.stopPropagation();
            setQuery("");
            setOpen(false);
          }}
        >
          <Autocomplete.Root
            items={filtered}
            value={query}
            onValueChange={setQuery}
            // Always open: inside the palette the list IS the palette, so there
            // is nothing for a closed state to mean.
            open
            // The first match is armed, so Enter runs the obvious thing without
            // an arrow press. `mode="none"` keeps it from rewriting the query.
            autoHighlight="always"
            mode="none"
            itemToStringValue={(item: CommandItem) => item.label}
          >
            <div className="echo-command__bar">
              <span className="echo-command__caret" aria-hidden="true">
                ›
              </span>
              <Autocomplete.Input
                className="echo-command__input"
                placeholder={placeholder}
                aria-label="Search commands"
              />
            </div>

            <Autocomplete.Empty className="echo-command__empty">{emptyMessage}</Autocomplete.Empty>

            <Autocomplete.List className="echo-command__list">
              {(group: CommandGroup) => (
                <Autocomplete.Group
                  key={group.label}
                  items={group.items}
                  className="echo-command__group"
                >
                  <Autocomplete.GroupLabel className="echo-command__group-label">
                    {group.label}
                  </Autocomplete.GroupLabel>
                  <Autocomplete.Collection>
                    {(item: CommandItem) => (
                      <Autocomplete.Item
                        key={item.id}
                        value={item}
                        disabled={item.disabled}
                        className="echo-command__item"
                        onClick={() => runItem(item)}
                      >
                        <span className="echo-command__label">{item.label}</span>
                        {item.hint ? (
                          <span className="echo-command__hint">{item.hint}</span>
                        ) : null}
                      </Autocomplete.Item>
                    )}
                  </Autocomplete.Collection>
                </Autocomplete.Group>
              )}
            </Autocomplete.List>
          </Autocomplete.Root>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
