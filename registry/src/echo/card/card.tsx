"use client";

/**
 * Card. A Panel with an anatomy, so every card in a product is spaced the
 * same way: optional media flush to the edges, a header (title, description,
 * one action on the right), a body, and a footer whose controls are `sm`.
 *
 * Give it `href` or `onClick` and the whole card is pressable: the title
 * becomes the link or button, stretched over the card, so a screen reader
 * hears one name and the card has one focus ring. It presses a pixel into
 * the surface and sends Panel's ripple from where you pressed; the header
 * action and the footer's controls stay their own targets on top.
 *
 * Closed: the slots are props, the spacing is `size` (sm/md/lg padding
 * steps), and there is no className. Built on Panel's material and
 * useRippleSurface.
 */
import { useRef, type MouseEventHandler, type ReactNode } from "react";
import { useSoundOptional } from "echo-ui-core/sound";
import { useRippleSurface } from "../panel";
import { SizeProvider, type ControlSize } from "../size";
import "./card.css";

export interface CardProps {
  /** The card's name. With `href` or `onClick`, it's also the link or button. */
  title: ReactNode;
  /** A line under the title. */
  description?: ReactNode;
  /** One control at the header's end: a menu, a toggle, a small button. */
  action?: ReactNode;
  /** An image, chart or preview across the top, flush to the edges. */
  media?: ReactNode;
  /** The body. */
  children?: ReactNode;
  /** Actions along the bottom; their controls default to `sm`. */
  footer?: ReactNode;
  /** `raised` plastic (default), or a `screen` well for a readout. */
  variant?: "raised" | "screen";
  /** Padding and gaps: `sm` for dense dashboards, `md` (default), `lg` for a feature. */
  size?: ControlSize;
  /** The whole card goes here. */
  href?: string;
  /** The whole card does this. */
  onClick?: MouseEventHandler<HTMLElement>;
  /** The title's heading level. Default 3. */
  headingLevel?: 2 | 3 | 4;
}

export function Card({
  title,
  description,
  action,
  media,
  children,
  footer,
  variant = "raised",
  size = "md",
  href,
  onClick,
  headingLevel = 3,
}: CardProps) {
  const interactive = href !== undefined || onClick !== undefined;
  const root = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const sound = useSoundOptional();
  useRippleSurface(root, canvas, { enabled: interactive });
  const Heading = `h${headingLevel}` as const;
  const press: MouseEventHandler<HTMLElement> = (e) => {
    sound?.play("tap");
    onClick?.(e);
  };

  const name = !interactive ? (
    title
  ) : href !== undefined ? (
    <a className="echo-card__link" href={href} onClick={onClick ? press : () => sound?.play("tap")}>
      {title}
    </a>
  ) : (
    <button type="button" className="echo-card__link" onClick={press}>
      {title}
    </button>
  );

  return (
    <div
      ref={root}
      className="echo-panel echo-card"
      data-variant={variant}
      data-size={size}
      data-interactive={interactive ? "" : undefined}
    >
      {interactive ? <canvas ref={canvas} className="echo-panel__ripple" aria-hidden="true" /> : null}
      <div className="echo-card__inner">
        {media ? <div className="echo-card__media">{media}</div> : null}
        <div className="echo-card__header">
          <div className="echo-card__heading">
            <Heading className="echo-card__title">{name}</Heading>
            {description ? <p className="echo-card__description">{description}</p> : null}
          </div>
          {action ? <div className="echo-card__action">{action}</div> : null}
        </div>
        {children ? <div className="echo-card__body">{children}</div> : null}
        {footer ? (
          <SizeProvider size="sm">
            <div className="echo-card__footer">{footer}</div>
          </SizeProvider>
        ) : null}
      </div>
    </div>
  );
}
