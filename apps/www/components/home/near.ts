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

/** How long the page has to go without scrolling to count as resting, ms: longer than a frame of a glide. */
const QUIET = 200;

/**
 * Calls `onStill` once, the first time the page rests (no scroll for a moment) and the browser has time to
 * spare: for building something heavy (a WebGL canvas, its shaders) between pushes of the scroll, never in
 * the middle of one, where it would hold the page still for as long as it takes. Returns the function that
 * stops waiting.
 */
export function whenStill(onStill: () => void): () => void {
  let timer = 0;
  let idle = 0;
  const ric = (window as { requestIdleCallback?: typeof requestIdleCallback }).requestIdleCallback;
  const stop = () => {
    window.removeEventListener("scroll", restart);
    window.clearTimeout(timer);
    if (idle) window.cancelIdleCallback?.(idle);
  };
  const rested = () => {
    // Safari before 18 has no idle callback: the rest stands in for it.
    if (!ric) {
      stop();
      onStill();
      return;
    }
    idle = ric(
      () => {
        stop();
        onStill();
      },
      { timeout: 500 },
    );
  };
  function restart() {
    window.clearTimeout(timer);
    if (idle) window.cancelIdleCallback?.(idle);
    idle = 0;
    timer = window.setTimeout(rested, QUIET);
  }
  window.addEventListener("scroll", restart, { passive: true });
  restart();
  return stop;
}
