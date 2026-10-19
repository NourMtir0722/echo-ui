"use client";

/**
 * The Motion gallery, by component: what moves in Echo, grouped by the kind
 * of component it lives in, each card saying where it lives and linking
 * there. The motion items (installed on their own) and the motion every
 * component already carries sit side by side, so the page doubles as an
 * index of what moves where.
 */
import Link from "next/link";
import type { ReactNode } from "react";
import { SoundProvider } from "echo-ui-core/sound";
import { installCommand } from "@registry/agent/guidance";
import { BUILT_IN_MOTION, MOTION_ENTRIES, MOTION_MORE } from "@/components/motion-demos";
import "./motion-gallery.css";

type Where = { name: string; slug: string };

interface Card {
  key: string;
  title: string;
  what: string;
  /** The components it moves in, each linked. */
  lives: Where[];
  /** An item you install on its own; otherwise it comes built in. */
  install?: string;
  demo: () => ReactNode;
}

const w = (name: string, slug: string): Where => ({ name, slug });

/** Where each motion item lives, when that isn't only itself. */
const LIVES: Record<string, Where[]> = {
  morph: [w("Morph", "morph"), w("HardwareButton", "hardware-button")],
  roll: [w("StatTile", "stat-tile"), w("LcdChip", "lcd-chip"), w("NumberField", "number-field"), w("SplitFlap", "split-flap")],
  ripple: [w("Ripple", "ripple"), w("Panel", "panel"), w("Card", "card")],
  "throw-stack": [w("ThrowStack", "throw-stack"), w("Toast", "toast")],
  "pull-cord": [w("PullCord", "pull-cord"), w("Switch", "switch")],
  "light-source": [w("LightSource", "light-source"), w("HardwareButton", "hardware-button")],
  magnetic: [w("Magnetic", "magnetic"), w("HardwareButton", "hardware-button")],
  "bud-off": [w("useBudOff", "bud-off"), w("CountBadge", "count-badge")],
};

const FAMILIES: { name: string; note: string; members: string[] }[] = [
  {
    name: "Buttons",
    note: "Real HardwareButtons at rest; while the state changes, one shape becomes several and flows back.",
    members: ["Press", "Latch", "Hold", "morph", "done-button", "confirm-button", "action-fan", "save-button"],
  },
  {
    name: "Hands and light",
    note: "The surface answers before you touch it: your pointer is the light, and the caps lean toward you.",
    members: ["light-source", "magnetic"],
  },
  {
    name: "Timers and recorders",
    note: "Buttons that are also clocks and meters: the cap fills, drains and counts.",
    members: ["timer", "stopwatch", "voice-note"],
  },
  {
    name: "Counts and readouts",
    note: "Numbers that travel to their value, and drops that carry cause to effect.",
    members: ["add-to-bag", "bud-off", "split-flap", "roll", "Slosh", "Ballistics"],
  },
  {
    name: "Fields and choices",
    note: "Wells that take a keystroke, selections that flow, and an error you can feel.",
    members: ["Typing", "Error shake", "Liquid highlight", "Bud", "Pip"],
  },
  {
    name: "Switches",
    note: "Things with a detent: they resist, give way and spring to where they belong.",
    members: ["Springs", "Detents", "pull-cord"],
  },
  {
    name: "Surfaces and stacks",
    note: "Slabs, panels, cards and rows that give under your hand and keep the speed you gave them.",
    members: ["ripple", "Press through", "Swipe", "throw-stack", "Pile and flick", "Bloom"],
  },
];

function cards(): Map<string, Card> {
  const out = new Map<string, Card>();
  for (const e of [...MOTION_ENTRIES, ...MOTION_MORE]) {
    out.set(e.slug, {
      key: e.slug,
      title: e.title,
      what: e.what,
      lives: LIVES[e.slug] ?? [w(e.title, e.slug)],
      install: installCommand(`echo-${e.slug}`),
      demo: e.demo,
    });
  }
  for (const m of BUILT_IN_MOTION) {
    out.set(m.name, {
      key: m.name,
      title: m.name,
      what: m.what,
      lives: [w(m.shown, m.slug)],
      demo: m.demo,
    });
  }
  return out;
}

export function MotionGallery() {
  const all = cards();
  const builtIn = new Map(BUILT_IN_MOTION.map((m) => [m.name, m]));
  return (
    <SoundProvider>
      <div className="echo-motion">
        <header className="echo-motion__head">
          <p className="echo-motion__eyebrow">Motion</p>
          <h1 className="echo-motion__title">Motion gallery</h1>
          <p className="echo-motion__lede">
            What moves in Echo, by the component it moves in. Some of it is an item you install on its own; most of it
            comes built into the components you already use. Either way it arrives with its sound, its keyboard path and
            its reduced-motion fallback.
          </p>
        </header>
        {FAMILIES.map((family) => {
          const id = `family-${family.name.toLowerCase().replace(/\W+/g, "-")}`;
          return (
            <section key={family.name} className="echo-motion__kind" aria-labelledby={id}>
              <h2 id={id} className="echo-motion__kindname">
                {family.name}
              </h2>
              <p className="echo-motion__kindnote">{family.note}</p>
              <ul className="echo-motion__grid">
                {family.members.map((key) => {
                  const c = all.get(key);
                  if (!c) return null;
                  const b = builtIn.get(key);
                  return (
                    <li key={c.key} className="echo-motion__card">
                      <div className="echo-motion__stage">{c.demo()}</div>
                      <div className="echo-motion__meta">
                        <h3 className="echo-motion__name">
                          {c.install ? <Link href={`/docs/${c.key}`}>{c.title}</Link> : c.title}
                        </h3>
                        <p className="echo-motion__what">{c.what}</p>
                        <p className="echo-motion__lives">
                          {b ? (
                            <>
                              <span className="echo-motion__tag">Built in</span> {b.where}.{" "}
                              <Link href={`/docs/${b.slug}`}>{b.shown} docs</Link>
                            </>
                          ) : (
                            <>
                              In{" "}
                              {c.lives.map((l, i) => (
                                <span key={l.slug}>
                                  {i > 0 ? (i === c.lives.length - 1 ? " and " : ", ") : null}
                                  <Link href={`/docs/${l.slug}`}>{l.name}</Link>
                                </span>
                              ))}
                            </>
                          )}
                        </p>
                        {c.install ? <code className="echo-motion__cmd">{c.install}</code> : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </SoundProvider>
  );
}
