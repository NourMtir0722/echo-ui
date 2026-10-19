/**
 * One animation frame for the homepage, in a fixed order: the smooth scroll
 * moves the page first, then whatever is drawn over the page reads where the
 * page went.
 *
 * Two requestAnimationFrame loops run in whichever order they happened to
 * register, and a canvas drawn before the scroll moved is a frame behind the
 * page: Echo would slide off its perch while you scroll.
 */
type Tick = (now: number) => void;

const scrollTicks = new Set<Tick>();
const drawTicks = new Set<Tick>();
let raf = 0;

function loop(now: number) {
  raf = requestAnimationFrame(loop);
  for (const tick of scrollTicks) tick(now);
  for (const tick of drawTicks) tick(now);
}

/** Run `tick` every frame, in its phase, until the returned function is called. */
export function onFrame(tick: Tick, phase: "scroll" | "draw" = "draw"): () => void {
  const set = phase === "scroll" ? scrollTicks : drawTicks;
  set.add(tick);
  if (!raf) raf = requestAnimationFrame(loop);
  return () => {
    set.delete(tick);
    if (scrollTicks.size === 0 && drawTicks.size === 0 && raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
  };
}
