"use client";

/**
 * Ticket. A paper pass: what it's for on the main part, the code on a stub
 * across a perforation. Use it and the stub tears off along the perforation
 * and drops away, leaving the torn edge and "Used" where it was. For event
 * tickets, boarding passes, coupons, invites and gift cards.
 *
 * Same paper and ink as Receipt. Everything printed is text in the page, the
 * details a description list; the barcode is a picture of its code, printed
 * beneath it. Tearing it has a button.
 */
import { useId, useState, type ReactNode } from "react";
import { useReducedMotionRef } from "echo-ui-core/tactile";
import { useSoundOptional } from "echo-ui-core/sound";
import { HardwareButton } from "../hardware-button";
import { barcode } from "../receipt/barcode";
import "./ticket.css";

export interface TicketDetail {
  label: string;
  value: ReactNode;
}

export interface TicketProps {
  /** What it's for, printed large, and the ticket's heading. */
  title: string;
  /** Where, or who it's from. */
  subtitle?: string;
  /** The facts on the main part: a date, a door, a seat. */
  details?: readonly TicketDetail[];
  /** The code on the stub, as a barcode and in text. */
  code: string;
  /** Printed on the stub over its code: "Admit one", "Boarding". */
  stubLabel?: string;
  /** Torn off (controlled). */
  used?: boolean;
  defaultUsed?: boolean;
  /** Called once the stub has dropped away. With it, the ticket shows a key to use it. */
  onUse?: () => void;
  /** The key's word. Default "Use ticket". */
  useLabel?: string;
  /** The heading's level. Default 3. */
  headingLevel?: 2 | 3 | 4;
}

export function Ticket({
  title,
  subtitle,
  details = [],
  code,
  stubLabel,
  used,
  defaultUsed = false,
  onUse,
  useLabel = "Use ticket",
  headingLevel = 3,
}: TicketProps) {
  const Heading = `h${headingLevel}` as const;
  const id = useId();
  const sound = useSoundOptional();
  const reduced = useReducedMotionRef();
  const [inner, setInner] = useState(defaultUsed);
  const [tearing, setTearing] = useState(false);
  const isUsed = used ?? inner;
  const use = () => {
    if (isUsed || tearing) return;
    sound?.play("release");
    setTearing(true);
    window.setTimeout(
      () => {
        setTearing(false);
        if (used === undefined) setInner(true);
        onUse?.();
      },
      reduced.current ? 0 : 520,
    );
  };
  return (
    <section className="echo-ticket" aria-labelledby={`${id}-title`} data-used={isUsed || undefined} data-tearing={tearing || undefined}>
      <div className="echo-ticket__paper">
        <div className="echo-ticket__main">
          <Heading id={`${id}-title`} className="echo-ticket__title">
            {title}
          </Heading>
          {subtitle ? <p className="echo-ticket__subtitle">{subtitle}</p> : null}
          {details.length ? (
            <dl className="echo-ticket__details">
              {details.map((d) => (
                <div key={d.label} className="echo-ticket__detail">
                  <dt>{d.label}</dt>
                  <dd>{d.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>
        <div className="echo-ticket__perforation" aria-hidden="true" />
        <div className="echo-ticket__stub">
          {isUsed ? (
            <p className="echo-ticket__used">Used</p>
          ) : (
            <>
              {stubLabel ? <p className="echo-ticket__stub-label">{stubLabel}</p> : null}
              <svg className="echo-ticket__barcode" viewBox="0 0 200 36" preserveAspectRatio="none" aria-hidden="true" focusable="false">
                {barcode(code).map((bar, i) => (
                  <rect key={i} x={bar.x} y={0} width={bar.w} height={36} />
                ))}
              </svg>
              <p className="echo-ticket__code">{code}</p>
            </>
          )}
        </div>
      </div>
      {onUse && !isUsed ? (
        <div className="echo-ticket__action">
          <HardwareButton size="sm" disabled={tearing} onClick={use}>
            {useLabel}
          </HardwareButton>
        </div>
      ) : null}
    </section>
  );
}
