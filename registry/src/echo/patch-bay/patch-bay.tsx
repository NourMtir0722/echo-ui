"use client";

/**
 * PatchBay. Connecting things to things, the way a studio patches its
 * gear: sockets down one side for what you have, sockets down the other for
 * where it goes, and a cable between each pair that's connected. Mapping the
 * columns of an import to fields, routing events to channels, inputs to
 * outputs.
 *
 * Each source row has a Select that says where it goes, and that's the real
 * control: keys, screen readers and forms all use it. The cables draw what
 * the Selects say. With a pointer you can also drag a cable from a source's
 * socket to a target's; a new cable drops into place and sways once. On a
 * narrow screen the cables and the target column go, and the Selects stay.
 */
import { forwardRef, useCallback, useEffect, useLayoutEffect, useRef, useState, type PointerEvent } from "react";
import type { EchoInterop } from "echo-ui-core/types";
import { createSpring, useReducedMotionRef, type Spring } from "echo-ui-core/tactile";
import { useSoundOptional } from "echo-ui-core/sound";
import { Select } from "../select";
import { StatusDot } from "../status-dot";
import { cablePath, restingSag, type Point } from "./cable";
import "./patch-bay.css";

export interface PatchBayEnd {
  value: string;
  label: string;
}

/** Where each source goes: its target's value, or null for nowhere. */
export type PatchBayValue = Readonly<Record<string, string | null>>;

export interface PatchBayProps extends EchoInterop {
  /** What's being connected: the group's accessible name ("Import columns"). */
  label: string;
  /** What you have: the left column. */
  sources: readonly PatchBayEnd[];
  /** Where it can go: the right column. */
  targets: readonly PatchBayEnd[];
  /** Headings over the two columns. */
  sourcesLabel?: string;
  targetsLabel?: string;
  /** Where each source goes (controlled). */
  value?: PatchBayValue;
  defaultValue?: PatchBayValue;
  onValueChange?: (value: Record<string, string | null>) => void;
}

const NOWHERE = "__nowhere__";
const SWAY = { duration: 0.9, bounce: 0.45 };

/**
 * `forwardRef`, not a `ref` prop — see the note on `Field`. The ref lands on
 * the group.
 */
export const PatchBay = forwardRef<HTMLDivElement, PatchBayProps>(function PatchBay(
  { label, sources, targets, sourcesLabel = "From", targetsLabel = "To", value, defaultValue, onValueChange, disabled, name, ...interop },
  ref,
) {
  const [inner, setInner] = useState<PatchBayValue>(defaultValue ?? {});
  const links = value ?? inner;
  const sound = useSoundOptional();
  const reduced = useReducedMotionRef();
  const root = useRef<HTMLDivElement | null>(null);
  const svg = useRef<SVGSVGElement>(null);
  const sags = useRef(new Map<string, Spring>());
  const [pulling, setPulling] = useState<{ from: string; to: Point } | null>(null);

  const connect = useCallback(
    (source: string, target: string | null) => {
      if (links[source] === target) return;
      const next = { ...links, [source]: target };
      if (value === undefined) setInner(next);
      onValueChange?.(next);
      sound?.play(target ? "select" : "tap");
    },
    [links, value, onValueChange, sound],
  );

  /** Where a socket is, in the bay's own coordinates. */
  const socket = useCallback((kind: "source" | "target", id: string): Point | null => {
    const r = root.current;
    const el = r?.querySelector<HTMLElement>(`[data-${kind}="${CSS.escape(id)}"]`);
    if (!r || !el || !el.offsetParent) return null;
    const a = r.getBoundingClientRect();
    const b = el.getBoundingClientRect();
    return { x: b.left + b.width / 2 - a.left, y: b.top + b.height / 2 - a.top };
  }, []);

  /** Draw every cable at its sockets, each hanging by its spring. */
  const draw = useCallback(() => {
    const s = svg.current;
    if (!s) return;
    for (const path of s.querySelectorAll<SVGPathElement>("path[data-link]")) {
      const [from, to] = [path.dataset.from!, path.dataset.to!];
      const a = socket("source", from);
      const b = socket("target", to);
      if (!a || !b) {
        path.removeAttribute("d");
        continue;
      }
      const sag = sags.current.get(from)?.value ?? restingSag(a, b);
      path.setAttribute("d", cablePath(a, b, sag));
    }
  }, [socket]);

  // A cable that's new drops in: taut, then sagging to rest with a sway.
  useLayoutEffect(() => {
    for (const [source, target] of Object.entries(links)) {
      const spring = sags.current.get(source);
      const a = target ? socket("source", source) : null;
      const b = target ? socket("target", target) : null;
      if (!target || !a || !b) {
        spring?.stop();
        sags.current.delete(source);
        continue;
      }
      const rest = restingSag(a, b);
      if (spring) {
        // Heading somewhere else, or stopped short of rest: send it there.
        const off = Math.abs(spring.target - rest) >= 0.5 || (!spring.moving && Math.abs(spring.value - rest) >= 0.5);
        if (off) spring.to(rest);
        continue;
      }
      const next = createSpring(reduced.current ? rest : 0, SWAY, () => draw());
      sags.current.set(source, next);
      if (!reduced.current) next.to(rest);
    }
    draw();
  });

  // Keep the cables on their sockets when the bay changes size.
  useEffect(() => {
    const r = root.current;
    if (!r) return;
    const resized = new ResizeObserver(() => draw());
    resized.observe(r);
    const springs = sags.current;
    return () => {
      resized.disconnect();
      // Forget them, so a remount hangs every cable afresh.
      for (const s of springs.values()) s.stop();
      springs.clear();
    };
  }, [draw]);

  /* Pulling a cable from a source's socket, with a pointer. */
  const onSocketDown = (source: string) => (e: PointerEvent<HTMLSpanElement>) => {
    if (disabled || e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const r = root.current!.getBoundingClientRect();
    setPulling({ from: source, to: { x: e.clientX - r.left, y: e.clientY - r.top } });
  };
  const onSocketMove = (e: PointerEvent<HTMLSpanElement>) => {
    if (!pulling) return;
    const r = root.current!.getBoundingClientRect();
    setPulling({ ...pulling, to: { x: e.clientX - r.left, y: e.clientY - r.top } });
  };
  const onSocketUp = (e: PointerEvent<HTMLSpanElement>) => {
    if (!pulling) return;
    const over = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>("[data-target]");
    if (over?.dataset.target) connect(pulling.from, over.dataset.target);
    setPulling(null);
  };

  const pullFrom = pulling ? socket("source", pulling.from) : null;
  const targetOptions = [{ value: NOWHERE, label: "Nowhere" }, ...targets.map((t) => ({ value: t.value, label: t.label }))];
  const used = new Set(Object.values(links).filter(Boolean));

  return (
    <div
      ref={(node) => {
        root.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) ref.current = node;
      }}
      className="echo-patch-bay"
      role="group"
      aria-label={label}
      data-disabled={disabled || undefined}
      {...interop}
    >
      <svg ref={svg} className="echo-patch-bay__cables" aria-hidden="true" focusable="false">
        {Object.entries(links).map(([source, target]) =>
          target ? <path key={source} data-link="" data-from={source} data-to={target} /> : null,
        )}
        {pulling && pullFrom ? <path className="echo-patch-bay__pulling" d={cablePath(pullFrom, pulling.to, 12)} /> : null}
      </svg>
      <div className="echo-patch-bay__grid">
      <div className="echo-patch-bay__side" data-side="sources">
        <span className="echo-patch-bay__heading" aria-hidden="true">
          {sourcesLabel}
        </span>
        {sources.map((s) => (
          <div key={s.value} className="echo-patch-bay__row">
            <span className="echo-patch-bay__name">{s.label}</span>
            <Select
              size="sm"
              aria-label={`${s.label} goes to`}
              options={targetOptions}
              value={links[s.value] ?? NOWHERE}
              onValueChange={(v) => connect(s.value, v === NOWHERE ? null : v)}
              disabled={disabled}
            />
            <span
              className="echo-patch-bay__socket"
              data-source={s.value}
              onPointerDown={onSocketDown(s.value)}
              onPointerMove={onSocketMove}
              onPointerUp={onSocketUp}
              onPointerCancel={() => setPulling(null)}
            >
              <StatusDot on={Boolean(links[s.value])} decorative />
            </span>
          </div>
        ))}
      </div>
      <div className="echo-patch-bay__side" data-side="targets" aria-hidden="true">
        <span className="echo-patch-bay__heading">{targetsLabel}</span>
        {targets.map((t) => (
          <div key={t.value} className="echo-patch-bay__row">
            <span className="echo-patch-bay__socket" data-target={t.value}>
              <StatusDot on={used.has(t.value)} decorative />
            </span>
            <span className="echo-patch-bay__name">{t.label}</span>
          </div>
        ))}
      </div>
      </div>
      {name
        ? Object.entries(links).map(([source, target]) =>
            target ? <input key={source} type="hidden" name={`${name}[${source}]`} value={target} /> : null,
          )
        : null}
    </div>
  );
});
