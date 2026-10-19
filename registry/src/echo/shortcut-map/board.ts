/**
 * The keyboard a ShortcutMap draws, and how a shortcut's keys find their
 * caps on it. Pure: no React, no DOM.
 */

/** A cap on the board: its legend, and how many units wide it is. */
export interface BoardKey {
  legend: string;
  /** Width in units; 1 is a letter key. */
  width: number;
}

const k = (legend: string, width = 1): BoardKey => ({ legend, width });

/** A compact US layout, one row per array. */
export const BOARD: readonly (readonly BoardKey[])[] = [
  [k("Esc", 1.5), ..."1234567890".split("").map((c) => k(c)), k("-"), k("="), k("⌫", 1.5)],
  [k("Tab", 1.5), ..."QWERTYUIOP".split("").map((c) => k(c)), k("["), k("]"), k("\\", 1.5)],
  [k("Caps", 1.75), ..."ASDFGHJKL".split("").map((c) => k(c)), k(";"), k("'"), k("↵", 2.25)],
  [k("⇧", 2.25), ..."ZXCVBNM".split("").map((c) => k(c)), k(","), k("."), k("/"), k("⇧", 2.75)],
  [k("⌃", 1.25), k("⌥", 1.25), k("⌘", 1.5), k("Space", 5.5), k("⌘", 1.5), k("⌥", 1.25), k("←"), k("→"), k("↑"), k("↓")],
];

/** The names people write a key by, mapped to its legend on the board. */
const ALIASES: Readonly<Record<string, string>> = {
  cmd: "⌘",
  command: "⌘",
  meta: "⌘",
  mod: "⌘",
  "⌘": "⌘",
  ctrl: "⌃",
  control: "⌃",
  "⌃": "⌃",
  alt: "⌥",
  option: "⌥",
  opt: "⌥",
  "⌥": "⌥",
  shift: "⇧",
  "⇧": "⇧",
  enter: "↵",
  return: "↵",
  "↵": "↵",
  esc: "Esc",
  escape: "Esc",
  backspace: "⌫",
  delete: "⌫",
  "⌫": "⌫",
  tab: "Tab",
  space: "Space",
  left: "←",
  right: "→",
  up: "↑",
  down: "↓",
  "?": "/",
};

/** The board legend a shortcut's key lights, or null when the board has no such key. */
export function legendFor(key: string): string | null {
  const alias = ALIASES[key.toLowerCase()] ?? ALIASES[key];
  if (alias) return alias;
  const upper = key.toUpperCase();
  return BOARD.some((row) => row.some((c) => c.legend === upper)) ? upper : null;
}

/** Every board legend a shortcut lights. "?" needs Shift as well as its key. */
export function lit(keys: readonly string[]): Set<string> {
  const out = new Set<string>();
  for (const key of keys) {
    const legend = legendFor(key);
    if (legend) out.add(legend);
    if (key === "?") out.add("⇧");
  }
  return out;
}
