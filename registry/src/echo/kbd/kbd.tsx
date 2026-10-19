"use client";

/**
 * Kbd — a molded keycap for keyboard hints.
 *
 * It is a hint, not a control, so it never takes a click or focus. What it
 * does is go down when the key it names goes down on the real keyboard: the
 * cap under "⌘ K" presses as you press ⌘K, so the hint and the hand agree.
 * The key is read from the cap's text ("⌘", "Esc", "K"); caps whose text
 * names no key simply stay still.
 */
import { useEffect, type HTMLAttributes } from "react";
import { useCapPhysics } from "echo-ui-core/tactile";
import "./kbd.css";

export type KbdProps = HTMLAttributes<HTMLElement>;

/** The printed legend → the `KeyboardEvent.key` it stands for. */
const LEGENDS: Record<string, string> = {
  "⌘": "Meta",
  cmd: "Meta",
  command: "Meta",
  "⌃": "Control",
  ctrl: "Control",
  control: "Control",
  "⌥": "Alt",
  alt: "Alt",
  option: "Alt",
  "⇧": "Shift",
  shift: "Shift",
  esc: "Escape",
  escape: "Escape",
  "↵": "Enter",
  "⏎": "Enter",
  enter: "Enter",
  return: "Enter",
  tab: "Tab",
  "⇥": "Tab",
  space: " ",
  "␣": " ",
  "⌫": "Backspace",
  backspace: "Backspace",
  "←": "ArrowLeft",
  "→": "ArrowRight",
  "↑": "ArrowUp",
  "↓": "ArrowDown",
};

function keyForLegend(legend: unknown): string | null {
  if (typeof legend !== "string" && typeof legend !== "number") return null;
  const text = String(legend).trim();
  if (!text) return null;
  const named = LEGENDS[text] ?? LEGENDS[text.toLowerCase()];
  if (named) return named;
  return text.length === 1 ? text.toLowerCase() : null;
}

export function Kbd({ className, children, ...rest }: KbdProps) {
  const cap = useCapPhysics<HTMLElement>({ travel: 2, tilt: 0 });
  const key = keyForLegend(children);
  const { press, release } = cap;

  useEffect(() => {
    if (!key) return;
    const matches = (e: KeyboardEvent) => e.key.toLowerCase() === key.toLowerCase();
    const down = (e: KeyboardEvent) => {
      if (!e.repeat && matches(e)) press();
    };
    const up = (e: KeyboardEvent) => {
      if (matches(e)) release();
    };
    // A key held while the window loses focus never sends its keyup.
    const lost = () => release();
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", lost);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", lost);
    };
  }, [key, press, release]);

  return (
    <kbd ref={cap.ref} className={["echo-kbd", className].filter(Boolean).join(" ")} {...rest}>
      {children}
    </kbd>
  );
}
