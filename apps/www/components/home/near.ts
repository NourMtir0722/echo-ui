/**
 * Calls `onNear` once, when `el` comes within `margin` px of the viewport
 * (a negative margin: that far inside it).
 *
 * Measured from the element's box on scroll, not with an
 * IntersectionObserver: an observer counts the target's own `clip-path`, so
 * an element clipped to nothing while it waits to be revealed would never
 * intersect, and never be revealed. Returns the function that stops watching.
 */
export function whenNear(el: Element, margin: number, onNear: () => void): () => void {
  let frame = 0;
  const stop = () => {
    window.removeEventListener("scroll", schedule);
    window.removeEventListener("resize", schedule);
    cancelAnimationFrame(frame);
  };
  const check = () => {
    frame = 0;
    const r = el.getBoundingClientRect();
    if (r.top < window.innerHeight + margin && r.bottom > -margin) {
      stop();
      onNear();
    }
  };
  function schedule() {
    if (!frame) frame = requestAnimationFrame(check);
  }
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule);
  schedule();
  return stop;
}
