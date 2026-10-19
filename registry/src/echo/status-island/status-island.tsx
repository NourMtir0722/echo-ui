"use client";

/**
 * StatusIsland. Work that runs in the background (an upload, an export, a
 * timer, a recording, "writing…") kept in one small floating slab: at rest a
 * pill with a lit socket and a readout; pressed, it blooms open the way every
 * Echo panel arrives, wider first and then taller, into the detail and what
 * you can do about it. It closes the other way round.
 *
 * It announces what matters and nothing else: when the work starts, finishes
 * or fails, never every percent.
 */
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { createSpring, useReducedMotionRef, type Spring } from "echo-ui-core/tactile";
import { useSoundOptional } from "echo-ui-core/sound";
import { StatusDot } from "../status-dot";
import { LcdChip } from "../lcd-chip";
import { Progress } from "../progress";
import { SizeProvider } from "../size";
import "./status-island.css";

export type StatusIslandState = "running" | "paused" | "done" | "failed";

export interface StatusIslandProps {
  /** What's happening, in a word or two: the pill's label ("Exporting", "Recording"). */
  label: string;
  /** What it's happening to, heading the open island ("Q3 report.pdf"). */
  title?: string;
  /** The pill's readout ("42%", "04:59"). Default: `progress` as a percent. */
  reading?: string;
  /** How far along, 0–1: a row of lit cells in the open island. */
  progress?: number;
  /** A line under the progress: what's left, where it went, what went wrong. */
  detail?: ReactNode;
  /** `running` (default) lights the socket; `paused` darkens it; `done` and `failed` are said out loud. */
  state?: StatusIslandState;
  /** What you can do about it: small HardwareButtons in the open island. */
  actions?: ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** `inline` (default) sits where you put it; `top` and `bottom` float at the centre of that edge of the screen. */
  placement?: "inline" | "top" | "bottom";
}

const WIDE = { duration: 0.42, bounce: 0.22 };
const TALL = { duration: 0.46, bounce: 0.18 };
/** How long after it starts spreading wide it starts growing tall, and the reverse on the way back. */
const STAGGER = 120;

const WORDS: Record<StatusIslandState, string> = {
  running: "started",
  paused: "paused",
  done: "done",
  failed: "failed",
};

export function StatusIsland({
  label,
  title,
  reading,
  progress,
  detail,
  state = "running",
  actions,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  placement = "inline",
}: StatusIslandProps) {
  const [innerOpen, setInnerOpen] = useState(defaultOpen);
  const open = openProp ?? innerOpen;
  /** The open parts stay drawn until the island has closed round them. */
  const [closing, setClosing] = useState(false);
  const sound = useSoundOptional();
  const reduced = useReducedMotionRef();
  const id = useId();
  const slab = useRef<HTMLDivElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const width = useRef<Spring | null>(null);
  const height = useRef<Spring | null>(null);
  /** The slab's box the last time it was at rest: where a change of size starts from. */
  const rest = useRef<DOMRect | null>(null);
  const wasOpen = useRef(open);
  const timer = useRef(0);

  const setOpen = useCallback(
    (next: boolean) => {
      if (openProp === undefined) setInnerOpen(next);
      onOpenChange?.(next);
      sound?.play(next ? "transition" : "tap");
    },
    [openProp, onOpenChange, sound],
  );

  // The slab's size rides on two springs, written as variables the stylesheet reads.
  useEffect(() => {
    const el = slab.current;
    if (!el) return;
    rest.current = el.getBoundingClientRect();
    const write = (name: string) => (v: number) => el.style.setProperty(name, `${v.toFixed(1)}px`);
    width.current = createSpring(0, WIDE, write("--island-w"));
    height.current = createSpring(0, TALL, write("--island-h"));
    return () => {
      width.current?.stop();
      height.current?.stop();
      window.clearTimeout(timer.current);
    };
  }, []);

  // FLIP on size: measure where it's going, start from where it was, spring there.
  useLayoutEffect(() => {
    const el = slab.current;
    if (!el || wasOpen.current === open) return;
    wasOpen.current = open;
    const from = rest.current;
    const free = () => {
      el.removeAttribute("data-sizing");
      el.style.removeProperty("--island-w");
      el.style.removeProperty("--island-h");
      setClosing(false);
      rest.current = el.getBoundingClientRect();
    };
    if (!open) setClosing(true);
    if (reduced.current || !from || !width.current || !height.current) {
      free();
      return;
    }
    // The size it's heading for: closing, the pill alone.
    el.removeAttribute("data-sizing");
    el.toggleAttribute("data-measuring", !open);
    const to = el.getBoundingClientRect();
    el.removeAttribute("data-measuring");
    el.setAttribute("data-sizing", "");
    const w = width.current;
    const h = height.current;
    w.set(from.width);
    h.set(from.height);
    window.clearTimeout(timer.current);
    // Open: wide, then tall. Close: short, then narrow.
    const [first, firstTo, second, secondTo] = open ? [w, to.width, h, to.height] : [h, to.height, w, to.width];
    first.to(firstTo);
    timer.current = window.setTimeout(() => second.to(secondTo), STAGGER);
    const settle = window.setInterval(() => {
      if (w.moving || h.moving) return;
      window.clearInterval(settle);
      free();
    }, 60);
    return () => window.clearInterval(settle);
  }, [open, reduced]);

  // Whenever it's at rest, note its box: the next change of size starts there.
  useLayoutEffect(() => {
    const el = slab.current;
    if (el && !el.hasAttribute("data-sizing")) rest.current = el.getBoundingClientRect();
  });

  // Escape closes it, from anywhere inside.
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape" && open) {
      e.stopPropagation();
      setOpen(false);
      toggle.current?.focus();
    }
  };

  // Said once when the work starts, finishes or fails; never every percent.
  const [said, setSaid] = useState("");
  const last = useRef(state);
  useEffect(() => {
    if (last.current === state) return;
    last.current = state;
    setSaid(`${title ?? label}: ${WORDS[state]}`);
    if (state === "done") sound?.play("notify");
    if (state === "failed") sound?.play("error");
  }, [state, title, label, sound]);

  const shown = reading ?? (progress !== undefined ? `${Math.round(Math.min(1, Math.max(0, progress)) * 100)}%` : undefined);

  return (
    <div className="echo-status-island" data-placement={placement}>
      <div
        ref={slab}
        className="echo-status-island__slab"
        data-open={open ? "" : undefined}
        data-state={state}
        onKeyDown={onKeyDown}
      >
        <button
          ref={toggle}
          type="button"
          className="echo-status-island__pill"
          aria-expanded={open}
          aria-controls={`${id}-detail`}
          // Named in full: the chip inside names itself only by its label, and
          // a name taken from content would drop the reading ("Exporting 42%").
          aria-label={shown !== undefined ? `${label} ${shown}` : undefined}
          onClick={() => setOpen(!open)}
        >
          <StatusDot on={state === "running" || state === "done"} decorative />
          <span className="echo-status-island__label">{label}</span>
          {/* A space the flex row doesn't draw, so the pill's text reads "Exporting 42%", the words of its name. */}
          {shown !== undefined ? <> <LcdChip value={shown} label={label} glow={state !== "paused"} /></> : null}
        </button>
        <div id={`${id}-detail`} className="echo-status-island__detail" hidden={!open && !closing}>
          {title ? <p className="echo-status-island__title">{title}</p> : null}
          {progress !== undefined ? (
            <Progress value={Math.min(1, Math.max(0, progress))} aria-label={title ?? label} cells={16} />
          ) : null}
          {detail ? <p className="echo-status-island__text">{detail}</p> : null}
          {actions ? (
            <SizeProvider size="sm">
              <div className="echo-status-island__actions">{actions}</div>
            </SizeProvider>
          ) : null}
        </div>
      </div>
      <span className="echo-status-island__said" role="status">
        {said}
      </span>
    </div>
  );
}
