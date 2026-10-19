"use client";

/**
 * Static primitives gallery: Badge, Kbd, Divider,
 * StatTile, Avatar, Tag — rendered for axe + visual-regression.
 */
import { Badge } from "@registry/echo/badge";
import { Kbd } from "@registry/echo/kbd";
import { Divider } from "@registry/echo/divider";
import { Avatar } from "@registry/echo/avatar";
import { Tag } from "@registry/echo/tag";
import { CountBadge } from "@registry/echo/count-badge";
import { StatTile } from "@registry/echo/stat-tile";
import type { ReactNode } from "react";

const mono = "var(--echo-font-mono)";

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section style={{ marginBottom: 36 }}>
      <h2 style={{ fontFamily: "var(--echo-font-machine)", fontSize: 12, fontWeight: 700, color: "var(--echo-text-dim)", textTransform: "uppercase", letterSpacing: 2 }}>
        {title}
      </h2>
      <div
        data-testid={id}
        style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center", padding: 20, borderRadius: 16, background: "var(--echo-surface)" }}
      >
        {children}
      </div>
    </section>
  );
}

export default function PrimitivesGallery() {
  return (
    <>
      <div className="echo-gallery" style={{ maxWidth: 820, margin: "0 auto", padding: "3rem 1.5rem 6rem" }}>
        <h1 style={{ fontFamily: "var(--site-font-display), var(--echo-font-sans)", fontSize: "2.2rem", fontWeight: 800, letterSpacing: "-0.03em" }}>Primitives</h1>

        <Section id="badges" title="Badge">
          <Badge>Neutral</Badge>
          <Badge variant="accent">Rec</Badge>
          <Badge variant="lcd">12</Badge>
          <Badge variant="outline">Draft</Badge>
          <Badge size="sm">sm</Badge>
        </Section>

        <Section id="kbd" title="Kbd">
          <span style={{ color: "var(--echo-text)", fontFamily: mono, display: "inline-flex", gap: 6, alignItems: "center" }}>
            <Kbd>⌘</Kbd> <Kbd>K</Kbd>
          </span>
          <Kbd>Esc</Kbd>
          <Kbd>↵</Kbd>
        </Section>

        <Section id="stat-tiles" title="StatTile">
          <StatTile value="42" unit="ms" label="Latency" />
          <StatTile value="1.2k" label="Records" />
          <StatTile value="98" unit="%" label="Uptime" />
        </Section>

        <Section id="dividers" title="Divider">
          <div style={{ width: 240, color: "var(--echo-text-dim)", fontFamily: mono, fontSize: 13 }}>
            <div>above</div>
            <Divider />
            <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 8 }}>
              <span>a</span>
              <Divider orientation="vertical" />
              <span>b</span>
            </div>
          </div>
        </Section>

        <Section id="avatars" title="Avatar">
          <Avatar name="Ada Lovelace" size="sm" />
          <Avatar name="Ada Lovelace" />
          <Avatar name="Grace Hopper" size="lg" />
          <Avatar name="Echo One, studio unit" initials="E1" size="lg" />
          <Avatar name="Broken Fallback" src="data:image/png;base64,AAAA" size="lg" />
        </Section>

        <Section id="count-badges" title="CountBadge">
          <CountBadge count={3} label="unread messages" />
          <CountBadge count={127} label="unread messages" />
          <CountBadge count={8} label="pending takes" variant="neutral" />
          <CountBadge count={0} showZero label="errors" variant="neutral" />
        </Section>

        <Section id="tags" title="Tag">
          <Tag>Ambient</Tag>
          <Tag>Field recording</Tag>
          <Tag removeLabel="Remove Loop" onRemove={() => {}}>
            Loop
          </Tag>
        </Section>
      </div>
    </>
  );
}
