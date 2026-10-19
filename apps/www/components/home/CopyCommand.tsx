"use client";

/**
 * The hero's command pill: the command in mono, press to copy. Copying is
 * running it, as far as Echo is concerned: it works for a moment.
 */
import { cheerGuide } from "@/components/home/Guide";
import { useCopy } from "@/components/use-copy";

export function CopyCommand({ cmd }: { cmd: string }) {
  const { copied, copy } = useCopy();
  return (
    <button
      type="button"
      className="hero4__cmd copy-cmd"
      onClick={() => {
        void copy(cmd);
        cheerGuide(1600);
      }}
      aria-label={copied ? "Copied" : `Copy the command: ${cmd}`}
    >
      <span className="hero4__cmd-prompt" aria-hidden="true">
        $
      </span>
      <code>{cmd}</code>
      <span className="hero4__cmd-icon" aria-hidden="true">
        <CopyIcon copied={copied} />
      </span>
    </button>
  );
}

/** Copy, or the tick once it's copied. */
export function CopyIcon({ copied }: { copied: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {copied ? (
        <path d="M5 12l5 5L20 7" />
      ) : (
        <>
          <rect x="9" y="9" width="11" height="11" rx="2" />
          <path d="M5 15V6a2 2 0 0 1 2-2h8" />
        </>
      )}
    </svg>
  );
}
