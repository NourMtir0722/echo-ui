/**
 * Link. Text that goes somewhere. The words stay in `--echo-text` and the
 * accent is the underline: accent-coloured text on the chassis measures
 * 3.70:1, under AA, while an accent underline under readable text carries the
 * brand without costing the words their contrast. Hovered, the underline
 * thickens toward the words; focused, it gets the library's ring.
 *
 * `external` opens a new tab and says so, to the eye (an arrow) and to a
 * screen reader ("opens in a new tab"). To navigate with a router, pass its
 * link as `render` (`render={<NextLink href="/docs" />}`): Echo keeps the
 * look and the router keeps the navigation.
 */
import { cloneElement, isValidElement, type MouseEventHandler, type ReactElement, type ReactNode } from "react";
import "./link.css";

export interface LinkProps {
  /** Where it goes. */
  href: string;
  children: ReactNode;
  /** Opens in a new tab, and says so. Adds `rel="noopener noreferrer"`. */
  external?: boolean;
  /** `muted` for a link among quiet text (a footer, a caption): dim words, the same underline. */
  tone?: "default" | "muted";
  /**
   * Render through your router's link instead of a plain `<a>`: the element
   * gets the href, the class and the children.
   */
  render?: ReactElement<Record<string, unknown>>;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
  /** The page this link points at is the current one. */
  "aria-current"?: "page" | "step" | "location" | "true";
}

export function Link({ href, children, external = false, tone = "default", render, onClick, ...aria }: LinkProps) {
  const props = {
    href,
    className: "echo-link",
    "data-tone": tone === "muted" ? "muted" : undefined,
    onClick,
    ...(external ? { target: "_blank", rel: "noopener noreferrer" } : {}),
    ...aria,
  };
  const content = (
    <>
      {children}
      {external ? (
        <>
          <svg className="echo-link__out" viewBox="0 0 12 12" width="10" height="10" aria-hidden="true" focusable="false">
            <path d="M4 2h6v6M10 2 3 9" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="echo-link__sr"> (opens in a new tab)</span>
        </>
      ) : null}
    </>
  );
  if (render && isValidElement(render)) return cloneElement(render, props, content);
  return <a {...props}>{content}</a>;
}
