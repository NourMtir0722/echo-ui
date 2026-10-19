"use client";

/**
 * SaveButton. The button becomes its own progress, then its own answer:
 * "Save" narrows into a busy cap while `onSave` runs, widens into a lit
 * "Saved", and flows back. One HardwareButton in a Morph, so every step is
 * the same cap changing shape — no dots swapped in, no width jump.
 *
 * `onSave` may return a promise; the cap stays busy until it settles. If it
 * rejects, the button comes straight back and says so.
 */
import { useEffect, useRef, useState } from "react";
import type { MorphFeelName } from "echo-ui-core/tactile";
import { HardwareButton } from "../hardware-button";
import { Morph } from "../morph";
import "./save-button.css";

export interface SaveButtonProps {
  /** Runs on press. Return a promise to hold the busy state until it settles. */
  onSave: () => Promise<unknown> | void;
  /** The idle label. */
  children?: string;
  /** Said while saving, and the busy cap's name. */
  savingLabel?: string;
  savedLabel?: string;
  /** Said if `onSave` rejects. */
  errorLabel?: string;
  /** How long "Saved" stays, ms. */
  savedFor?: number;
  disabled?: boolean;
  feel?: MorphFeelName;
  size?: "sm" | "md" | "lg";
  align?: "center" | "start" | "end";
  className?: string;
}

const Disk = () => (
  <svg width="100%" height="100%" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M3 2.5h8l2.5 2.5v8.5h-10.5z" />
    <path d="M5.5 2.5v3.5h5v-3.5M5 13.5v-4h6v4" />
  </svg>
);
const Check = () => (
  <svg width="100%" height="100%" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M3 8.5l3.2 3.2L13 4.8" />
  </svg>
);

type Phase = "idle" | "saving" | "saved";

export function SaveButton({
  onSave,
  children = "Save",
  savingLabel = "Saving",
  savedLabel = "Saved",
  errorLabel = "Couldn't save",
  savedFor = 1800,
  disabled,
  feel,
  size,
  align,
  className,
}: SaveButtonProps) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [status, setStatus] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const alive = useRef(true);
  useEffect(() => {
    // Set on mount, not only at creation: React may mount it twice.
    alive.current = true;
    return () => {
      alive.current = false;
      clearTimeout(timer.current);
    };
  }, []);

  const save = async () => {
    if (phase !== "idle") return;
    clearTimeout(timer.current);
    setPhase("saving");
    setStatus(savingLabel);
    try {
      await onSave();
    } catch {
      if (!alive.current) return;
      setPhase("idle");
      setStatus(errorLabel);
      return;
    }
    if (!alive.current) return;
    setPhase("saved");
    setStatus(savedLabel);
    timer.current = setTimeout(() => setPhase("idle"), savedFor);
  };

  return (
    <Morph feel={feel} align={align} className={["echo-save-button", className].filter(Boolean).join(" ")} status={status}>
      {phase === "saving" ? (
        <HardwareButton data-morph="save" size={size} icon={<Disk />} iconOnly aria-label={savingLabel} loading />
      ) : phase === "saved" ? (
        <HardwareButton data-morph="save" variant="primary" size={size} icon={<Check />} disabled>
          {savedLabel}
        </HardwareButton>
      ) : (
        <HardwareButton data-morph="save" size={size} icon={<Disk />} disabled={disabled} onClick={() => void save()}>
          {children}
        </HardwareButton>
      )}
    </Morph>
  );
}
