"use client";

/**
 * Collapsible. One disclosure on its own: "Show more", advanced settings, a
 * single FAQ row, without Accordion's group rules. Base UI Collapsible owns
 * the button, `aria-expanded`, the link to the panel and the panel's height;
 * Echo gives it Accordion's ruled row and chevron, and a tap.
 *
 * Closed, like every new surface: a title, the content, and the open state.
 * The content stays in the page while closed (`hidden="until-found"`), so the
 * browser's find-in-page can reach it and opens it when it does.
 */
import type { ReactNode } from "react";
import { Collapsible as BaseCollapsible } from "@base-ui/react/collapsible";
import { useSoundOptional } from "echo-ui-core/sound";
import "./collapsible.css";

export interface CollapsibleProps {
  /** The row's label: what opening it shows ("Advanced settings"). */
  title: string;
  /** What it shows when open. */
  children: ReactNode;
  /** Controlled open state. */
  open?: boolean;
  /** Open to begin with, uncontrolled. Default false. */
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  disabled?: boolean;
}

export function Collapsible({ title, children, open, defaultOpen, onOpenChange, disabled }: CollapsibleProps) {
  const sound = useSoundOptional();
  return (
    <BaseCollapsible.Root
      className="echo-collapsible"
      {...(open !== undefined ? { open } : {})}
      {...(defaultOpen !== undefined ? { defaultOpen } : {})}
      {...(disabled !== undefined ? { disabled } : {})}
      onOpenChange={(next) => {
        sound?.play("tap");
        onOpenChange?.(next);
      }}
    >
      <BaseCollapsible.Trigger className="echo-collapsible__trigger">
        <span>{title}</span>
        <svg className="echo-collapsible__chevron" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </BaseCollapsible.Trigger>
      <BaseCollapsible.Panel className="echo-collapsible__panel" hiddenUntilFound>
        <div className="echo-collapsible__inner">{children}</div>
      </BaseCollapsible.Panel>
    </BaseCollapsible.Root>
  );
}
