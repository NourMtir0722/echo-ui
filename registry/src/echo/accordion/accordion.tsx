"use client";

/**
 * Accordion. Base UI Accordion behavior (keyboard,
 * a11y, panel height measurement) skinned as molded device panels, with a click
 * sound on toggle. Panel height animates via CSS (Base UI auto-detects the
 * transition), so no GSAP presence is needed here.
 *
 * Compound API: <Accordion><Accordion.Item><Accordion.Trigger/><Accordion.Panel/></Accordion.Item></Accordion>.
 *
 * NOTE: the package is `@base-ui/react`, NOT `@base-ui-components/react`.
 */
import type { ComponentProps } from "react";
import { Accordion as BaseAccordion } from "@base-ui/react/accordion";
import { useSoundOptional } from "echo-ui-core/sound";
import "./accordion.css";

const cx = (...c: (string | undefined)[]) => c.filter(Boolean).join(" ");

/** Narrow Base UI's string-or-function className to a plain string for skinning. */
type Skin<T> = Omit<T, "className"> & { className?: string };

function AccordionRoot({
  onValueChange,
  className,
  ...props
}: Skin<ComponentProps<typeof BaseAccordion.Root>>) {
  const sound = useSoundOptional();
  return (
    <BaseAccordion.Root
      className={cx("echo-accordion", className)}
      onValueChange={(value, eventDetails) => {
        sound?.play("tap");
        onValueChange?.(value, eventDetails);
      }}
      {...props}
    />
  );
}

function AccordionItem({ className, ...props }: Skin<ComponentProps<typeof BaseAccordion.Item>>) {
  return <BaseAccordion.Item className={cx("echo-accordion__item", className)} {...props} />;
}

function Chevron() {
  return (
    <svg
      className="echo-accordion__chevron"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function AccordionTrigger({
  className,
  children,
  ...props
}: Skin<ComponentProps<typeof BaseAccordion.Trigger>>) {
  return (
    <BaseAccordion.Header className="echo-accordion__header">
      <BaseAccordion.Trigger className={cx("echo-accordion__trigger", className)} {...props}>
        <span>{children}</span>
        <Chevron />
      </BaseAccordion.Trigger>
    </BaseAccordion.Header>
  );
}

function AccordionPanel({
  className,
  children,
  ...props
}: Skin<ComponentProps<typeof BaseAccordion.Panel>>) {
  return (
    <BaseAccordion.Panel className={cx("echo-accordion__panel", className)} {...props}>
      <div className="echo-accordion__panel-inner">{children}</div>
    </BaseAccordion.Panel>
  );
}

// Assembled into `Accordion` in index.ts, which isn't a client module.
export { AccordionRoot, AccordionItem, AccordionTrigger, AccordionPanel };
