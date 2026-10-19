"use client";

/**
 * The long-content stress route.
 *
 * Across 48 styled components, `text-overflow` appeared ONCE and
 * `overflow-wrap`/`word-break` zero times, against 8 `nowrap` declarations and
 * only 9 `min-width: 0`. One ellipsis and no word-breaking means long content
 * had no defined behaviour anywhere — seven of those `nowrap`s would simply
 * push their container open.
 *
 * Nothing in the gallery could catch that, because every demo label in the
 * library is a tidy one or two words. This page gives every text-bearing
 * component a 120-character label and a 40-character unbroken token, at which
 * point a component either truncates, wraps, or fails `layout.spec.ts`.
 *
 * It is a test fixture, not documentation: it is `noindex`, it is not in the
 * nav, and the only thing that reads it is the layout sweep.
 */
import { HardwareButton } from "@registry/echo/hardware-button";
import { Field } from "@registry/echo/field";
import { Textarea } from "@registry/echo/textarea";
import { Select } from "@registry/echo/select";
import { Banner } from "@registry/echo/banner";
import { Toast } from "@registry/echo/toast";
import { Tag } from "@registry/echo/tag";
import { Badge } from "@registry/echo/badge";
import { Panel } from "@registry/echo/panel";
import { StatTile } from "@registry/echo/stat-tile";
import { EmptyState } from "@registry/echo/empty-state";
import { Breadcrumb } from "@registry/echo/breadcrumb";
import { Checkbox } from "@registry/echo/checkbox";
import { Switch } from "@registry/echo/switch";
import { RadioGroup } from "@registry/echo/radio-group";
import { Segmented } from "@registry/echo/segmented";
import { Progress } from "@registry/echo/progress";
import { Slider } from "@registry/echo/slider";
import { CountBadge } from "@registry/echo/count-badge";
import { StatusDot } from "@registry/echo/status-dot";
import { LcdChip } from "@registry/echo/lcd-chip";
import type { ReactNode } from "react";

/** Exactly 120 characters, with ordinary word boundaries. */
const LONG =
  "Monitoring the primary capture bus for sustained clipping across every channel in the rack before the session is committed";

/** 40 characters with no break opportunity at all — the harder case. */
const UNBROKEN = "Supercalifragilisticexpialidocious10x4xx";

function Case({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section style={{ marginBottom: 28 }}>
      <h2
        style={{
          fontFamily: "var(--echo-font-mono)",
          fontSize: "var(--echo-text-xs)",
          color: "var(--echo-text-dim)",
          textTransform: "uppercase",
          letterSpacing: "0.2em",
        }}
      >
        {title}
      </h2>
      <div
        data-testid={`stress-${id}`}
        style={{
          display: "flex",
          gap: 16,
          flexWrap: "wrap",
          alignItems: "center",
          padding: 16,
          borderRadius: 16,
          background: "var(--echo-surface)",
        }}
      >
        {children}
      </div>
    </section>
  );
}

export default function StressPage() {
  return (
    <>
      <meta name="robots" content="noindex" />
      <div style={{ maxWidth: 820, margin: "0 auto", padding: "2rem 1.5rem 4rem" }}>
        <h1 style={{ fontFamily: "var(--echo-font-mono)", fontSize: "var(--echo-text-xl)" }}>
          Long-content stress
        </h1>

        <Case id="buttons" title="HardwareButton">
          <HardwareButton>{LONG}</HardwareButton>
          <HardwareButton variant="primary" size="lg" caption={LONG}>
            {UNBROKEN}
          </HardwareButton>
        </Case>

        <Case id="inputs" title="Field / Textarea / Select">
          <Field label={LONG} placeholder={LONG} defaultValue={UNBROKEN} />
          <Textarea label={LONG} defaultValue={LONG} />
          <Select
            aria-label={LONG}
            options={[
              { value: "a", label: LONG },
              { value: "b", label: UNBROKEN },
            ]}
            defaultValue="a"
          />
        </Case>

        <Case id="toggles" title="Checkbox / Switch / RadioGroup / Segmented">
          <label style={{ display: "inline-flex", gap: 8, alignItems: "center", color: "var(--echo-text)" }}>
            <Checkbox aria-label={LONG} />
            <span>{LONG}</span>
          </label>
          <Switch aria-label={LONG} />
          <RadioGroup aria-label={LONG} defaultValue="a">
            <RadioGroup.Item value="a">{LONG}</RadioGroup.Item>
            <RadioGroup.Item value="b">{UNBROKEN}</RadioGroup.Item>
          </RadioGroup>
          <Segmented aria-label={LONG} options={[LONG, UNBROKEN]} defaultValue={0} />
        </Case>

        <Case id="messages" title="Banner / Toast / EmptyState">
          <Banner title={LONG} onDismiss={() => {}}>
            {LONG} {UNBROKEN}
          </Banner>
          <Banner tone="warn" title={UNBROKEN}>
            {LONG}
          </Banner>
          <Toast title={LONG} body={`${LONG} ${UNBROKEN}`} />
          <EmptyState title={LONG} description={LONG} />
        </Case>

        <Case id="marks" title="Tag / Badge / CountBadge / StatusDot / LcdChip">
          <Tag onRemove={() => {}}>{LONG}</Tag>
          <Tag>{UNBROKEN}</Tag>
          <Badge variant="accent">{LONG}</Badge>
          <CountBadge count={999999} label={LONG} variant="accent" />
          <span style={{ display: "inline-flex", gap: 8, alignItems: "center", color: "var(--echo-text)" }}>
            <StatusDot on decorative />
            {LONG}
          </span>
          <LcdChip value={UNBROKEN} label={LONG} />
        </Case>

        <Case id="surfaces" title="Panel / StatTile / Progress / Slider">
          <Panel style={{ color: "var(--echo-text)" }}>{LONG}</Panel>
          <StatTile value={UNBROKEN} label={LONG} />
          <Progress value={40} aria-label={LONG} />
          <Slider defaultValue={40} aria-label={LONG} />
        </Case>

        <Case id="nav" title="Breadcrumb">
          <Breadcrumb
            items={[
              { label: LONG, href: "/" },
              { label: UNBROKEN, href: "/" },
              { label: LONG },
            ]}
          />
        </Case>
      </div>
    </>
  );
}
