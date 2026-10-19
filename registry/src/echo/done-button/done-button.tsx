"use client";

/**
 * DoneButton. "Mark as done" divides into a lit "Done" and an "Undo": two
 * HardwareButtons in a Morph.
 *
 * The lit cap is the state reached, not an action, so it can't be pressed
 * (announced as unavailable, drawn at full strength). Undo is the control,
 * and it takes focus as the halves appear. Undo, or Escape, folds them back.
 */
import type { MorphFeelName } from "echo-ui-core/tactile";
import { HardwareButton } from "../hardware-button";
import { Morph } from "../morph";
import "./done-button.css";

export interface DoneButtonProps {
  /** Done (divided) or not (whole). */
  done: boolean;
  onDoneChange: (done: boolean) => void;
  /** The whole's label. */
  children?: string;
  doneLabel?: string;
  undoLabel?: string;
  /** Said when it becomes done. */
  doneStatus?: string;
  feel?: MorphFeelName;
  size?: "sm" | "md" | "lg";
  /** Which edge stays put while the halves spread. */
  align?: "center" | "start" | "end";
  className?: string;
}

const Check = () => (
  <svg width="100%" height="100%" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M3 8.5l3.2 3.2L13 4.8" />
  </svg>
);
const Undo = () => (
  <svg width="100%" height="100%" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M6 9.5 2.5 6 6 2.5" />
    <path d="M2.5 6h7a4 4 0 010 8H8" />
  </svg>
);

export function DoneButton({
  done,
  onDoneChange,
  children = "Mark as done",
  doneLabel = "Done",
  undoLabel = "Undo",
  doneStatus = "Marked as done",
  feel,
  size,
  align,
  className,
}: DoneButtonProps) {
  return (
    <Morph
      feel={feel}
      align={align}
      className={["echo-done-button", className].filter(Boolean).join(" ")}
      status={done ? doneStatus : ""}
      onEscape={done ? () => onDoneChange(false) : undefined}
    >
      {done ? (
        <>
          <HardwareButton variant="primary" size={size} icon={<Check />} disabled>
            {doneLabel}
          </HardwareButton>
          <HardwareButton size={size} icon={<Undo />} onClick={() => onDoneChange(false)}>
            {undoLabel}
          </HardwareButton>
        </>
      ) : (
        <HardwareButton size={size} icon={<Check />} onClick={() => onDoneChange(true)}>
          {children}
        </HardwareButton>
      )}
    </Morph>
  );
}
