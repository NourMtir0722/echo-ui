"use client";

/**
 * Live demos of the motion items: the Motion gallery and the docs previews
 * render the same ones, so what a card shows is what a doc page shows.
 */
import { useRef, useState, type ReactNode } from "react";
import "./motion-gallery.css";
import { HardwareButton } from "@registry/echo/hardware-button";
import { Morph } from "@registry/echo/morph";
import { DoneButton } from "@registry/echo/done-button";
import { ConfirmButton } from "@registry/echo/confirm-button";
import { ActionFan } from "@registry/echo/action-fan";
import { SaveButton } from "@registry/echo/save-button";
import { Timer } from "@registry/echo/timer";
import { Stopwatch } from "@registry/echo/stopwatch";
import { VoiceNote } from "@registry/echo/voice-note";
import { AddToBag } from "@registry/echo/add-to-bag";
import { useBudOff } from "@registry/echo/bud-off";
import { CountBadge } from "@registry/echo/count-badge";
import { PullCord } from "@registry/echo/pull-cord";
import { SplitFlap } from "@registry/echo/split-flap";
import { StatTile } from "@registry/echo/stat-tile";
import { LcdChip } from "@registry/echo/lcd-chip";
import { NumberField } from "@registry/echo/number-field";
import { LightSource } from "@registry/echo/light-source";
import { Magnetic } from "@registry/echo/magnetic";
import { ThrowStack } from "@registry/echo/throw-stack";
import { Ripple } from "@registry/echo/ripple";
import { Field } from "@registry/echo/field";
import { Segmented } from "@registry/echo/segmented";
import { Modal } from "@registry/echo/modal";
import { Switch } from "@registry/echo/switch";
import { Slider } from "@registry/echo/slider";
import { Card } from "@registry/echo/card";
import { Item } from "@registry/echo/item";
import { Toaster, useToast } from "@registry/echo/toast";
import { Avatar } from "@registry/echo/avatar";
import { Toggle } from "@registry/echo/toggle";
import { Meter } from "@registry/echo/meter";
import { Knob } from "@registry/echo/knob";
import { LevelMeter } from "@registry/echo/level-meter";
import { HoldButton } from "@registry/echo/hold-button";
import { Combobox } from "@registry/echo/combobox";
import { ChoiceCards } from "@registry/echo/choice-cards";

function MorphDemo() {
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

function DoneButtonDemo() {
  const [done, setDone] = useState(false);
  return <DoneButton done={done} onDoneChange={setDone} />;
}

function ConfirmButtonDemo() {
  return (
    <ConfirmButton onConfirm={() => undefined} confirmedLabel="Deleted">
      Delete project
    </ConfirmButton>
  );
}

function ActionFanDemo() {
  const [said, setSaid] = useState("");
  return (
    <div style={{ display: "grid", justifyItems: "center", gap: 8 }}>
      <ActionFan
        actions={[
          { label: "Link", onSelect: () => setSaid("Link copied") },
          { label: "Email", onSelect: () => setSaid("Email drafted") },
          { label: "Embed", onSelect: () => setSaid("Embed code copied") },
        ]}
      >
        Share
      </ActionFan>
      <span style={{ font: "var(--echo-type-caption)", color: "var(--echo-text-dim)", minHeight: "1.4em" }}>{said}</span>
    </div>
  );
}

function SaveButtonDemo() {
  return <SaveButton onSave={() => new Promise((done) => setTimeout(done, 1200))} />;
}

function AddToBagDemo() {
  const [count, setCount] = useState(2);
  return <AddToBag count={count} onAdd={() => setCount((n) => n + 1)} />;
}

function BudOffDemo() {
  const budOff = useBudOff();
  const from = useRef<HTMLButtonElement>(null);
  const to = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(0);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 48 }}>
      <HardwareButton
        ref={from}
        onClick={() => {
          if (from.current && to.current) budOff(from.current, to.current, { onArrive: () => setShown((n) => n + 1) });
        }}
      >
        Send
      </HardwareButton>
      <span ref={to} style={{ display: "inline-flex" }}>
        <CountBadge count={shown} label="sent" showZero />
      </span>
    </div>
  );
}

function PullCordDemo() {
  const [on, setOn] = useState(false);
  return (
    <div className="echo-motion__cord">
      <PullCord label="Lamp" checked={on} onCheckedChange={setOn}>
        <span className="echo-motion__lamp" aria-hidden />
      </PullCord>
      <span className="echo-motion__caption">{on ? "On" : "Off"} · pull the cord</span>
    </div>
  );
}

function SplitFlapDemo() {
  const [n, setN] = useState(1024);
  return (
    <div style={{ display: "grid", justifyItems: "center", gap: 20 }}>
      <SplitFlap value={n} length={4} label="Counter" />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
        <HardwareButton size="sm" onClick={() => setN((v) => (v + 1) % 10000)}>
          +1
        </HardwareButton>
        <HardwareButton size="sm" onClick={() => setN((v) => (v + 37) % 10000)}>
          +37
        </HardwareButton>
        <HardwareButton size="sm" onClick={() => setN(Math.floor(Math.random() * 10000))}>
          Shuffle
        </HardwareButton>
      </div>
    </div>
  );
}

function RollDemo() {
  const [n, setN] = useState(18);
  return (
    <div style={{ display: "grid", justifyItems: "center", gap: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", justifyContent: "center" }}>
        <StatTile value={String(n * 12)} unit="rps" label="Requests" roll />
        <LcdChip value={String(n)} label="Floor" roll />
      </div>
      <NumberField label="Floor" value={n} min={0} max={99} onValueChange={(v) => setN(v ?? 0)} roll />
    </div>
  );
}

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"];

function LightSourceDemo() {
  return (
    <LightSource className="echo-motion__keypad">
      {KEYS.map((k) => (
        <HardwareButton key={k} size="sm" iconOnly aria-label={k === "*" ? "Star" : k === "#" ? "Hash" : k} icon={<b>{k}</b>} />
      ))}
    </LightSource>
  );
}

const Ico = ({ d }: { d: string }) => (
  <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d={d} />
  </svg>
);
const DOCK: [string, string][] = [
  ["Home", "M4 11l8-7 8 7v9H4z"],
  ["Search", "M11 18a7 7 0 100-14 7 7 0 000 14zM20 20l-4-4"],
  ["Record", "M12 3a3 3 0 00-3 3v6a3 3 0 006 0V6a3 3 0 00-3-3zM5 11a7 7 0 0014 0"],
  ["Inbox", "M4 13l3-8h10l3 8v6H4zM4 13h5l1 2h4l1-2h5"],
  ["Settings", "M12 15a3 3 0 100-6 3 3 0 000 6zM12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"],
];

function MagneticDemo() {
  return (
    <Magnetic>
      {DOCK.map(([name, d]) => (
        <HardwareButton key={name} iconOnly aria-label={name} icon={<Ico d={d} />} />
      ))}
    </Magnetic>
  );
}

const DAY = [
  ["Morning", "Stand-up at 9:30"],
  ["Review", "Motion picks"],
  ["Focus", "Two hours, no calls"],
  ["Evening", "Record the demo"],
];

function ThrowStackDemo() {
  return (
    <ThrowStack label="Today">
      {DAY.map(([title, body]) => (
        <div key={title} className="echo-motion__daycard">
          <strong>{title}</strong>
          <span>{body}</span>
        </div>
      ))}
    </ThrowStack>
  );
}

function RippleDemo() {
  const [waves, setWaves] = useState(0);
  return (
    <Ripple className="echo-motion__ripple" onRipple={() => setWaves((n) => n + 1)}>
      <HardwareButton size="sm" onClick={() => undefined}>
        {waves === 0 ? "Press anywhere" : `Waves: ${waves}`}
      </HardwareButton>
    </Ripple>
  );
}

function ErrorShakeDemo() {
  const [value, setValue] = useState("ada@");
  const [tried, setTried] = useState(0);
  const bad = tried > 0 && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value);
  return (
    <div style={{ display: "grid", gap: 12, width: "min(100%, 16rem)" }}>
      <Field
        label="Email"
        value={value}
        onValueChange={(v) => {
          setValue(v);
          setTried(0);
        }}
        error={bad ? `Not an address yet (try ${tried})` : undefined}
      />
      <HardwareButton size="sm" onClick={() => setTried((n) => n + 1)}>
        Check
      </HardwareButton>
    </div>
  );
}

function PressCardDemo() {
  const [n, setN] = useState(0);
  return (
    <div style={{ width: "min(100%, 16rem)" }}>
      <Card title="Open the report" description={n ? `Opened ${n}×` : "The whole card is one button."} onClick={() => setN((v) => v + 1)} />
    </div>
  );
}

function ToastPileButtons() {
  const toast = useToast();
  const [n, setN] = useState(0);
  return (
    <HardwareButton
      size="sm"
      onClick={() => {
        setN((v) => v + 1);
        toast({ title: `Take ${n + 1} saved`, body: "Flick it away, or hover the pile." });
      }}
    >
      Save a take
    </HardwareButton>
  );
}

function ToastPileDemo() {
  return (
    <Toaster timeout={0}>
      <ToastPileButtons />
    </Toaster>
  );
}

function SwipeDemo() {
  const [gone, setGone] = useState<string[]>([]);
  const rows = ["Weekly report", "Invoice 0142", "Standup notes"].filter((r) => !gone.includes(r));
  return (
    <div style={{ width: "min(100%, 17rem)", display: "grid", gap: 8 }}>
      <div role="list" aria-label="Inbox">
        {rows.map((r) => (
          <div role="listitem" key={r}>
            <Item
              size="sm"
              media={<Avatar name={r} size="xs" />}
              title={r}
              swipeActions={[{ label: "Archive", onSelect: () => setGone((g) => [...g, r]) }]}
            />
          </div>
        ))}
      </div>
      {gone.length ? (
        <HardwareButton size="sm" variant="ghost" onClick={() => setGone([])}>
          Bring them back
        </HardwareButton>
      ) : null}
    </div>
  );
}

function SloshDemo() {
  const [v, setV] = useState(30);
  return (
    <div style={{ display: "grid", gap: 12, width: "min(100%, 16rem)" }}>
      <Meter label="Tank" value={v} />
      <HardwareButton size="sm" onClick={() => setV((x) => (x > 70 ? 15 : x + 30))}>
        Pour
      </HardwareButton>
    </div>
  );
}

function BallisticsDemo() {
  const [level, setLevel] = useState(0.2);
  return (
    <div style={{ display: "flex", alignItems: "end", gap: 16 }}>
      <LevelMeter label="Input" level={level} />
      <HardwareButton size="sm" onClick={() => {
        setLevel(0.95);
        window.setTimeout(() => setLevel(0.15), 120);
      }}>
        Clap
      </HardwareButton>
    </div>
  );
}

export interface MotionEntry {
  /** Docs slug (registry name minus `echo-`). */
  slug: string;
  title: string;
  /** Which kind of motion answers the hand. */
  kind: "Morph" | "Elastic" | "Mechanical" | "Light" | "Proximity" | "Momentum" | "Surface";
  /** What moves, and why, in one line. */
  what: string;
  demo: () => ReactNode;
}

export const MOTION_ENTRIES: readonly MotionEntry[] = [
  {
    slug: "done-button",
    title: "DoneButton",
    kind: "Morph",
    what: "The button divides into the state it reached and its own undo.",
    demo: () => <DoneButtonDemo />,
  },
  {
    slug: "confirm-button",
    title: "ConfirmButton",
    kind: "Morph",
    what: "The second press appears where your hand already is, then says what happened.",
    demo: () => <ConfirmButtonDemo />,
  },
  {
    slug: "action-fan",
    title: "ActionFan",
    kind: "Morph",
    what: "Choices bud out of the action they belong to, and fold back in.",
    demo: () => <ActionFanDemo />,
  },
  {
    slug: "save-button",
    title: "SaveButton",
    kind: "Morph",
    what: "The button becomes its own progress, then its own answer, then itself again.",
    demo: () => <SaveButtonDemo />,
  },
  {
    slug: "timer",
    title: "Timer",
    kind: "Morph",
    what: "Opens into durations; the others run into the one you pick, which drains as it runs and rings.",
    demo: () => <Timer />,
  },
  {
    slug: "stopwatch",
    title: "Stopwatch",
    kind: "Morph",
    what: "Start buds a Lap; each lap drops into the count. Pause turns Lap into Reset.",
    demo: () => <Stopwatch />,
  },
  {
    slug: "voice-note",
    title: "VoiceNote",
    kind: "Morph",
    what: "Your voice swells the Stop button; stop, and the take becomes a note that fills as it plays.",
    demo: () => <VoiceNote />,
  },
  {
    slug: "add-to-bag",
    title: "AddToBag",
    kind: "Morph",
    what: "A drop buds out of the button and lands in the count, so the eye follows what you added.",
    demo: () => <AddToBagDemo />,
  },
  {
    slug: "bud-off",
    title: "useBudOff",
    kind: "Morph",
    what: "The drop on its own: from any element into any other, which swells as it lands.",
    demo: () => <BudOffDemo />,
  },
  {
    slug: "morph",
    title: "Morph",
    kind: "Morph",
    what: "The base: wrap your own buttons, render any state, and the old buttons flow into the new.",
    demo: () => <MorphDemo />,
  },
];


export const MOTION_MORE: readonly MotionEntry[] = [
  {
    slug: "pull-cord",
    title: "PullCord",
    kind: "Elastic",
    what: "A switch you pull: the cord stretches, clicks at the detent, and the light comes on as you let go.",
    demo: () => <PullCordDemo />,
  },
  {
    slug: "split-flap",
    title: "SplitFlap",
    kind: "Mechanical",
    what: "A readout that turns over flap by flap: fast when it's far, slow on the last one, every flap audible.",
    demo: () => <SplitFlapDemo />,
  },
  {
    slug: "roll",
    title: "useRoll",
    kind: "Mechanical",
    what: "The flaps' drum without the flaps: StatTile, LcdChip and NumberField digits step through the ones in between when you pass roll.",
    demo: () => <RollDemo />,
  },
  {
    slug: "light-source",
    title: "LightSource",
    kind: "Light",
    what: "Your pointer is the light: every cap's shine turns toward you and its shadow falls away.",
    demo: () => <LightSourceDemo />,
  },
  {
    slug: "magnetic",
    title: "Magnetic",
    kind: "Proximity",
    what: "The buttons feel your hand before you touch them, and lean toward it; the nearest leans most.",
    demo: () => <MagneticDemo />,
  },
  {
    slug: "throw-stack",
    title: "ThrowStack",
    kind: "Momentum",
    what: "Flick the top card: it keeps your speed, spins from where you held it, and tucks in underneath.",
    demo: () => <ThrowStackDemo />,
  },
  {
    slug: "ripple",
    title: "Ripple",
    kind: "Surface",
    what: "Press the surface and a wave runs out from your finger; hold longer to press deeper.",
    demo: () => <RippleDemo />,
  },
];

/** For the docs: the demo for one slug. */
export function motionPreview(slug: string): ReactNode {
  return [...MOTION_ENTRIES, ...MOTION_MORE].find((e) => e.slug === slug)?.demo() ?? null;
}

/**
 * The motion every component already carries: nothing to add, it arrives with
 * the component. Each card shows one component that has it, and links there.
 */
export interface BuiltInMotion {
  /** Docs slug and name of the component shown. */
  slug: string;
  shown: string;
  name: string;
  /** Which components carry it. */
  where: string;
  what: string;
  demo: () => ReactNode;
}

export const BUILT_IN_MOTION: readonly BuiltInMotion[] = [
  {
    slug: "hold-button",
    shown: "HoldButton",
    name: "Hold",
    where: "HoldButton",
    what: "Lean on it and the plastic pours in under your finger; let go early and it drains away.",
    demo: () => <HoldButton onConfirm={() => undefined} doneLabel="Sent">Hold to send</HoldButton>,
  },
  {
    slug: "combobox",
    shown: "Combobox",
    name: "Bud",
    where: "Combobox, TagsInput",
    what: "Each thing you choose swells out of the text line into its own tag.",
    demo: () => (
      <div style={{ width: "min(100%, 17rem)" }}>
        <Combobox label="Labels" options={["bug", "design", "docs", "motion"].map((l) => ({ value: l, label: l }))} multiple defaultValue={["design"]} />
      </div>
    ),
  },
  {
    slug: "choice-cards",
    shown: "ChoiceCards",
    name: "Pip",
    where: "ChoiceCards, RadioGroup",
    what: "The chosen card's pip drops into its hole and a light runs down its edge.",
    demo: () => (
      <div style={{ width: "min(100%, 18rem)" }}>
        <ChoiceCards label="Size" minCardWidth="7rem" defaultValue="m" options={[{ value: "s", title: "Small" }, { value: "m", title: "Medium" }]} />
      </div>
    ),
  },
  {
    slug: "toggle",
    shown: "Toggle",
    name: "Latch",
    where: "Toggle, ToggleGroup",
    what: "Press it on and the cap goes down and stays there; press it again and it springs back up.",
    demo: () => <Toggle defaultPressed>Loop</Toggle>,
  },
  {
    slug: "meter",
    shown: "Meter",
    name: "Slosh",
    where: "Meter",
    what: "When the reading moves, the level travels there and settles with a small slosh, like a liquid.",
    demo: () => <SloshDemo />,
  },
  {
    slug: "level-meter",
    shown: "LevelMeter",
    name: "Ballistics",
    where: "LevelMeter",
    what: "It jumps up with a loud sound and drifts down after it, with the peak hanging on above for a moment.",
    demo: () => <BallisticsDemo />,
  },
  {
    slug: "knob",
    shown: "Knob",
    name: "Detents",
    where: "Knob",
    what: "Every step clicks and the cap settles onto it; turned past the end, it gives a little and springs back.",
    demo: () => <Knob label="Gain" min={-12} max={12} defaultValue={0} formatValue={(v) => `${v} dB`} />,
  },
  {
    slug: "field",
    shown: "Field",
    name: "Error shake",
    where: "Field",
    what: "A new error shoves the field sideways; it swings back through and settles on a spring, like a latch that won't take the key.",
    demo: () => <ErrorShakeDemo />,
  },
  {
    slug: "card",
    shown: "Card",
    name: "Press through",
    where: "Card, and any Panel with pressable",
    what: "The whole card is one button: it lifts as you reach, sinks a pixel as you press, and a wave runs out from your finger.",
    demo: () => <PressCardDemo />,
  },
  {
    slug: "toast",
    shown: "Toast",
    name: "Pile and flick",
    where: "Toaster",
    what: "Toasts pile like cards and fan out under your hand; flick one and it leaves at the speed you threw it, turning.",
    demo: () => <ToastPileDemo />,
  },
  {
    slug: "item",
    shown: "Item",
    name: "Swipe",
    where: "Item",
    what: "Swipe a row and it slides aside to show what's behind it; let go short and it springs back. Tab gets there too.",
    demo: () => <SwipeDemo />,
  },
  {
    slug: "hardware-button",
    shown: "HardwareButton",
    name: "Press",
    where: "HardwareButton, Kbd, LedKey, Tag, Pagination, Checkbox, RadioGroup, NumberField, and the triggers and keys of Select, Menu, Sheet, Modal and Toast",
    what: "A key switch: it gives at a detent, clicks as it bottoms out, and comes home faster than it went down.",
    demo: () => <HardwareButton variant="primary">Press</HardwareButton>,
  },
  {
    slug: "field",
    shown: "Field",
    name: "Typing",
    where: "Field, Textarea, OtpField, NumberField",
    what: "The well presses in when you focus it, and each keystroke lands with a small strike.",
    demo: () => (
      <div style={{ width: "min(100%, 16rem)" }}>
        <Field label="Name" placeholder="Type here" />
      </div>
    ),
  },
  {
    slug: "segmented",
    shown: "Segmented",
    name: "Liquid highlight",
    where: "Segmented, Tabs, Select and Menu highlights",
    what: "The selection travels as a drop: it stretches toward where it's going and settles there.",
    demo: () => <Segmented aria-label="Mode" options={["Focus", "Break", "Rest"]} />,
  },
  {
    slug: "modal",
    shown: "Modal",
    name: "Bloom",
    where: "Modal, AlertDialog, Command",
    what: "A panel starts as a small pill and swells into itself, wider first and then taller, like a drop spreading. Closing gathers it back.",
    demo: () => (
      <Modal trigger={<HardwareButton>Open</HardwareButton>} title="Bloom" description="A drop spreading, not a box scaling.">
        <p>Close it and it gathers back into a pill.</p>
      </Modal>
    ),
  },
  {
    slug: "switch",
    shown: "Switch",
    name: "Springs",
    where: "Switch, Slider",
    what: "Dragged, it keeps your speed; let go, it springs to where it belongs, and past the end it resists.",
    demo: () => (
      <div style={{ display: "grid", justifyItems: "center", gap: 16, width: "min(100%, 16rem)" }}>
        <Switch aria-label="Power" defaultChecked />
        <Slider defaultValue={40} aria-label="Level" />
      </div>
    ),
  },
];

