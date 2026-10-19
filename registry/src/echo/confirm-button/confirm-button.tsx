"use client";

/**
 * ConfirmButton. A destructive action that asks for its second press where
 * the hand already is: the "Delete" HardwareButton divides into "Cancel" and
 * a primary "Delete". Cancel folds back; Delete confirms, and the parts fold
 * into a button saying what happened ("Deleted"), which flows back to its
 * first label a moment later.
 *
 * Cancel takes focus as the parts appear, so Enter twice never confirms.
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { MorphFeelName } from "echo-ui-core/tactile";
import { HardwareButton } from "../hardware-button";
import { Morph } from "../morph";

export interface ConfirmButtonProps {
  /** The whole's label, e.g. "Delete project". */
  children: ReactNode;
  onConfirm: () => void;
  /** The primary part that confirms. */
  confirmLabel?: string;
  cancelLabel?: string;
  /** What the whole says after confirming, e.g. "Deleted". Omit to go straight back. */
  confirmedLabel?: string;
  /** How long the confirmed label stays, ms. */
  confirmedFor?: number;
  icon?: ReactNode;
  feel?: MorphFeelName;
  size?: "sm" | "md" | "lg";
  /** Which edge stays put while the parts spread. */
  align?: "center" | "start" | "end";
  className?: string;
}

const Bin = () => (
  <svg width="100%" height="100%" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M2.5 4.5h11M6.5 7v4.5M9.5 7v4.5M3.8 4.5l.7 9h7l.7-9M6 4.5v-2h4v2" />
  </svg>
);
const Check = () => (
  <svg width="100%" height="100%" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M3 8.5l3.2 3.2L13 4.8" />
  </svg>
);

export function ConfirmButton({
  children,
  onConfirm,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  confirmedLabel,
  confirmedFor = 2000,
  icon = <Bin />,
  feel,
  size,
  align,
  className,
}: ConfirmButtonProps) {
  const [asking, setAsking] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [status, setStatus] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const cancel = () => {
    setAsking(false);
    setStatus("Cancelled");
  };
  const confirm = () => {
    setAsking(false);
    onConfirm();
    setStatus(confirmedLabel ?? "Done");
    if (!confirmedLabel) return;
    setConfirmed(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setConfirmed(false), confirmedFor);
  };

  return (
    <Morph feel={feel} align={align} className={className} status={status} onEscape={asking ? cancel : undefined}>
      {asking ? (
        <>
          <HardwareButton size={size} onClick={cancel}>
            {cancelLabel}
          </HardwareButton>
          <HardwareButton variant="primary" size={size} icon={<Bin />} onClick={confirm}>
            {confirmLabel}
          </HardwareButton>
        </>
      ) : (
        <HardwareButton
          size={size}
          icon={confirmed ? <Check /> : icon}
          onClick={() => {
            clearTimeout(timer.current);
            setConfirmed(false);
            setAsking(true);
            setStatus(`Confirm ${confirmLabel.toLowerCase()}`);
          }}
        >
          {confirmed ? confirmedLabel : children}
        </HardwareButton>
      )}
    </Morph>
  );
}
