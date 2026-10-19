"use client";

/**
 * WidgetGrid. Widgets at fixed footprints on a grid: a dashboard people
 * arrange for themselves, a home screen, a panel of gauges. Each widget is
 * your own content (a Card, a StatTile, a Tuner); the grid gives it a place.
 *
 * Edit it and each widget gets a Move key and, when you allow it, a Remove
 * key. Drag a widget by its Move key and the others slide out of its way; or
 * focus the key and use the arrow keys, and the new place is said. Done puts
 * the keys away.
 */
import { useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import gsap from "gsap";
import { timing, useReducedMotionRef } from "echo-ui-core/tactile";
import { useSoundOptional } from "echo-ui-core/sound";
import { HardwareButton } from "../hardware-button";
import { moveBy, moveTo, reconcile } from "./order";
import "./widget-grid.css";

export type WidgetSize = "1x1" | "2x1" | "2x2" | "4x2";

export interface WidgetGridItem {
  id: string;
  /** Its name: how the Move and Remove keys and the announcements say which widget. */
  label: string;
  /** Columns × rows it takes. Default "1x1". */
  size?: WidgetSize;
  content: ReactNode;
}

export interface WidgetGridProps {
  /** What the grid is: its accessible name ("Home"). */
  label: string;
  items: readonly WidgetGridItem[];
  /** The order, by id (controlled). */
  order?: readonly string[];
  defaultOrder?: readonly string[];
  onOrderChange?: (order: string[]) => void;
  /** Showing the Move and Remove keys (controlled). */
  editing?: boolean;
  defaultEditing?: boolean;
  onEditingChange?: (editing: boolean) => void;
  /** Lets a widget be removed; called with its id. */
  onRemove?: (id: string) => void;
  /** Columns on a wide screen. Default 4; the grid narrows to 2 on a phone. */
  columns?: 2 | 3 | 4;
}

const glyph = (d: string) => (
  <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
);
/**
 * Where a widget sits in the grid, without the slide it may be part-way
 * through. getBoundingClientRect includes the transform a slide is animating,
 * so a widget that has just moved still reads as being where it came from.
 */
function layoutBox(el: HTMLElement) {
  const r = el.getBoundingClientRect();
  const x = Number(gsap.getProperty(el, "x")) || 0;
  const y = Number(gsap.getProperty(el, "y")) || 0;
  return { left: r.left - x, top: r.top - y, right: r.right - x, bottom: r.bottom - y };
}

const MOVE = glyph("M8 2v12M2 8h12M8 2 6 4M8 2l2 2M8 14l-2-2M8 14l2-2M2 8l2-2M2 8l2 2M14 8l-2-2M14 8l-2 2");
const REMOVE = glyph("M4 4l8 8M12 4l-8 8");

export function WidgetGrid({
  label,
  items,
  order: orderProp,
  defaultOrder,
  onOrderChange,
  editing: editingProp,
  defaultEditing = false,
  onEditingChange,
  onRemove,
  columns = 4,
}: WidgetGridProps) {
  const ids = items.map((i) => i.id);
  const [innerOrder, setInnerOrder] = useState<readonly string[]>(defaultOrder ?? ids);
  const order = reconcile(orderProp ?? innerOrder, ids);
  const [innerEditing, setInnerEditing] = useState(defaultEditing);
  const editing = editingProp ?? innerEditing;
  const [said, setSaid] = useState("");
  const sound = useSoundOptional();
  const reduced = useReducedMotionRef();
  const slots = useRef(new Map<string, HTMLElement>());
  const before = useRef(new Map<string, DOMRect>());
  /**
   * The widget being carried. `over` is the one it last swapped with: it isn't
   * swapped with again until the hand has left it, so two widgets of different
   * sizes can't trade places back and forth under a hand that holds still.
   */
  const drag = useRef<{ id: string; dx: number; dy: number; x: number; y: number; over: string | null } | null>(null);
  const uid = useId();

  const byId = new Map(items.map((i) => [i.id, i]));
  const nameOf = (id: string) => byId.get(id)?.label ?? id;

  const setOrder = (next: string[]) => {
    // Where everything is now, so the ones that move can slide from there.
    before.current = new Map([...slots.current].map(([id, el]) => [id, el.getBoundingClientRect()]));
    if (orderProp === undefined) setInnerOrder(next);
    onOrderChange?.(next);
  };
  const setEditing = (next: boolean) => {
    if (editingProp === undefined) setInnerEditing(next);
    onEditingChange?.(next);
    sound?.play("tap");
  };

  /*
   * The widgets that moved slide from where they were (FLIP); a dragged one
   * stays under the hand. "Where they were" is where they showed, slide and
   * all; where they go is their new place in the grid, without the slide, so
   * one moved again mid-slide carries on from where it is.
   */
  useLayoutEffect(() => {
    const was = before.current;
    before.current = new Map();
    if (!was.size) return;
    for (const [id, el] of slots.current) {
      const from = was.get(id);
      if (!from) continue;
      const to = layoutBox(el);
      if (drag.current?.id === id) {
        const d = drag.current;
        gsap.set(el, { x: d.x - d.dx - to.left, y: d.y - d.dy - to.top });
        continue;
      }
      const x = from.left - to.left;
      const y = from.top - to.top;
      if ((!x && !y) || reduced.current) continue;
      gsap.fromTo(el, { x, y }, { x: 0, y: 0, ...timing("travel"), overwrite: "auto" });
    }
  });

  const announce = (id: string, next: string[]) => setSaid(`${nameOf(id)} moved to place ${next.indexOf(id) + 1} of ${next.length}`);

  const onMoveKey = (id: string) => (e: KeyboardEvent) => {
    const by =
      e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "Home" ? -order.length : e.key === "End" ? order.length : 0;
    if (!by) return;
    e.preventDefault();
    const next = moveBy(order, id, by);
    if (next.join() === order.join()) return;
    setOrder(next);
    announce(id, next);
    sound?.play("select");
  };

  /*
   * Dragging by the Move key: the widget follows the hand, and the grid
   * reorders under it. The move and the release are heard on the window, so
   * the hand can go anywhere while it carries the widget.
   */
  const orderRef = useRef(order);
  orderRef.current = order;
  const onPointerDown = (id: string) => (e: PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return;
    const el = slots.current.get(id);
    if (!el) return;
    const r = el.getBoundingClientRect();
    drag.current = { id, dx: e.clientX - r.left, dy: e.clientY - r.top, x: e.clientX, y: e.clientY, over: null };
    el.setAttribute("data-lifted", "");
    const move = (ev: globalThis.PointerEvent) => {
      const d = drag.current;
      if (!d) return;
      const box = slots.current.get(d.id);
      if (!box) return;
      d.x = ev.clientX;
      d.y = ev.clientY;
      const b = layoutBox(box);
      gsap.set(box, { x: d.x - d.dx - b.left, y: d.y - d.dy - b.top });
      // Over another widget's place in the grid: take it.
      const inside = (o: ReturnType<typeof layoutBox>) => d.x > o.left && d.x < o.right && d.y > o.top && d.y < o.bottom;
      const was = d.over ? slots.current.get(d.over) : undefined;
      if (was && inside(layoutBox(was))) return;
      d.over = null;
      for (const [other, slot] of slots.current) {
        if (other === d.id || !inside(layoutBox(slot))) continue;
        const now = orderRef.current;
        const next = moveTo(now, d.id, now.indexOf(other));
        if (next.join() !== now.join()) {
          d.over = other;
          setOrder(next);
          sound?.play("tap");
        }
        break;
      }
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      const d = drag.current;
      drag.current = null;
      if (!d) return;
      const box = slots.current.get(d.id);
      if (!box) return;
      box.removeAttribute("data-lifted");
      if (reduced.current) gsap.set(box, { x: 0, y: 0 });
      else gsap.to(box, { x: 0, y: 0, ...timing("travel"), overwrite: "auto" });
      announce(d.id, orderRef.current);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  };

  return (
    <section className="echo-widget-grid" aria-label={label} data-editing={editing || undefined} data-columns={columns}>
      <div className="echo-widget-grid__bar">
        <HardwareButton size="sm" variant={editing ? "primary" : "neutral"} onClick={() => setEditing(!editing)} aria-label={editing ? `Done arranging ${label}` : `Arrange ${label}`}>
          {editing ? "Done" : "Arrange"}
        </HardwareButton>
      </div>
      <ul className="echo-widget-grid__grid">
        {order.map((id) => {
          const item = byId.get(id);
          if (!item) return null;
          return (
            <li
              key={id}
              ref={(el) => {
                if (el) slots.current.set(id, el);
                else slots.current.delete(id);
              }}
              className="echo-widget-grid__slot"
              data-size={item.size ?? "1x1"}
            >
              <div className="echo-widget-grid__content">{item.content}</div>
              {editing ? (
                <div className="echo-widget-grid__keys">
                  <HardwareButton
                    size="sm"
                    iconOnly
                    icon={MOVE}
                    aria-label={`Move ${item.label}`}
                    aria-describedby={`${uid}-help`}
                    onKeyDown={onMoveKey(id)}
                    onPointerDown={onPointerDown(id)}
                  />
                  {onRemove ? (
                    <HardwareButton size="sm" iconOnly icon={REMOVE} aria-label={`Remove ${item.label}`} onClick={() => onRemove(id)} />
                  ) : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
      <span id={`${uid}-help`} className="echo-widget-grid__sr">
        Arrow keys move it; Home and End to the first or last place.
      </span>
      <span className="echo-widget-grid__sr" role="status">
        {said}
      </span>
    </section>
  );
}
