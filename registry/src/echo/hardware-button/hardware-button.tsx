"use client";

/**
 * HardwareButton — the molded tactile button of Echo.
 * Rebuilt on semantic vars (createEchoTheme) + useCapPhysics: a cap in a
 * recessed well that presses like a key switch, with the clicks on the mechanism. Styling lives in
 * hardware-button.css (var(--echo-*), no inline style objects).
 *
 * Variants: primary (the one accent) · neutral (plastic) · ghost (flat).
 * Sizes sm/md/lg on the one control scale: the outer height (well included)
 * is 32/44/60px, the same as a Field or Select of that size. A size can come
 * from a SizeProvider around it. Icon slots, icon-only, loading, engraved,
 * disabled, fullWidth.
 */
import {
  forwardRef,
  useCallback,
  useEffect,
  type CSSProperties,
  type DOMAttributes,
  type MutableRefObject,
  type ReactNode,
} from "react";
import type { EchoPressInterop } from "echo-ui-core/types";
import { useCapPhysics } from "echo-ui-core/tactile";
import { useControlSize, type ControlSize } from "../size";
import { warnIfUnsupportedTreatment, warnIfCaptionRepeatsLabel } from "./treatment";
import "./hardware-button.css";

/*
 * Bundlers replace `process.env.NODE_ENV` at build time, but an app without
 * Node's types (a standard Vite project) has no `process` to type-check
 * against. Declared in this module so the file compiles in any React app.
 */
declare const process: { env: { NODE_ENV?: string } };

export {
  warnIfUnsupportedTreatment,
  warnIfCaptionRepeatsLabel,
  __resetEngravedPrimaryWarning,
} from "./treatment";

export type HardwareButtonVariant = "primary" | "neutral" | "ghost";
export type HardwareButtonSize = ControlSize;

/**
 * Narrowed deliberately, and this was the one that had it backwards.
 *
 * `HardwareButton` extended `ButtonHTMLAttributes` and accepted everything —
 * `className`, `style`, any DOM attribute — while every form control was so
 * closed that `onBlur` was a type error. The open one was the button, which
 * needs it least. `PRINCIPLES.md` now says Echo components are closed, so this
 * is the exception brought into line rather than the model to copy.
 */
interface HardwareButtonOwnProps extends EchoPressInterop {
  /** The cap's label. */
  children?: ReactNode;
  variant?: HardwareButtonVariant;
  /**
   * Outer height on the control scale: `sm` 32px (toolbars, table rows,
   * inline with text), `md` 44px (the default: forms, dialogs, a button beside
   * a field), `lg` 60px (the one action a screen is built around: sign in,
   * checkout, an empty state's call to action). Defaults to the nearest
   * SizeProvider's size, else `md`.
   */
  size?: HardwareButtonSize;
  /** The button takes the full width of the row it's in. */
  fullWidth?: boolean;
  /** Leading icon. */
  icon?: ReactNode;
  /** Trailing icon. */
  trailingIcon?: ReactNode;
  /** Show the loading dots; also disables interaction. */
  loading?: boolean;
  /**
   * Debossed label carved into the cap — the label is cut INTO the plastic
   * rather than printed on it.
   *
   * What it costs, measured across the four shipped seeds: the label drops to
   * **1.13-1.87:1** on a neutral cap and **~1.05-1.3:1** on a primary one, far
   * below the 4.5:1 that AA asks of text. That is not a bug to be fixed —
   * low contrast IS the debossed effect, and rendering it at 4.5:1 would stop
   * it looking carved.
   *
   * What that means for use: engraving is legitimate only where the label is
   * **not the only thing telling you what the control does** — a key in a
   * labelled group, a cap whose icon or caption carries the meaning. It is not
   * legitimate on a submit button, where the word is the whole interface.
   * `engraved` + `variant="primary"` warns in development for that reason.
   */
  engraved?: boolean;
  /**
   * Small machine caption rendered under the button.
   *
   * **The rule: a caption must not repeat the label.** Two screens
   * had reached opposite conclusions about this — one deliberately omitted it,
   * with the note that "repeating it there is the only text on the screen that
   * says nothing", while the other rendered `caption="save"` under a button
   * labelled "Save changes". The first one's reasoning is right, so it is the
   * rule.
   *
   * A caption earns its place when it says something the label cannot: the
   * device state a key reflects ("rec", "ready"), a shortcut, a unit. If it is
   * a shorter spelling of the label, it is decoration on the one control a
   * screen is built around, and it costs a line of vertical rhythm to say
   * nothing. Repeating the label warns in development.
   */
  caption?: string;
  /**
   * Navigate instead of act: the cap renders as an `<a href>` with the same
   * material, press and sound. Use it wherever the button GOES somewhere — a
   * `<button>` with a router push loses open-in-new-tab, the link's status-bar
   * URL and the "link" role a screen reader announces. The forwarded ref is
   * then the anchor. `disabled` and `loading` do not apply to a link.
   */
  href?: string;
  /** With `href`: where to open it (e.g. "_blank"). */
  target?: string;
  /** With `href`: link relationship (e.g. "noopener"). */
  rel?: string;
  /**
   * The press lands in the whole device, not just the cap: the well dips with
   * the bottom-out and a ring of light runs round it. For the one action a
   * screen is built around (record, send, deploy). On every button it stops
   * meaning anything.
   */
  impact?: boolean;
  /**
   * How full the cap is, 0–1: the primary plastic fills it from the start
   * edge, like a level. For a cap that is also a quantity — a timer running
   * down, a note playing through. The label stays on top at full contrast;
   * the fill is decoration, so say the quantity in the label too.
   */
  fill?: number;
  /**
   * Holds the cap down from outside, the way a real key going down would:
   * `true` presses it (with its click), `false` lets it come home. For a
   * drawn keyboard that follows the typing, like Keypad's keys under a
   * hardware keyboard. It moves the cap only; it never clicks the button.
   */
  held?: boolean;
}

/**
 * An icon-only cap shows no text, so it needs a name some other way:
 * `iconOnly` without `aria-label` or `aria-labelledby` is a type error.
 */
type IconOnly =
  | { iconOnly?: false }
  | {
      /** Square icon-only cap. Needs `aria-label` or `aria-labelledby`. */
      iconOnly: true;
      "aria-label": string;
      "aria-labelledby"?: string;
    }
  | { iconOnly: true; "aria-labelledby": string; "aria-label"?: string };

export type HardwareButtonProps = HardwareButtonOwnProps & IconOnly;

export const HardwareButton = forwardRef<HTMLButtonElement, HardwareButtonProps>(
  function HardwareButton(
    {
      variant = "neutral",
      size: ownSize,
      fullWidth = false,
      icon,
      trailingIcon,
      iconOnly = false,
      loading = false,
      engraved = false,
      caption,
      disabled = false,
      children,
      href,
      target,
      rel,
      impact = false,
      fill,
      held,
      ...rest
    },
    forwardedRef,
  ) {
    const size = useControlSize(ownSize);
    // The cap is a key switch (useCapPhysics): it lifts and leans toward the
    // pointer, clicks as it lands on its seam, loads while held, and clicks
    // again as it tops out on the way home.
    const {
      ref: capRef,
      handlers: capHandlers,
      press,
      release,
    } = useCapPhysics<HTMLButtonElement>({
      tilt: iconOnly ? 8 : 4,
      impact,
      sound: true,
    });

    // Held from outside: the cap goes down and comes home with the key.
    useEffect(() => {
      if (held === undefined) return;
      if (held) press();
      else release();
    }, [held, press, release]);

    const setRef = useCallback(
      (node: HTMLButtonElement | null) => {
        capRef(node);
        if (typeof forwardedRef === "function") forwardedRef(node);
        else if (forwardedRef)
          (forwardedRef as MutableRefObject<HTMLButtonElement | null>).current = node;
      },
      [forwardedRef, capRef],
    );

    const off = disabled || loading;

    /*
     * `engraved` on a primary cap is not a supported combination.
     *
     * Debossed type measures ~1.05-1.3:1 over the primary gradient. On the
     * neutral cap that is a defensible decorative treatment; on the primary
     * one it is reserved for the single most important control on a screen,
     * and both shipped templates had used it on their submit button. The one
     * word that says what the form does rendered as a smudge.
     *
     * A warning rather than an error: it is a legibility judgement, not a
     * crash, and someone with a genuinely non-textual primary cap should be
     * able to ignore it. Development only — `process.env.NODE_ENV` is compiled
     * out of production bundles, so this costs shipped users nothing.
     */
    if (process.env.NODE_ENV !== "production") {
      warnIfUnsupportedTreatment(variant, engraved);
      warnIfCaptionRepeatsLabel(caption, children);
    }

    // Merge the cap's handlers with any passed in via props (e.g. when a Base
    // UI Tooltip/Popover/Dialog uses this button as its trigger) so neither
    // clobbers the other — both fire.
    const restProps = rest as Record<string, unknown>;
    const mergedHandlers: Record<string, (event: never) => void> = {};
    for (const key of Object.keys(capHandlers) as (keyof DOMAttributes<HTMLButtonElement>)[]) {
      const motion = capHandlers[key] as ((event: never) => void) | undefined;
      const incoming = restProps[key] as ((event: never) => void) | undefined;
      mergedHandlers[key] = (event) => {
        incoming?.(event);
        motion?.(event);
      };
    }

    const filled = fill === undefined ? undefined : Math.min(1, Math.max(0, fill));
    /*
     * The type takes no className or style, but both still arrive: a Base UI
     * part that renders the cap (`<Menu.Trigger render={<HardwareButton />}>`)
     * passes its own class, and JavaScript passes what it likes. Spread after
     * the cap's own, they replaced it — the cap lost its look, and its fill
     *. They're added to it instead.
     */
    const { className: extraClass, style: extraStyle, ...passed } = restProps as {
      className?: string;
      style?: CSSProperties;
    };
    const capProps = {
      className: extraClass ? `echo-hw__cap ${extraClass}` : "echo-hw__cap",
      "data-variant": variant,
      "data-size": size,
      "data-icon-only": iconOnly || undefined,
      "data-engraved": engraved || undefined,
      "data-fill": filled === undefined ? undefined : "",
      // The one dynamic value, as a variable the stylesheet reads.
      style:
        filled === undefined
          ? extraStyle
          : ({ ...extraStyle, "--hw-fill": filled.toFixed(4) } as CSSProperties),
    };

    const content = (
      <>
        {/* Content stays in the accessibility tree even while loading (just
            visually hidden) so the button keeps its accessible name. */}
        <span className="echo-hw__content" data-hidden={loading || undefined}>
          {icon ? (
            <span className="echo-hw__icon" aria-hidden>
              {icon}
            </span>
          ) : null}
          {!iconOnly && children != null ? <span>{children}</span> : null}
          {trailingIcon ? (
            <span className="echo-hw__icon" aria-hidden>
              {trailingIcon}
            </span>
          ) : null}
        </span>
        {loading ? (
          <span className="echo-hw__dots" aria-hidden>
            <i />
            <i />
            <i />
          </span>
        ) : null}
        {filled !== undefined ? <span className="echo-hw__fill" aria-hidden /> : null}
        <span className="echo-hw__glint" aria-hidden />
      </>
    );

    return (
      <div
        className="echo-hw"
        data-size={size}
        data-variant={variant}
        data-full-width={fullWidth || undefined}
      >
        <div className="echo-hw__well" data-impact={impact || undefined}>
          {href != null ? (
            <a
              // The tactile hooks and the forwarded ref are typed for the
              // button; the anchor takes the same pointer and key handlers.
              ref={setRef as unknown as (node: HTMLAnchorElement | null) => void}
              href={href}
              target={target}
              rel={rel}
              {...capProps}
              {...passed}
              {...mergedHandlers}
            >
              {content}
            </a>
          ) : (
            <button
              ref={setRef}
              type="button"
              {...capProps}
              data-loading={loading || undefined}
              disabled={off}
              aria-busy={loading || undefined}
              {...passed}
              {...mergedHandlers}
            >
              {content}
            </button>
          )}
        </div>
        {caption ? <span className="echo-hw__caption">{caption}</span> : null}
      </div>
    );
  },
);
