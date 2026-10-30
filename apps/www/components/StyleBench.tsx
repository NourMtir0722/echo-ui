"use client";

/**
 * A bench of Echo's components for the Styles page: the parts where a style
 * shows, in the states where it shows. Keys pressed and at rest, what's on and
 * what's off, a screen, a form, a table of records. Nothing here is drawn for
 * the page: every part is the registry's, so what changes when the style
 * changes is exactly what a project wearing it would get.
 */
import type { ReactNode } from "react";
import { Badge } from "@registry/echo/badge";
import { Banner } from "@registry/echo/banner";
import { Checkbox } from "@registry/echo/checkbox";
import { Field } from "@registry/echo/field";
import { HardwareButton } from "@registry/echo/hardware-button";
import { Knob } from "@registry/echo/knob";
import { LedKey } from "@registry/echo/led-key";
import { Meter } from "@registry/echo/meter";
import { Modal } from "@registry/echo/modal";
import { NumberField } from "@registry/echo/number-field";
import { Panel } from "@registry/echo/panel";
import { Progress } from "@registry/echo/progress";
import { RadioGroup } from "@registry/echo/radio-group";
import { SegmentDisplay } from "@registry/echo/segment-display";
import { Segmented } from "@registry/echo/segmented";
import { Select } from "@registry/echo/select";
import { Slider } from "@registry/echo/slider";
import { StatTile } from "@registry/echo/stat-tile";
import { StatusDot } from "@registry/echo/status-dot";
import { Switch } from "@registry/echo/switch";
import { Table, type TableColumn } from "@registry/echo/table";
import { Tabs } from "@registry/echo/tabs";
import { Tag } from "@registry/echo/tag";
import { Toggle, ToggleGroup } from "@registry/echo/toggle";

interface Take {
  id: string;
  take: string;
  input: number;
  seconds: number;
}

const TAKES: Take[] = [
  { id: "t1", take: "Room tone", input: 1, seconds: 161 },
  { id: "t2", take: "Vocal pass", input: 2, seconds: 67 },
  { id: "t3", take: "Guitar DI", input: 3, seconds: 753 },
];

const clock = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

const COLUMNS: TableColumn<Take>[] = [
  { key: "take", header: "Take", rowHeader: true },
  { key: "input", header: "Input", numeric: true },
  { key: "length", header: "Length", numeric: true, value: (t) => t.seconds, cell: (t) => clock(t.seconds) },
];

function PlayIcon() {
  return (
    <svg width="100%" height="100%" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <path d="M4 3l9 5-9 5z" />
    </svg>
  );
}

/** A control and the words beside it, which name it. */
function Labelled({ id, text, children }: { id: string; text: string; children: ReactNode }) {
  return (
    <label className="style-bench__labelled">
      {children} <span id={id}>{text}</span>
    </label>
  );
}

function Bay({
  label,
  span,
  screen,
  centred,
  children,
}: {
  label: string;
  span: 4 | 5 | 6 | 7 | 12;
  screen?: boolean;
  /** One row of parts in a tall panel: it sits in the middle, not at the top with air under it. */
  centred?: boolean;
  children: ReactNode;
}) {
  return (
    <section className="style-bench__bay" data-span={span}>
      <h2 className="tool-label">{label}</h2>
      <Panel variant={screen ? "screen" : undefined} className="style-bench__panel" data-centred={centred ? "" : undefined}>
        {children}
      </Panel>
    </section>
  );
}

export function StyleBench() {
  return (
    <div className="style-bench">
      <Bay label="Keys" span={7}>
        <div className="style-bench__row">
          <HardwareButton variant="primary">Record</HardwareButton>
          <HardwareButton>Save take</HardwareButton>
          <HardwareButton variant="ghost">Discard</HardwareButton>
          <HardwareButton iconOnly aria-label="Play" icon={<PlayIcon />} />
        </div>
        <div className="style-bench__row">
          <LedKey lit litLabel="Armed">
            Arm
          </LedKey>
          <LedKey>Snooze +5</LedKey>
          <Modal
            trigger={<HardwareButton>Open dialog</HardwareButton>}
            title="Device settings"
            description="A dialog wears the style too."
            footer={<HardwareButton variant="primary">Save</HardwareButton>}
          >
            <Labelled id="style-bench-monitor" text="Monitor while recording">
              <Switch aria-labelledby="style-bench-monitor" defaultChecked />
            </Labelled>
          </Modal>
        </div>
      </Bay>

      <Bay label="Screen" span={5} screen centred>
        <div className="style-bench__row style-bench__row--apart">
          <SegmentDisplay label="Time left" value="04:59" />
          <StatTile value="128" unit="bpm" label="Tempo" />
        </div>
      </Bay>

      <Bay label="Controls" span={4}>
        <div className="style-bench__row">
          <Labelled id="style-bench-input" text="Input">
            <Switch aria-labelledby="style-bench-input" defaultChecked />
          </Labelled>
          <Labelled id="style-bench-loop" text="Loop">
            <Switch aria-labelledby="style-bench-loop" />
          </Labelled>
        </div>
        <div className="style-bench__row">
          <Labelled id="style-bench-armed" text="Armed">
            <Checkbox aria-labelledby="style-bench-armed" defaultChecked />
          </Labelled>
          <Labelled id="style-bench-muted" text="Muted">
            <Checkbox aria-labelledby="style-bench-muted" />
          </Labelled>
        </div>
        <RadioGroup defaultValue="line" aria-label="Output">
          <RadioGroup.Item value="line">Line</RadioGroup.Item>
          <RadioGroup.Item value="phones">Phones</RadioGroup.Item>
        </RadioGroup>
        <ToggleGroup aria-label="View" defaultValue={["grid"]}>
          <Toggle value="grid">Grid</Toggle>
          <Toggle value="list">List</Toggle>
        </ToggleGroup>
      </Bay>

      <Bay label="Levels" span={4}>
        <Segmented aria-label="Mode" options={["Focus", "Break", "Rest"]} />
        <Slider defaultValue={60} aria-label="Level" />
        <Progress value={0.65} aria-label="Render progress" />
        <Meter label="Storage" value={42} max={64} />
      </Bay>

      <Bay label="Dials" span={4} centred>
        <div className="style-bench__row style-bench__row--apart">
          <Knob label="Gain" min={-24} max={24} defaultValue={6} formatValue={(v) => `${v > 0 ? "+" : ""}${v} dB`} />
          <Knob size="sm" label="Low" defaultValue={40} />
          <Knob size="sm" label="High" defaultValue={70} />
        </div>
      </Bay>

      <Bay label="Form" span={6}>
        <Field label="Session name" defaultValue="Night take" />
        <Select
          aria-label="Sample rate"
          defaultValue="48"
          options={[
            { value: "44", label: "44.1 kHz" },
            { value: "48", label: "48 kHz" },
            { value: "96", label: "96 kHz" },
          ]}
        />
        <NumberField label="Tempo" defaultValue={120} min={40} max={240} />
      </Bay>

      <Bay label="Status" span={6}>
        <Banner title="Recording" tone="active">
          The mic is live on input 2.
        </Banner>
        <div className="style-bench__row">
          <Badge>Neutral</Badge>
          <Badge variant="accent">Rec</Badge>
          <Badge variant="outline">Draft</Badge>
          <Tag>Ambient</Tag>
          <StatusDot on label="Online" />
        </div>
        <Tabs defaultValue="meter">
          <Tabs.List>
            <Tabs.Tab value="meter">Meter</Tabs.Tab>
            <Tabs.Tab value="log">Log</Tabs.Tab>
            <Tabs.Tab value="routing">Routing</Tabs.Tab>
          </Tabs.List>
          <Tabs.Panel value="meter">Input peaking at −3 dB.</Tabs.Panel>
          <Tabs.Panel value="log">Three takes today.</Tabs.Panel>
          <Tabs.Panel value="routing">Mic 1 → bus A.</Tabs.Panel>
        </Tabs>
      </Bay>

      <Bay label="Records" span={12}>
        <Table caption="Recent takes" columns={COLUMNS} rows={TAKES} getRowId={(t) => t.id} />
      </Bay>
    </div>
  );
}
