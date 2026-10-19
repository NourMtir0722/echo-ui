/**
 * A selection, the way a design tool marks one: a flat, square outline in
 * the accent round what's being pointed at, with a square handle at each
 * corner. Echo's own
 * way to mark something up on the road (Check's off-style button, Pick's
 * promise), where a hand-drawn ring read as a scribble on a page made of
 * molded, lit parts. It snaps on, the way a selection
 * does; under reduced motion it's simply there. Laid over its parent, which
 * places it (`position: relative`), and never in the pointer's way.
 */
export function Selection({ on, className }: { on: boolean; className?: string }) {
  return (
    <span className={["jy-select", className].filter(Boolean).join(" ")} data-on={on ? "" : undefined} aria-hidden="true">
      <i />
      <i />
      <i />
      <i />
    </span>
  );
}
