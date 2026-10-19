"use client";

/**
 * The device console. A dashboard as a front panel: readouts
 * across the top, a level matrix, and the takes table underneath.
 *
 * WHAT THIS PROVES. Density and data at scale. Every other screen in the
 * library shows a handful of components with room around them; this one puts
 * a rail, a sidebar, six readouts, a chart, status lights and a twelve-row
 * table on one viewport and asks whether the material language still holds
 * when nothing has room. That is the question a screenshot answers, and it is
 * the reason this is the screenshot worth sharing.
 *
 * Every part is a shipped registry item — including the Chart, which wave 15
 * left conditional on a template demanding it. This is that demand: a device
 * dashboard with nothing read over time is a table with badges on it.
 */
import { useState } from "react";
import { AppShell } from "../app-shell";
import { Panel } from "../panel";
import { Table } from "../table";
import { StatTile } from "../stat-tile";
import { LcdChip } from "../lcd-chip";
import { StatusDot } from "../status-dot";
import { Chart } from "../chart";
import { Badge } from "../badge";
import { Menu } from "../menu";
import { Segmented } from "../segmented";
import { EngravedPlate } from "../engraved-plate";
import { Pagination } from "../pagination";
import "./console.css";

export interface ConsoleTake {
  id: string;
  name: string;
  length: string;
  peak: string;
  state: "kept" | "review" | "muted";
}

export interface ConsoleScreenProps {
  /**
   * This screen is rendered INSIDE another page — a docs preview, a marketing
   * route. It gives up the page's `<h1>` (the title drops to `<h2>`) and is
   * passed to AppShell, which drops the landmarks and the skip link, because a
   * page gets one first-level heading and one `<main>`.
   *
   * Never set it on the screen that owns the page.
   */
  embedded?: boolean;
  product?: string;
  takes?: ConsoleTake[];
  /** Level history, oldest first. Fixed 0..100 scale. */
  levels?: number[];
  /** Channels down the left rail. */
  channels?: string[];
}

const DEFAULT_TAKES: ConsoleTake[] = [
  { id: "t12", name: "Take 12 — verse", length: "01:58", peak: "-3.1 dB", state: "kept" },
  { id: "t11", name: "Take 11 — verse", length: "02:04", peak: "-2.8 dB", state: "review" },
  { id: "t10", name: "Take 10 — chorus", length: "01:12", peak: "-1.4 dB", state: "kept" },
  { id: "t09", name: "Take 9 — chorus", length: "01:09", peak: "-0.9 dB", state: "muted" },
  { id: "t08", name: "Take 8 — bridge", length: "00:47", peak: "-5.2 dB", state: "kept" },
  { id: "t07", name: "Take 7 — bridge", length: "00:51", peak: "-4.7 dB", state: "review" },
];

const DEFAULT_LEVELS = [
  38, 44, 41, 52, 61, 58, 66, 71, 64, 59, 68, 74, 81, 77, 69, 62, 58, 63, 70, 76, 84, 79, 72, 66,
  61, 57, 64, 69, 73, 68,
];

const STATE_LABEL: Record<ConsoleTake["state"], string> = {
  kept: "Kept",
  review: "Review",
  muted: "Muted",
};

export function ConsoleScreen({
  embedded,
  product = "ECHO ONE",
  takes = DEFAULT_TAKES,
  levels = DEFAULT_LEVELS,
  channels = ["Channel 1", "Channel 2", "Channel 3", "Master", "Cue"],
}: ConsoleScreenProps) {
  const [channel, setChannel] = useState("Channel 1");
  const [range, setRange] = useState(0);
  const [page, setPage] = useState(1);
  const Title = embedded ? "h2" : "h1";
  const Subheading = embedded ? "h3" : "h2";

  return (
    <AppShell className="echo-console" embedded={embedded}>
      <AppShell.Rail
        label="Console"
        brand={
          <span className="echo-console__brand">
            <StatusDot on label="Armed" />
            {product}
          </span>
        }
      >
        <Menu>
          <Menu.Trigger className="echo-console__more" aria-label="Session actions">
            <span aria-hidden="true">···</span>
          </Menu.Trigger>
          <Menu.Content align="end">
            <Menu.Item>Export session</Menu.Item>
            <Menu.Item>Bounce master</Menu.Item>
            <Menu.Separator />
            <Menu.Item>Session settings</Menu.Item>
          </Menu.Content>
        </Menu>
      </AppShell.Rail>

      <AppShell.Sidebar label="Channels">
        <span className="echo-console__sidelabel">Channels</span>
        {channels.map((c) => (
          <button
            key={c}
            type="button"
            className="echo-console__channel"
            aria-current={c === channel ? "true" : undefined}
            onClick={() => setChannel(c)}
          >
            {/*
              The label used to fall to `undefined` on every row but
              the current one, so the dot was aria-hidden AND had no adjacent
              text saying what it meant — the state was available to nobody.
              `aria-current` on the button carries "where you are"; this says
              what the dot itself is showing.
            */}
            <StatusDot on={c === channel} label={c === channel ? "Monitoring" : "Not monitoring"} />
            {c}
          </button>
        ))}
      </AppShell.Sidebar>

      <AppShell.Content>
        <div className="echo-console__body">
          <header className="echo-console__head">
            <div>
              <Title className="echo-console__title">{channel}</Title>
              <p className="echo-console__lede">Live input, session 004.</p>
            </div>
            <EngravedPlate tilt={-0.5}>{product}</EngravedPlate>
          </header>

          {/* Readouts. Six numbers, no room between them — the density test. */}
          {/*
            Only Peak glows. Six lit readouts side by side made the accent mean
            "a number" rather than "this one" — Echo reserves it for the single
            thing that is on, and the density is exactly where that stops being
            a nicety. StatTile grew `glow` for this.
          */}
          <div className="echo-console__tiles">
            <StatTile glow={false} value="42" unit="ms" label="Latency" />
            <StatTile glow={false} value="48" unit="kHz" label="Rate" />
            <StatTile glow={false} value="24" unit="bit" label="Depth" />
            <StatTile glow={false} value="98" unit="%" label="Uptime" />
            <StatTile glow={false} value="12" label="Takes" />
            <StatTile value="-3.1" unit="dB" label="Peak" />
          </div>

          <Panel>
            <div className="echo-console__panelhead">
              <span className="echo-console__panetitle">Input level</span>
              <div className="echo-console__panelcontrols">
                <LcdChip value="-3.1" label="Peak" />
                <Segmented
                  options={["60s", "5m", "1h"]}
                  value={range}
                  onValueChange={setRange}
                  aria-label="Level history range"
                />
              </div>
            </div>
            {/*
              A fixed 0..100 max: without it the matrix rescales the moment a
              new peak lands and the history appears to shrink.
            */}
            <Chart
              className="echo-console__chart"
              data={levels}
              min={0}
              max={100}
              rows={9}
              label={`${channel} input level, last ${["60 seconds", "5 minutes", "1 hour"][range]}`}
              caption="input"
            />
          </Panel>

          <section className="echo-console__takes" aria-labelledby="console-takes">
            <Subheading className="echo-console__panetitle" id="console-takes">
              Takes
            </Subheading>
            <Table caption="Recorded takes" hideCaption>
              <Table.Head>
                <Table.Row>
                  <Table.HeaderCell>Take</Table.HeaderCell>
                  <Table.HeaderCell>Length</Table.HeaderCell>
                  <Table.HeaderCell>Peak</Table.HeaderCell>
                  <Table.HeaderCell align="end">State</Table.HeaderCell>
                </Table.Row>
              </Table.Head>
              <Table.Body>
                {takes.map((take) => (
                  <Table.Row key={take.id}>
                    <Table.HeaderCell scope="row">{take.name}</Table.HeaderCell>
                    <Table.Cell numeric>{take.length}</Table.Cell>
                    <Table.Cell numeric>{take.peak}</Table.Cell>
                    <Table.Cell align="end">
                      {/*
                        The badge carries the word, not just a colour — severity
                        is never colour alone.
                      */}
                      <Badge variant={take.state === "kept" ? "accent" : "outline"}>
                        {STATE_LABEL[take.state]}
                      </Badge>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
            <Pagination page={page} count={4} onPageChange={setPage} label="Takes pages" />
          </section>
        </div>
      </AppShell.Content>
    </AppShell>
  );
}
