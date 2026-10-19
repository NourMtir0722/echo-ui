"use client";

/**
 * Avatar. A person or device as a molded disc: the
 * image seated in a well, or initials engraved into the plastic when there is
 * no image — or when the image fails to load, which is the case a plain <img>
 * silently gets wrong.
 *
 * A static component with no behaviour primitive underneath: the only
 * behaviour is the load-failure fallback, which is a single piece of state.
 * NOTE: @base-ui/react has since added an `avatar` primitive with the same
 * fallback semantics. Moving onto it would change the component's behaviour,
 * not just its internals, so it stays hand-built until that call is made.
 */
import { useCallback, useState } from "react";
import type { HTMLAttributes } from "react";
import "./avatar.css";

export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";
export type AvatarStatus = "live" | "idle";

export interface AvatarProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
  /** Image URL. Omit to render initials. */
  src?: string;
  /** Who or what this is. Required — it is the accessible name. */
  name: string;
  size?: AvatarSize;
  /** Override the derived initials (e.g. a device code). */
  initials?: string;
  /**
   * A presence LED seated in the rim: `live` is lit, `idle` is an empty
   * socket — StatusDot's fill-vs-hollow rule, so the state never rests on
   * colour alone. Added to the accessible name as ", live" / ", idle".
   */
  status?: AvatarStatus;
  /** Override the words announced for `status`. */
  statusLabel?: string;
}

/** First letters of the first and last words — "Ada Lovelace" → "AL". */
function deriveInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  const first = words[0]![0] ?? "";
  const last = words.length > 1 ? (words[words.length - 1]![0] ?? "") : "";
  return (first + last).toUpperCase();
}

export function Avatar({
  src,
  name,
  size = "md",
  initials,
  status,
  statusLabel,
  className,
  ...rest
}: AvatarProps) {
  // Keyed by URL rather than a boolean, so a new src gets a fresh attempt
  // instead of inheriting the previous one's failure.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const showImage = Boolean(src) && failedSrc !== src;

  /**
   * The server-rendered <img> starts loading before hydration, so a 404 can
   * fire its error event before React ever attaches onError — leaving a
   * permanently broken image and no fallback. Re-check the outcome when the
   * node attaches: complete with no intrinsic width means it failed.
   */
  const checkAlreadyFailed = useCallback(
    (node: HTMLImageElement | null) => {
      if (node && node.complete && node.naturalWidth === 0 && src) setFailedSrc(src);
    },
    [src],
  );

  return (
    <span
      className={["echo-avatar", className].filter(Boolean).join(" ")}
      data-size={size}
      data-status={status}
      role="img"
      aria-label={status ? `${name}, ${statusLabel ?? status}` : name}
      {...rest}
    >
      {showImage ? (
        <img
          className="echo-avatar__image"
          ref={checkAlreadyFailed}
          src={src}
          alt=""
          onError={() => setFailedSrc(src ?? null)}
          draggable={false}
        />
      ) : (
        <span className="echo-avatar__initials" aria-hidden="true">
          {initials ?? deriveInitials(name)}
        </span>
      )}
      {status ? <span className="echo-avatar__led" aria-hidden="true" /> : null}
    </span>
  );
}
