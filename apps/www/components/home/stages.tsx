"use client";

/**
 * Every live demo on the homepage below the hero, in one module.
 *
 * The sections themselves (their words, names and captions) are
 * server-rendered; what runs is loaded from here, as its own chunk, when the
 * section comes near (Deferred.tsx). That keeps the first paint to the hero:
 * the demos' JavaScript and their components' stylesheets stop blocking it.
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { HardwareButton } from "@registry/echo/hardware-button";
import { HoldButton } from "@registry/echo/hold-button";
import { Switch } from "@registry/echo/switch";
import { StatusDot } from "@registry/echo/status-dot";
import { Scope } from "@registry/echo/scope";
import { Tuner } from "@registry/echo/tuner";
import { NowPlaying } from "@registry/echo/now-playing";
import { Keypad } from "@registry/echo/keypad";
import { StatusIsland } from "@registry/echo/status-island";
import { DateTile } from "@registry/echo/date-tile";
import { JogWheel } from "@registry/echo/jog-wheel";
import { Creature } from "@registry/echo/creature";
import { ConsoleScreen } from "@registry/echo/console";
import { ChatScreen } from "@registry/echo/chat";
import { Morph } from "@registry/echo/morph";
import { AddToBag } from "@registry/echo/add-to-bag";
import { Magnetic } from "@registry/echo/magnetic";
import { StatTile } from "@registry/echo/stat-tile";
import { motionPreview } from "@/components/motion-demos";
import { DOKI, DOKI_ORANGE } from "@/components/doki";
import { SEED_PRESETS } from "@/components/site/theme-store";

/* --- three ways in -------------------------------------------------------- */

function PlayIcon() {
  return (
    <svg width="100%" height="100%" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function Designers() {
  return (
    <div className="ways__seeds">
      {SEED_PRESETS.map((p, i) => (
        <Scope key={p.name} accent={p.seed.accent}>
          <div className="ways__seed">
            <span className="ways__hex">{p.seed.accent}</span>
            <HardwareButton variant="primary" iconOnly aria-label={`Play, in ${p.name}`} icon={<PlayIcon />} />
            <Switch aria-label={`Live, in ${p.name}`} defaultChecked={i % 2 === 0} />
            <StatusDot on decorative />
          </div>
        </Scope>
      ))}
    </div>
  );
}

export type WaysDemo = "designers";

export function WaysShow({ which }: { which: WaysDemo }) {
  return which === "designers" ? <Designers /> : null;
}

/* --- the bench ------------------------------------------------------------ */

function Playing() {
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(84);
  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => setPosition((p) => (p + 1) % 214), 1000);
    return () => window.clearInterval(id);
  }, [playing]);
  return (
    <NowPlaying
      title="Night Drive"
      artist="Low Tide"
      source="Library"
      playing={playing}
      onPlayingChange={setPlaying}
      position={position}
      duration={214}
      onSeek={setPosition}
    />
  );
}

function Pad() {
  const [amount, setAmount] = useState("12.40");
  const [sent, setSent] = useState<string | null>(null);
  return (
    <Keypad
      label="Split the bill"
      prefix="$"
      value={amount}
      onValueChange={(v) => {
        setAmount(v);
        setSent(null);
      }}
      action={
        <HardwareButton variant="primary" fullWidth disabled={!amount} onClick={() => setSent(amount)}>
          {sent ? `Sent $${sent}` : amount ? `Send $${amount}` : "Enter an amount"}
        </HardwareButton>
      }
    />
  );
}

/**
 * An export running in the background. It opens by itself as the page
 * scrolls it up into the window (shown shut, it was a small pill in a big
 * cell), and shuts again scrolled back down below
 * it; a press of the visitor's own opens or shuts it too. Under reduced
 * motion it's simply open.
 *
 * It runs only while it's in the window: anywhere else on the page it would
 * go on drawing itself every 300ms for no one.
 */
function Export() {
  const [p, setP] = useState(0.12);
  const [open, setOpen] = useState(false);
  const [shown, setShown] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!shown) return;
    const id = window.setInterval(() => setP((x) => (x >= 1 ? 0 : Math.min(1, +(x + 0.02).toFixed(2)))), 300);
    return () => window.clearInterval(id);
  }, [shown]);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const seen = new IntersectionObserver(([e]) => setShown(!!e?.isIntersecting));
    seen.observe(el);
    return () => seen.disconnect();
  }, []);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setOpen(true);
      return;
    }
    // Up into the window, past its lowest 15%: open. Below that again (scrolled back up the page): shut.
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e) return;
        if (e.isIntersecting) setOpen(true);
        else if (e.boundingClientRect.top > 0) setOpen(false);
      },
      { rootMargin: "0px 0px -15% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const done = p >= 1;
  return (
    <div ref={box} className="bench__island">
      <StatusIsland
        label={done ? "Saved" : "Exporting"}
        title="Q3 report.pdf"
        progress={p}
        state={done ? "done" : "running"}
        detail={done ? "Saved to Reports" : `${Math.round(p * 28)} of 28 pages`}
        open={open}
        onOpenChange={setOpen}
      />
    </div>
  );
}

/** A due date on a desk calendar's page: move it a day, and the day turns over. */
function Due() {
  const [date, setDate] = useState("2026-10-14");
  const step = (days: number) => {
    const d = new Date(`${date}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + days);
    setDate(d.toISOString().slice(0, 10));
  };
  return (
    <div className="bench__due">
      <DateTile date={date} roll />
      <div className="bench__due-keys">
        <HardwareButton size="sm" onClick={() => step(-1)}>
          Day before
        </HardwareButton>
        <HardwareButton size="sm" onClick={() => step(1)}>
          Day after
        </HardwareButton>
      </div>
    </div>
  );
}

const timecode = (frames: number) => {
  const two = (n: number) => String(n).padStart(2, "0");
  return `${two(Math.floor(frames / 1500))}:${two(Math.floor(frames / 25) % 60)}:${two(frames % 25)}`;
};

const BENCH_STAGES: Record<string, () => ReactNode> = {
  tuner: () => <Tuner label="Station" unit="MHz" min={87.5} max={108} step={0.1} defaultValue={88.5} />,
  "now-playing": () => <Playing />,
  keypad: () => <Pad />,
  "split-flap": () => motionPreview("split-flap"),
  "pull-cord": () => motionPreview("pull-cord"),
  "status-island": () => <Export />,
  "date-tile": () => <Due />,
  creature: () => (
    <div className="bench__companions">
      <Creature variant="dots" size={96} mood="busy" />
      <Creature character={DOKI} accent={DOKI_ORANGE} size={64} />
    </div>
  ),
  "jog-wheel": () => <JogWheel label="Position" defaultValue={1812} formatValue={timecode} size="lg" />,
};

export function BenchStage({ slug }: { slug: string }) {
  return <>{BENCH_STAGES[slug]?.() ?? null}</>;
}

/* --- whole screens -------------------------------------------------------- */

export type TemplateKey = "console" | "chat";

/** Echo's templates, as they are: framed on the homepage, never changed for it. */
export function TemplateStage({ which }: { which: TemplateKey }) {
  return which === "console" ? <ConsoleScreen embedded /> : <ChatScreen embedded />;
}

/* --- sound and motion: the comparison's Echo side, and the six rows ---------- */

function Follow() {
  const [following, setFollowing] = useState(false);
  const [notify, setNotify] = useState(false);
  return (
    <Morph status={following ? "Following" : ""}>
      {following ? (
        <>
          <HardwareButton
            variant="primary"
            onClick={() => {
              setFollowing(false);
              setNotify(false);
            }}
          >
            Following
          </HardwareButton>
          <HardwareButton onClick={() => setNotify((on) => !on)}>{notify ? "Notifying" : "Notify me"}</HardwareButton>
        </>
      ) : (
        <HardwareButton onClick={() => setFollowing(true)}>Follow</HardwareButton>
      )}
    </Morph>
  );
}

function Cart() {
  const [count, setCount] = useState(2);
  return (
    <AddToBag count={count} onAdd={() => setCount((n) => n + 1)} countLabel="in cart">
      Add to cart
    </AddToBag>
  );
}

const Ico = ({ d }: { d: string }) => (
  <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
);

/** Three keys in one row: enough to feel the nearest lean most, without crowding its cell (the docs show the full dock). */
const DOCK: [string, string][] = [
  ["Home", "M4 11l8-7 8 7v9H4z"],
  ["Search", "M11 18a7 7 0 100-14 7 7 0 000 14zM20 20l-4-4"],
  ["Record", "M12 3a3 3 0 00-3 3v6a3 3 0 006 0V6a3 3 0 00-3-3zM5 11a7 7 0 0014 0"],
];

function Dock() {
  return (
    <Magnetic>
      {DOCK.map(([name, d]) => (
        <HardwareButton key={name} iconOnly aria-label={name} icon={<Ico d={d} />} />
      ))}
    </Magnetic>
  );
}

/**
 * A lift's display and its floor keys: one readout, one row of keys. Press a
 * floor and every digit rolls through the floors in between (useRoll, through
 * StatTile's `roll`). The docs show it on more readouts at once.
 */
const FLOORS = [1, 18, 42];

function Lift() {
  const [floor, setFloor] = useState(18);
  return (
    <div className="bench__lift">
      <StatTile value={String(floor).padStart(2, "0")} label="Floor" roll />
      <div className="bench__lift-keys" role="group" aria-label="Go to floor">
        {FLOORS.map((f) => (
          <HardwareButton key={f} size="sm" aria-pressed={floor === f} onClick={() => setFloor(f)}>
            {String(f)}
          </HardwareButton>
        ))}
      </div>
    </div>
  );
}

export type MotionRowKey = "morph" | "action-fan" | "add-to-bag" | "magnetic" | "save-button" | "hold-button" | "voice-note" | "roll";

/** A row's live component: the docs' own demo, so what the row shows is what its page shows. */
export function MotionRowDemo({ which }: { which: MotionRowKey }) {
  if (which === "morph") return <Follow />;
  if (which === "add-to-bag") return <Cart />;
  if (which === "magnetic") return <Dock />;
  if (which === "roll") return <Lift />;
  if (which === "hold-button")
    return (
      <HoldButton onConfirm={() => undefined} doneLabel="Deleted">
        Hold to delete
      </HoldButton>
    );
  return <>{motionPreview(which)}</>;
}
