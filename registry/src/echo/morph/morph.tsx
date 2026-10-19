"use client";

/**
 * Morph. Wrap your own HardwareButtons in it and render whatever state you
 * like: when the buttons inside change, the old ones become the new ones as
 * one liquid body. One becoming several divides (it pinches at the waist and
 * the parts come free), several becoming one folds, and the same number move
 * and resize in place — so a label that changes width flows to its new size.
 *
 * At rest there is nothing here but your buttons. After every render Morph
 * notes where each cap is, how lit it is and a copy of its label. When the
 * buttons change, it draws the body (echo-ui-core's MorphSurface, in the
 * cap's own material) from the old caps to the new ones, the labels riding
 * on it, while the real new buttons wait underneath, invisible but already
 * focusable. When the body lands on them they come back and the body fades
 * off them, so the hand-off is a cross-fade rather than a cut.
 *
 * If focus was on a button that went away, it moves to the first new button
 * that can take it. Escape calls `onEscape`. Reduced motion, forced colors
 * and a row that wraps onto more than one line swap the buttons in place.
 */
import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  apart,
  MORPH_MARGIN,
  morphFeels,
  MorphSurface,
  type MorphEngine,
  type MorphFeel,
  type MorphFeelName,
  type MorphLabel,
  type MorphTone,
} from "echo-ui-core/tactile";
import { LABEL_IN, LABEL_LAG, LABEL_OUT } from "./crossfade";
import "./morph.css";

export interface MorphProps {
  /** Your HardwareButtons, in whatever state you render. */
  children: ReactNode;
  /** How it moves: `cell` (default), `mercury`, or `cut` (no liquid). */
  feel?: MorphFeelName;
  /** Which edge stays put while the buttons change. */
  align?: "center" | "start" | "end";
  /** Called on Escape inside it, e.g. to fold back. */
  onEscape?: () => void;
  /** Said politely when it changes: what the new state means. */
  status?: string;
  /** Names the buttons as a group. */
  label?: string;
  className?: string;
}

/** A cap as it was drawn, relative to the Morph. */
interface Cap {
  x0: number;
  x1: number;
  cy: number;
  h: number;
  radius: number;
  well: number;
  /** 1 for a primary cap, 0 for neutral. */
  lit: number;
  /** How full a filled cap is (HardwareButton `fill`); undefined for a plain cap. */
  fill?: number;
  /** `data-morph` on the button: the same name before and after is the same button. */
  id?: string;
  /** A copy of its label, styled as it was, for the drawn body to carry. */
  label: HTMLElement;
}

interface Snapshot {
  caps: Cap[];
  /** The Morph's width. */
  w: number;
  /** Where the Morph was on the page, so a new layout can be matched up. */
  x: number;
  y: number;
}

type Kind = "divide" | "fold" | "move";

/** One piece of the body: from an old cap (if any) to a new one (if any). */
interface Track {
  a?: Cap;
  b?: Cap;
}

interface Transition {
  id: number;
  kind: Kind;
  from: Cap[];
  to: Cap[];
  /** One per drawn part, in order. */
  tracks: Track[];
  width: number;
}

/**
 * Pair the old caps with the new. Caps named alike (`data-morph`) are the
 * same cap; unnamed ones pair in order. A named cap with no partner is leaving
 * (or arriving): it is swallowed by (or buds from) a neighbour.
 */
function pairUp(from: Cap[], to: Cap[]): Track[] {
  const tracks: Track[] = [];
  const usedA = new Set<Cap>();
  const byId = new Map<Cap, Cap>();
  for (const b of to) {
    const a = b.id ? from.find((c) => !usedA.has(c) && c.id === b.id) : undefined;
    if (a) {
      usedA.add(a);
      byId.set(b, a);
    }
  }
  const looseA = from.filter((c) => !usedA.has(c) && !c.id);
  const looseB = to.filter((c) => !byId.has(c) && !c.id);
  for (const b of to) {
    const a = byId.get(b) ?? (b.id ? undefined : looseA[looseB.indexOf(b)]);
    if (a) usedA.add(a);
    tracks.push({ a, b });
  }
  for (const a of from) if (!usedA.has(a)) tracks.push({ a });
  return tracks;
}

const centre = (c: Cap) => (c.x0 + c.x1) / 2;
/** The point inside `c` nearest `x`, kept off its rounded ends. */
const inside = (c: Cap, x: number) => Math.min(Math.max(x, c.x0 + c.radius), c.x1 - c.radius);
/** Which labels ride on which part: the leaving ones, then the arriving ones (-1 is the whole). */
function labelsOf(t: Transition): { olds: [number, Cap][]; news: [number, Cap][] } {
  if (t.kind === "divide") return { olds: [[-1, t.from[0]!]], news: t.to.map((c, i) => [i, c]) };
  if (t.kind === "fold") return { olds: t.from.map((c, i) => [i, c]), news: [[-1, t.to[0]!]] };
  const olds: [number, Cap][] = [];
  const news: [number, Cap][] = [];
  t.tracks.forEach((tr, i) => {
    if (tr.a) olds.push([i, tr.a]);
    if (tr.b) news.push([i, tr.b]);
  });
  return { olds, news };
}

const nearest = (caps: Cap[], x: number) =>
  caps.reduce<Cap | undefined>((best, c) => (!best || Math.abs(centre(c) - x) < Math.abs(centre(best) - x) ? c : best), undefined);

/** The label copy: a DOM node, so it keeps exactly what the cap showed. */
function Clone({ node }: { node: HTMLElement }) {
  const ref = useCallback(
    (el: HTMLSpanElement | null) => {
      if (el && node.parentNode !== el) el.replaceChildren(node);
    },
    [node],
  );
  return <span ref={ref} style={{ display: "contents" }} />;
}

const LABEL_STYLE = [
  "color",
  "font-family",
  "font-size",
  "font-weight",
  "letter-spacing",
  "text-transform",
  "text-shadow",
] as const;

/** Read every top-level HardwareButton in the row. */
function read(root: HTMLElement, row: HTMLElement): Snapshot {
  const base = root.getBoundingClientRect();
  const hws = [...row.querySelectorAll<HTMLElement>(".echo-hw")].filter(
    (el) => !el.parentElement?.closest(".echo-hw"),
  );
  const caps = hws.flatMap((hw): Cap[] => {
    const well = hw.querySelector<HTMLElement>(".echo-hw__well");
    const cap = hw.querySelector<HTMLElement>(".echo-hw__cap");
    if (!well || !cap) return [];
    // The well and the cap's layout box: the cap itself leans and sinks
    // under the hand (transforms), which isn't where it rests.
    const w = well.getBoundingClientRect();
    const ws = getComputedStyle(well);
    const pad = parseFloat(ws.paddingLeft) || 0;
    const cs = getComputedStyle(cap);
    const content = cap.querySelector<HTMLElement>(".echo-hw__content");
    const label = document.createElement("span");
    label.style.cssText = "display:inline-flex;align-items:center;white-space:nowrap;";
    for (const p of LABEL_STYLE) label.style.setProperty(p, cs.getPropertyValue(p));
    label.style.gap = cs.columnGap;
    // The copy sits outside the button, where its size variables don't reach.
    const hs = getComputedStyle(hw);
    for (const v of ["--hw-icon", "--hw-gap"]) label.style.setProperty(v, hs.getPropertyValue(v));
    if (content) {
      const copy = content.cloneNode(true) as HTMLElement;
      copy.removeAttribute("data-hidden");
      copy.style.opacity = "";
      label.append(copy);
    }
    const x0 = w.left - base.left + pad;
    return [
      {
        x0,
        x1: x0 + cap.offsetWidth,
        cy: w.top - base.top + w.height / 2,
        h: cap.offsetHeight,
        radius: parseFloat(cs.borderTopLeftRadius) || 0,
        well: parseFloat(ws.paddingTop) || 0,
        lit: cap.dataset.variant === "primary" ? 1 : 0,
        fill: cap.hasAttribute("data-fill") ? Number(cap.style.getPropertyValue("--hw-fill")) || 0 : undefined,
        id: cap.dataset.morph || undefined,
        label,
      },
    ];
  });
  return { caps, w: base.width, x: base.left + window.scrollX, y: base.top + window.scrollY };
}

/**
 * Nothing to draw: the same caps in the same places, lit the same way. A
 * label that changes without changing its cap's size (a clock ticking, a
 * count going up) just changes; so does a level (`fill`) running down.
 */
const same = (a: Cap[], b: Cap[]) =>
  a.length === b.length &&
  a.every(
    (c, i) =>
      Math.abs(c.x0 - b[i]!.x0) < 0.5 &&
      Math.abs(c.x1 - b[i]!.x1) < 0.5 &&
      Math.abs(c.cy - b[i]!.cy) < 0.5 &&
      c.lit === b[i]!.lit &&
      c.id === b[i]!.id &&
      (c.fill === undefined) === (b[i]!.fill === undefined),
  );

const reducedMotion = () =>
  typeof matchMedia === "function" &&
  (matchMedia("(prefers-reduced-motion: reduce)").matches || matchMedia("(forced-colors: active)").matches);

/** Labels cross: the old ones go as the new ones come, never a blank body. */

/** Colour changes quickly once there's a waist to hold it: no muddy mix. */
const COLOUR = { duration: 0.16, bounce: 0 };

export function Morph({ children, feel = "cell", align = "center", onEscape, status, label, className }: MorphProps) {
  const f: MorphFeel = morphFeels[feel];
  const root = useRef<HTMLDivElement>(null);
  const row = useRef<HTMLDivElement>(null);
  const last = useRef<Snapshot | null>(null);
  const engine = useRef<MorphEngine | null>(null);
  const running = useRef<Transition | null>(null);
  const focused = useRef<HTMLElement | null>(null);
  /** Focus left with a button that couldn't hand it on yet. */
  const waiting = useRef(false);
  const ids = useRef(0);
  const [moving, setMoving] = useState<Transition | null>(null);
  const [landing, setLanding] = useState(false);

  /** Where the body is now, as caps: the start of a change that interrupts it. */
  const current = (): Cap[] | null => {
    const m = engine.current;
    const run = running.current;
    if (!run) return null;
    // Not drawn yet: it hasn't left where it started.
    if (!m) return run.from;
    const box = (c: Cap, x0: number, x1: number): Cap => ({ ...c, x0, x1 });
    if (m.wh > 0 && m.t.value < 0.5) {
      const whole = run.kind === "divide" ? run.from[0]! : run.to[0]!;
      return [box(whole, m.wx0.value, m.wx1.value)];
    }
    // The pieces still on screen, each as the cap it is becoming (or leaving).
    return run.tracks.flatMap((tr, i) => {
      const c = tr.b ?? tr.a!;
      const p = m.parts[i]!;
      return p.x1.value - p.x0.value >= 2 && p.h.value >= 2 ? [box(c, p.x0.value, p.x1.value)] : [];
    });
  };

  /** Note the caps as they are, when nothing is moving. */
  const note = () => {
    const el = root.current;
    const r = row.current;
    if (el && r && !running.current) last.current = read(el, r);
  };

  /**
   * The moment before a change: note the caps, and where focus is. Focus is
   * read here too, not only on focus events: a button focused before the
   * page hydrated never told React.
   */
  const beforeChange = () => {
    const active = document.activeElement;
    if (active instanceof HTMLElement && root.current?.contains(active)) focused.current = active;
    note();
  };

  // After every render: note the caps, and if they changed, morph. No
  // dependency list on purpose: any render may have changed the buttons, and
  // it only sets state when they did.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    const el = root.current;
    const r = row.current;
    if (!el || !r) return;
    const prev = last.current;
    let next = read(el, r);

    // Focus was on a button that went away, or that React kept and the new
    // state disabled ("Mark as done" becoming the lit, disabled "Done"): the
    // first new button that can take it does.
    // If nothing can take it yet (a button that is busy for a moment), it
    // waits, and goes back as soon as something can.
    const had = focused.current;
    const lost = had && (!had.isConnected || (had as HTMLButtonElement).disabled);
    const idle = document.activeElement === document.body || document.activeElement === null;
    if ((lost || waiting.current) && idle) {
      const target =
        had?.isConnected && !(had as HTMLButtonElement).disabled
          ? had
          : [...r.querySelectorAll<HTMLButtonElement>(".echo-hw__cap")].find((c) => !c.disabled);
      if (target) {
        focused.current = target;
        waiting.current = false;
        target.focus();
      } else waiting.current = true;
    } else if (!idle) waiting.current = false;

    const flying = running.current;
    // Already on its way to exactly these caps: a render along the way.
    if (flying && same(flying.to, next.caps)) return;
    if (!prev || (!flying && same(prev.caps, next.caps))) {
      last.current = next;
      return;
    }
    const at = current();
    if (next.caps.length === 0 || (at ?? prev.caps).length === 0 || reducedMotion()) {
      finish();
      last.current = read(el, r);
      return;
    }
    // Wrapped onto more than one line: there's no row for a body to run along.
    const tops = next.caps.map((c) => c.cy);
    if (Math.max(...tops) - Math.min(...tops) > 2) {
      finish();
      last.current = read(el, r);
      return;
    }

    // Hold the wider footprint while the shape changes, so nothing around it
    // jumps; then read the new caps where they sit inside it, and put the old
    // ones (or the body, if it was mid-way) in the same coordinates.
    el.style.minWidth = `${Math.max(prev.w, next.w)}px`;
    next = read(el, r);
    const dx = prev.x - next.x;
    const dy = prev.y - next.y;
    const from = (at ?? prev.caps).map((c) => ({ ...c, x0: c.x0 + dx, x1: c.x1 + dx, cy: c.cy + dy }));
    const to = next.caps;
    last.current = next;
    const kind: Kind =
      from.length === 1 && to.length > 1 ? "divide" : from.length > 1 && to.length === 1 ? "fold" : "move";
    const tracks: Track[] =
      kind === "divide" ? to.map((b) => ({ b })) : kind === "fold" ? from.map((a) => ({ a })) : pairUp(from, to);
    const t: Transition = { id: ++ids.current, kind, from, to, tracks, width: next.w };
    running.current = t;
    engine.current = null;
    setLanding(false);
    setMoving(t);
  });

  /** Stop wherever it is and show the real buttons. */
  const finish = () => {
    running.current = null;
    engine.current = null;
    if (root.current) root.current.style.minWidth = "";
    note();
    setMoving(null);
    setLanding(false);
  };

  // The layout can change under it (a resize, fonts loading): keep the note
  // current, so the next change starts from where the caps really are.
  useLayoutEffect(() => {
    const el = root.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => note());
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /** Drive the body: from the old caps to the new ones. */
  const run = (m: MorphEngine, t: Transition) => {
    engine.current = m;
    const { kind, from, to, tracks } = t;
    const n = m.parts.length;
    const outer = (i: number) => i === 0 || i === n - 1;
    const slices = (c: Cap, count: number) =>
      Array.from({ length: count }, (_, i): [number, number] => [
        c.x0 + ((c.x1 - c.x0) * i) / count,
        c.x0 + ((c.x1 - c.x0) * (i + 1)) / count,
      ]);
    /** How lit a cap is, as a level: a filled cap by its fill, a plain one all or nothing. */
    const level = (c: Cap) => c.fill ?? c.lit;
    const paint = (i: number, c: Cap) => {
      const p = m.parts[i]!;
      p.lit.set(c.lit);
      p.fill.set(level(c));
    };
    const repaint = (i: number, c: Cap) => {
      const p = m.parts[i]!;
      m.go(p.lit, c.lit, COLOUR);
      // A level pours rather than flicks.
      m.go(p.fill, level(c), c.fill !== undefined ? f.outer : COLOUR);
    };
    // Labels: the old ones first, then the new, in the order MorphSurface got them.
    const olds = labelsOf(t).olds.length;
    for (let i = 0; i < olds; i++) m.shows[i]!.set(1);
    const cross = () => {
      for (let i = 0; i < olds; i++) m.show(i, false, LABEL_OUT);
      m.later(LABEL_LAG, () => {
        for (let i = olds; i < m.shows.length; i++) m.show(i, true, LABEL_IN);
      });
    };

    if (kind === "divide") {
      const whole = from[0]!;
      m.wh = whole.h;
      m.wx0.set(whole.x0);
      m.wx1.set(whole.x1);
      slices(whole, n).forEach(([a, b], i) => {
        m.place(i, a, b, whole.h);
        paint(i, whole);
      });
      m.t.set(0);
      m.go(m.t, 1, f.t);
      to.forEach((c, i) => {
        const move = () => m.move(i, c.x0, c.x1, c.h, outer(i) ? f.outer : f.inner, f.swell);
        if (i === 0 || f.stagger === 0) move();
        else m.later(f.stagger * i, move);
        m.later(f.t.duration * 0.3, () => repaint(i, c));
      });
      m.later(Math.max(0, f.labelDelay - 0.02), cross);
    } else if (kind === "fold") {
      const whole = to[0]!;
      m.wh = whole.h;
      m.wx0.set(whole.x0);
      m.wx1.set(whole.x1);
      from.forEach((c, i) => {
        m.place(i, c.x0, c.x1, c.h);
        paint(i, c);
      });
      m.t.set(1);
      slices(whole, n).forEach(([a, b], i) => {
        m.move(i, a, b, whole.h, f.inner);
        m.later(f.mergeAt * 0.5, () => repaint(i, whole));
      });
      m.later(f.mergeAt, () => m.go(m.t, 0, f.t));
      cross();
    } else {
      // Each old cap flows to its new one. One with no new cap is swallowed by
      // the nearest cap that stays; one with no old cap buds from it.
      m.wh = 0;
      m.t.set(1);
      const staying = tracks.filter((tr) => tr.a && tr.b).map((tr) => tr.b!);
      tracks.forEach(({ a, b }, i) => {
        const cfg = outer(i) ? f.outer : f.inner;
        if (a) {
          m.place(i, a.x0, a.x1, a.h);
          paint(i, a);
        }
        if (a && b) {
          m.move(i, b.x0, b.x1, b.h, cfg);
          repaint(i, b);
        } else if (b) {
          const host = nearest(staying, centre(b)) ?? nearest(from, centre(b))!;
          paint(i, b);
          m.bud(i, inside(host, centre(b)), b.x0, b.x1, b.h, cfg, f.swell);
        } else if (a) {
          const host = nearest(staying.length ? staying : to, centre(a))!;
          m.absorb(i, inside(host, centre(a)), cfg);
        }
      });
      cross();
    }

    m.whenSettled(() => {
      if (running.current !== t || engine.current !== m) return;
      running.current = null;
      engine.current = null;
      // The real buttons come back under the body, and the body fades off
      // them. The footprint is held until it has: letting go sooner would
      // shift the body off the buttons it is fading into.
      setLanding(true);
    });
  };

  const onMorph = (m: MorphEngine) => {
    // Mounted for this change (and, in development, mounted twice): whichever
    // body is the one kept runs it.
    const t = running.current;
    if (t && moving && t.id === moving.id) run(m, t);
  };

  const t = moving;
  const { olds, news } = t ? labelsOf(t) : { olds: [], news: [] };
  const labels: MorphLabel[] = [
    ...olds.map(([part, c]) => ({ part, content: <Clone node={c.label} /> })),
    ...news.map(([part, c]) => ({ part, content: <Clone node={c.label.cloneNode(true) as HTMLElement} /> })),
  ];
  // A piece that is (or becomes) a filled cap is drawn as a level.
  const tones = t
    ? t.tracks.map((tr): MorphTone =>
        (tr.a?.fill ?? tr.b?.fill) !== undefined ||
        (t.kind === "divide" && t.from[0]!.fill !== undefined) ||
        (t.kind === "fold" && t.to[0]!.fill !== undefined)
          ? "meter"
          : "accent",
      )
    : [];
  const ref = t ? t.to[0] ?? t.from[0]! : null;
  const h = t ? Math.max(...[...t.from, ...t.to].map((c) => c.h)) : 0;
  // Buttons sit a gap apart that a neck can't reach, so they never rest joined.
  const gap = Math.max(8, apart(f) - 8);

  return (
    <div
      ref={root}
      className={["echo-morph", className].filter(Boolean).join(" ")}
      data-align={align}
      data-moving={t && !landing ? "" : undefined}
      onFocus={(e) => {
        focused.current = e.target as HTMLElement;
      }}
      onPointerDownCapture={beforeChange}
      onKeyDownCapture={beforeChange}
      onKeyDown={(e) => {
        if (e.key === "Escape" && onEscape) {
          e.stopPropagation();
          onEscape();
        }
      }}
    >
      <div ref={row} className="echo-morph__row" role={label ? "group" : undefined} aria-label={label} style={{ gap }}>
        {children}
      </div>
      {t && ref ? (
        <div
          className="echo-morph__body"
          data-landing={landing ? "" : undefined}
          style={{ left: 0, top: ref.cy - h / 2 - MORPH_MARGIN }}
          onAnimationEnd={() => {
            if (landing && !running.current) finish();
          }}
        >
          <MorphSurface
            key={t.id}
            tones={tones}
            labels={labels}
            feel={f}
            width={t.width}
            body={h}
            radius={ref.radius}
            well={ref.well}
            onMorph={onMorph}
          />
        </div>
      ) : null}
      <span className="echo-morph__status" aria-live="polite">
        {status}
      </span>
    </div>
  );
}
