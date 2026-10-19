"use client";

/**
 * Something you can pick up and turn over: the device in the hero, spinning.
 *
 * It's the real device (brand/Device.tsx), buttons and all, standing in CSS 3D.
 * Behind its face is a stack of thin chassis-coloured layers, so turned
 * sideways it has a body and not a paper edge, and a back plate with its
 * screws. Drag it to spin it: it keeps the speed you gave it, slows, and a few
 * seconds after you let go it turns back to face you, the short way round. At
 * rest it leans a little toward the pointer, as a thing on a desk does.
 *
 * Its shadow is on the ground under it and answers to it: it narrows as the
 * device turns edge-on (the face gives way to the thin side), slides as the
 * device tips toward or away from you, and, when the device floats, draws in
 * as it rises. Only the device lifts; the shadow stays on the ground.
 *
 * Only a drag that starts off the buttons spins it, so pressing a key is a
 * press. Up-and-down drags still scroll the page on a touch screen. Under
 * reduced motion it can still be turned by hand, but it doesn't drift, lean
 * or coast.
 */
import { useEffect, useRef, type ReactNode } from "react";

/** How thick the device is, in px, and how many layers make that thickness. */
const DEPTH = 34;
const LAYERS = 17;

/** A pose, in degrees: turn about the vertical axis, tip toward you, and lean in the page. */
export interface SpinPose {
  yaw: number;
  pitch: number;
  roll?: number;
}

export function DeviceSpinner({
  children,
  rest = { yaw: 0, pitch: 0, roll: 0 },
  float = false,
}: {
  children: ReactNode;
  rest?: SpinPose;
  /** Float a little at rest, up and down, with the shadow drawing in as it rises. */
  float?: boolean;
}) {
  const host = useRef<HTMLDivElement>(null);
  const obj = useRef<HTMLDivElement>(null);
  const ground = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current;
    const body = obj.current;
    const shadow = ground.current;
    if (!el || !body) return;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const restYaw = rest.yaw;
    const restPitch = rest.pitch;
    const roll = rest.roll ?? 0;
    let yaw = restYaw;
    let pitch = restPitch;
    let yawV = 0;
    let pitchV = 0;
    let leanX = 0;
    let leanY = 0;
    let drag: { id: number; x: number; y: number; t: number } | null = null;
    let releasedAt = -Infinity;
    let pointer: { x: number; y: number } | null = null;
    let last = performance.now();
    let raf = 0;
    let still = 0;
    let lean = 0;

    const apply = () => {
      body.style.transform = `rotateZ(${roll}deg) rotateX(${pitch + leanX}deg) rotateY(${yaw + leanY}deg)`;
      if (shadow) {
        // What the ground sees: the face's width, giving way to the thin side as it turns.
        const y = ((yaw + leanY) * Math.PI) / 180;
        const x = ((pitch + leanX) * Math.PI) / 180;
        const w = body.offsetWidth || 372;
        const across =
          (w * Math.abs(Math.cos(y)) + DEPTH * Math.abs(Math.sin(y))) / w;
        shadow.style.transform = `translateX(-50%) translateY(${(-Math.sin(x) * 14).toFixed(2)}px) scaleX(${across.toFixed(3)})`;
        shadow.style.opacity = String(
          1 - Math.min(0.35, Math.abs(Math.sin(x)) * 0.5),
        );
      }
    };

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!drag && !reduced) {
        yaw += yawV * dt;
        pitch = Math.max(-55, Math.min(55, pitch + pitchV * dt));
        const slow = Math.exp(-dt * 2.2);
        yawV *= slow;
        pitchV *= slow;
        if (now - releasedAt > 2600) {
          // Back to its resting pose, the short way round.
          const home = restYaw + Math.round((yaw - restYaw) / 360) * 360;
          const k = 1 - Math.exp(-dt * 2.6);
          yaw += (home - yaw) * k;
          pitch += (restPitch - pitch) * k;
        }
        // Lean toward the pointer while it's near.
        let tx = 0;
        let ty = 0;
        if (pointer) {
          const r = el.getBoundingClientRect();
          const nx = (pointer.x - (r.left + r.width / 2)) / r.width;
          const ny = (pointer.y - (r.top + r.height / 2)) / r.height;
          if (Math.abs(nx) < 1.5 && Math.abs(ny) < 1.5) {
            ty = Math.max(-1, Math.min(1, nx)) * 9;
            tx = Math.max(-1, Math.min(1, -ny)) * 6;
          }
        }
        const k = 1 - Math.exp(-dt * 6);
        leanX += (tx - leanX) * k;
        leanY += (ty - leanY) * k;
        lean = Math.abs(tx - leanX) + Math.abs(ty - leanY);
      }
      apply();
      // Sleep when nothing's moving; a pointer or a drag wakes it.
      const moving =
        drag ||
        lean > 0.05 ||
        Math.abs(yawV) > 0.5 ||
        Math.abs(pitchV) > 0.5 ||
        Math.abs(yaw - restYaw - Math.round((yaw - restYaw) / 360) * 360) >
          0.2 ||
        Math.abs(pitch - restPitch) > 0.2;
      still = moving ? 0 : still + dt;
      raf = still > 0.3 ? 0 : requestAnimationFrame(tick);
    };
    const wake = () => {
      if (!raf) {
        last = performance.now();
        still = 0;
        raf = requestAnimationFrame(tick);
      }
    };

    const onDown = (e: PointerEvent) => {
      if (
        e.button !== 0 ||
        (e.target instanceof Element &&
          e.target.closest("button, a, [role=button]"))
      )
        return;
      drag = {
        id: e.pointerId,
        x: e.clientX,
        y: e.clientY,
        t: performance.now(),
      };
      el.setPointerCapture(e.pointerId);
      el.dataset.grabbing = "";
      yawV = pitchV = 0;
      wake();
    };
    const onMove = (e: PointerEvent) => {
      pointer = { x: e.clientX, y: e.clientY };
      if (!drag || e.pointerId !== drag.id) {
        if (!reduced) wake();
        return;
      }
      const now = performance.now();
      const dt = Math.max(1, now - drag.t) / 1000;
      const dy = (e.clientX - drag.x) * 0.5;
      const dx = -(e.clientY - drag.y) * 0.35;
      yaw += dy;
      pitch = Math.max(-55, Math.min(55, pitch + dx));
      yawV = dy / dt;
      pitchV = dx / dt;
      drag = { ...drag, x: e.clientX, y: e.clientY, t: now };
      apply();
    };
    const onUp = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.id) return;
      drag = null;
      delete el.dataset.grabbing;
      releasedAt = performance.now();
      if (reduced) yawV = pitchV = 0;
      wake();
    };
    const onLeave = () => {
      pointer = null;
    };

    el.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove, { passive: true });
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
    document.documentElement.addEventListener("pointerleave", onLeave);
    apply();
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
    // The pose is read once: the hero's is fixed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={host} className="spin">
      <div className="spin__lift" data-float={float ? "" : undefined}>
        <div
          ref={obj}
          className="spin__obj"
          style={{
            ["--spin-depth" as string]: `${DEPTH}px`,
            // The resting pose from the first paint, before the effect takes over.
            transform: `rotateZ(${rest.roll ?? 0}deg) rotateX(${rest.pitch}deg) rotateY(${rest.yaw}deg)`,
          }}
        >
          {/* The body: layer after layer of chassis, back to front. Decorative. */}
          {Array.from({ length: LAYERS }, (_, i) => (
            <span
              key={i}
              className="spin__layer"
              aria-hidden="true"
              style={{
                transform: `translateZ(${-DEPTH + (i * DEPTH) / (LAYERS - 1)}px)`,
                ["--spin-shade" as string]: String(i / (LAYERS - 1)),
              }}
            />
          ))}
          <span className="spin__back" aria-hidden="true">
            <span className="spin__screw" />
            <span className="spin__plate">echo</span>
            <span className="spin__screw" />
          </span>
          <div className="spin__face">{children}</div>
        </div>
      </div>
      <div ref={ground} className="spin__ground" aria-hidden="true">
        <span className="spin__shadow" data-float={float ? "" : undefined} />
      </div>
    </div>
  );
}
