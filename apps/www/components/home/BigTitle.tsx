/**
 * A section's opening, Swiss, in the hero's voice: one giant title in
 * capitals, set tight and left, across the whole width; under it, on the
 * right, one plain sentence, justified like the hero's paragraph. People
 * scroll fast, so the title alone has to say what the section gives them,
 * and still make sense as a search result.
 *
 * `kicker` is the small mono line on the left of the sentence ("/ Who it's
 * for"), the hero's list voice. `count` is a number set big beside it, only
 * where a count is information (the motion list's "08").
 *
 * The sentence is two-tone: wrap its claim in <strong> and the claim reads in
 * the text colour, the rest in the dim one, at the same size.
 */
import type { ReactNode } from "react";

export function BigTitle({
  id,
  as: Tag = "h2",
  kicker,
  count,
  title,
  size = "section",
  align = "split",
  children,
}: {
  id: string;
  as?: "h1" | "h2" | "h3";
  kicker?: ReactNode;
  count?: string;
  title: ReactNode;
  /** `sub`: a part of a section with a title of its own ("Or a whole screen"), set smaller. */
  size?: "hero" | "section" | "sub";
  /** `split`: the sentence on the right, under the title. `stack`: straight under it, on the left. */
  align?: "split" | "stack";
  children?: ReactNode;
}) {
  return (
    <header className="big-title" data-size={size} data-align={align} data-reveal="">
      <Tag id={id} className="big-title__h">
        {title}
      </Tag>
      {(kicker != null || count != null) && (
        <div className="big-title__meta">
          {kicker != null && <p className="big-title__kicker">{kicker}</p>}
          {count != null && (
            <p className="big-title__count" aria-hidden="true">
              {count}
            </p>
          )}
        </div>
      )}
      {children != null && <p className="big-title__lede">{children}</p>}
    </header>
  );
}
