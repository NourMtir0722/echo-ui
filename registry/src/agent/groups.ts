/**
 * Which group each item belongs to: the docs sidebar's sections, and the
 * `group` an agent sees on each catalog entry. One map, so "Motion" means
 * the same items in the sidebar, the Motion gallery's docs and a
 * search_components("motion").
 */
import type { MetaName } from "./metas";

export type DocGroup =
  | "Foundations"
  | "Buttons"
  | "Forms"
  | "Overlays"
  | "Navigation"
  | "Layout"
  | "Data display"
  | "Feedback"
  | "Objects"
  | "Motion"
  | "Creature"
  | "Texture"
  | "Templates";

/**
 * Item → docs group, in sidebar order: the groups are named for what you're
 * building, and a group lists its items alphabetically (Foundations reads in
 * the order you'd learn it). Typed as a Record over every registry item name,
 * so adding an item to the registry without giving it a group is a type error
 * rather than a page that silently never appears.
 *
 * Objects are the hardware only Echo has: dials, keypads, readouts, printed
 * paper, a player. They are where someone looks for "the knob", so they stay
 * together rather than being spread across Forms and Data display.
 */
export const GROUP_OF: Readonly<Record<MetaName, DocGroup>> = {
  "echo-theme": "Foundations",
  "echo-size": "Foundations",
  "echo-scope": "Foundations",
  "echo-sound": "Foundations",
  "echo-motion": "Foundations",
  "use-tactile": "Foundations",
  "use-gsap-presence": "Foundations",
  "echo-hardware-button": "Buttons",
  "echo-led-key": "Buttons",
  "echo-toggle": "Buttons",
  "echo-toolbar": "Buttons",
  "echo-checkbox": "Forms",
  "echo-checkbox-group": "Forms",
  "echo-choice-cards": "Forms",
  "echo-combobox": "Forms",
  "echo-field": "Forms",
  "echo-date-field": "Forms",
  "echo-calendar": "Forms",
  "echo-date-picker": "Forms",
  "echo-file-upload": "Forms",
  "echo-fieldset": "Forms",
  "echo-form": "Forms",
  "echo-number-field": "Forms",
  "echo-otp-field": "Forms",
  "echo-radio-group": "Forms",
  "echo-range-slider": "Forms",
  "echo-segmented": "Forms",
  "echo-select": "Forms",
  "echo-slider": "Forms",
  "echo-switch": "Forms",
  "echo-tags-input": "Forms",
  "echo-textarea": "Forms",
  "echo-alert-dialog": "Overlays",
  "echo-command": "Overlays",
  "echo-menu": "Overlays",
  "echo-modal": "Overlays",
  "echo-popover": "Overlays",
  "echo-sheet": "Overlays",
  "echo-tooltip": "Overlays",
  "echo-breadcrumb": "Navigation",
  "echo-link": "Navigation",
  "echo-pagination": "Navigation",
  "echo-side-nav": "Navigation",
  "echo-steps": "Navigation",
  "echo-tab-bar": "Navigation",
  "echo-tabs": "Navigation",
  "echo-accordion": "Layout",
  "echo-app-shell": "Layout",
  "echo-card": "Layout",
  "echo-collapsible": "Layout",
  "echo-divider": "Layout",
  "echo-item": "Layout",
  "echo-panel": "Layout",
  "echo-pull-to-refresh": "Layout",
  "echo-scroll-area": "Layout",
  "echo-layout": "Layout",
  "echo-widget-grid": "Layout",
  "echo-avatar": "Data display",
  "echo-badge": "Data display",
  "echo-chart": "Data display",
  "echo-count-badge": "Data display",
  "echo-description-list": "Data display",
  "echo-kbd": "Data display",
  "echo-lcd-chip": "Data display",
  "echo-shortcut-map": "Data display",
  "echo-stat-tile": "Data display",
  "echo-table": "Data display",
  "echo-tag": "Data display",
  "echo-banner": "Feedback",
  "echo-empty-state": "Feedback",
  "echo-loader": "Feedback",
  "echo-meter": "Feedback",
  "echo-notification-center": "Feedback",
  "echo-progress": "Feedback",
  "echo-skeleton": "Feedback",
  "echo-status-dot": "Feedback",
  "echo-status-island": "Feedback",
  "echo-toast": "Feedback",
  "echo-annunciator": "Objects",
  "echo-date-tile": "Objects",
  "echo-engraved-plate": "Objects",
  "echo-fill-slider": "Objects",
  "echo-filter-tray": "Objects",
  "echo-jog-wheel": "Objects",
  "echo-keypad": "Objects",
  "echo-knob": "Objects",
  "echo-level-meter": "Objects",
  "echo-now-playing": "Objects",
  "echo-patch-bay": "Objects",
  "echo-quick-tile": "Objects",
  "echo-receipt": "Objects",
  "echo-segment-display": "Objects",
  "echo-switch-bank": "Objects",
  "echo-ticket": "Objects",
  "echo-tuner": "Objects",
  "echo-week-strip": "Objects",
  "echo-action-fan": "Motion",
  "echo-add-to-bag": "Motion",
  "echo-confirm-button": "Motion",
  "echo-done-button": "Motion",
  "echo-hold-button": "Motion",
  "echo-light-source": "Motion",
  "echo-magnetic": "Motion",
  "echo-morph": "Motion",
  "echo-pull-cord": "Motion",
  "echo-ripple": "Motion",
  "echo-save-button": "Motion",
  "echo-split-flap": "Motion",
  "echo-stopwatch": "Motion",
  "echo-throw-stack": "Motion",
  "echo-timer": "Motion",
  "echo-bud-off": "Motion",
  "echo-roll": "Motion",
  "echo-voice-note": "Motion",
  "echo-creature": "Creature",
  "echo-perch": "Creature",
  "echo-shader-field": "Texture",
  "echo-textures": "Texture",
  "echo-chat": "Templates",
  "echo-console": "Templates",
};

export const DOC_GROUPS: readonly DocGroup[] = [
  "Foundations",
  "Buttons",
  "Forms",
  "Overlays",
  "Navigation",
  "Layout",
  "Data display",
  "Feedback",
  "Objects",
  "Motion",
  "Creature",
  "Texture",
  "Templates",
];

