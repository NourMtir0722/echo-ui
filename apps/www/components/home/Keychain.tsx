"use client";

/**
 * Echo's home, on a keychain. Once the hero has scrolled away, the device
 * that was Echo's home hangs small in the bottom-right corner, swinging a
 * little on its ring, so home is never far.
 *
 * Press it and Echo flies home into its screen (the 3D stage flies it there,
 * then the screen draws it: stage.ts). Press again and Echo goes back out to
 * the section you're reading. Leave the page alone for 30 seconds and Echo
 * goes home by itself to nap; scroll, and it pops back out. At the foot of
 * the page the keychain goes, and Echo joins its crowd.
 *
 * It's a real button that says what it will do ("Call Echo home", "Send Echo
 * out"). It only hangs there while the 3D Echo is on the page: without WebGL
 * there's nothing to fly. Under reduced motion it doesn't swing.
 */
import { useEffect, useRef, useState } from "react";
import { useCapPhysics } from "echo-ui-core/tactile";
import { Creature } from "@registry/echo/creature";

const NAP_AFTER = 30_000;

export function Keychain() {
  const root = useRef<HTMLDivElement>(null);
  const cap = useCapPhysics<HTMLSpanElement>({ lift: 1, travel: 2, tilt: 6, sound: true });
  /** "you": called home by a press. "nap": went home by itself, idle. */
  const [called, setCalled] = useState<null | "you" | "nap">(null);
  const [docked, setDocked] = useState(false);
  const [atFoot, setAtFoot] = useState(false);

  // The stage marks the keychain when Echo has arrived in its screen.
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const mo = new MutationObserver(() => setDocked(el.hasAttribute("data-docked")));
    mo.observe(el, { attributes: true, attributeFilter: ["data-docked"] });
    return () => mo.disconnect();
  }, []);

  // Idle for 30 seconds: Echo goes home to nap. Scrolling wakes it and it pops out.
  useEffect(() => {
    let timer = 0;
    const arm = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setCalled((c) => c ?? "nap"), NAP_AFTER);
    };
    const onScroll = () => {
      setCalled((c) => (c === "nap" ? null : c));
      arm();
    };
    arm();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pointermove", arm, { passive: true });
    window.addEventListener("keydown", arm);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointermove", arm);
      window.removeEventListener("keydown", arm);
    };
  }, []);

  // At the foot of the page it goes: Echo joins the pile.
  useEffect(() => {
    const foot = document.querySelector(".foot");
    if (!foot) return;
    const io = new IntersectionObserver(([e]) => {
      setAtFoot(e!.isIntersecting);
      if (e!.isIntersecting) setCalled(null);
    });
    io.observe(foot);
    return () => io.disconnect();
  }, []);

  const home = called !== null;
  return (
    <div
      ref={root}
      className="keychain"
      data-echo-dock=""
      data-called={home ? "" : undefined}
      data-away={atFoot ? "" : undefined}
    >
      <span className="keychain__ring" aria-hidden="true" />
      <button
        type="button"
        className="keychain__button"
        aria-label={home ? "Send Echo out" : "Call Echo home"}
        {...cap.handlers}
        onClick={() => setCalled((c) => (c ? null : "you"))}
        tabIndex={atFoot ? -1 : undefined}
      >
        <span className="keychain__body" ref={cap.ref}>
          <span className="keychain__screen" data-echo-dock-screen="">
            {docked ? (
              <Creature size={30} mood={called === "nap" ? "sleep" : "idle"} />
            ) : (
              <span className="keychain__lcd" aria-hidden="true">
                {home ? "…" : "OUT"}
              </span>
            )}
          </span>
          <span className="keychain__keys" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
        </span>
      </button>
    </div>
  );
}
