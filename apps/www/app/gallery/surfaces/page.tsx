"use client";

/**
 * Surfaces gallery: Panel, Progress, Loader,
 * StatusDot, Toast — the original "Surfaces & feedback" showcase — plus the
 * state cluster: Skeleton, Banner, EmptyState. Rendered for axe +
 * visual-regression.
 */
import { Panel } from "@registry/echo/panel";
import { Progress } from "@registry/echo/progress";
import { Loader } from "@registry/echo/loader";
import { StatusDot } from "@registry/echo/status-dot";
import { Toast } from "@registry/echo/toast";
import { Skeleton } from "@registry/echo/skeleton";
import { Banner } from "@registry/echo/banner";
import { EmptyState } from "@registry/echo/empty-state";
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

export default function SurfacesGallery() {
  return (
    <>
      <div className="echo-gallery" style={{ maxWidth: 820, margin: "0 auto", padding: "3rem 1.5rem 6rem" }}>
        <h1 style={{ fontFamily: "var(--site-font-display), var(--echo-font-sans)", fontSize: "2.2rem", fontWeight: 800, letterSpacing: "-0.03em" }}>Surfaces</h1>

        <Section id="panels" title="Panel">
          <Panel style={{ width: 260, maxWidth: "100%", color: "var(--echo-text)", fontSize: 13 }}>
            Raised molded plastic — things you touch.
          </Panel>
          <Panel variant="screen" style={{ width: 260, maxWidth: "100%" }}>
            <StatTile value="07:42" label="Uptime" />
          </Panel>
        </Section>

        <Section id="progress" title="Progress">
          <Progress value={0.65} aria-label="Upload progress" />
          <Progress value={0.2} cells={8} aria-label="Battery" style={{ width: 160 }} />
        </Section>

        <Section id="loaders" title="Loader">
          <Loader />
          <Loader dot={6} label="Saving" />
        </Section>

        <Section id="status-dots" title="StatusDot">
          <span style={{ display: "inline-flex", gap: 8, alignItems: "center", color: "var(--echo-text)", fontFamily: mono, fontSize: 13 }}>
            <StatusDot on decorative /> recording
          </span>
          <span style={{ display: "inline-flex", gap: 8, alignItems: "center", color: "var(--echo-text-dim)", fontFamily: mono, fontSize: 13 }}>
            <StatusDot on={false} decorative /> idle
          </span>
          <StatusDot on={false} label="Offline" />
        </Section>

        <Section id="toasts" title="Toast">
          <Toast title="Saved" body="Draft stored locally" />
          <Toast title="Recording" body="Mic is live" tone="active" />
        </Section>

        <Section id="skeletons" title="Skeleton">
          <div style={{ display: "grid", gap: 16, width: 300 }}>
            <Skeleton lines={3} label="Loading article" />
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <Skeleton variant="circle" height={36} />
              <Skeleton width={160} />
            </div>
            <Skeleton variant="block" height={90} />
          </div>
        </Section>

        <Section id="banners" title="Banner">
          <div style={{ display: "grid", gap: 12, width: 420 }}>
            <Banner title="Offline mode" tone="warn">
              Changes sync when the device reconnects.
            </Banner>
            <Banner title="Recording" tone="active">
              The mic is live on input 2.
            </Banner>
            <Banner tone="danger" title="Upload failed" onDismiss={() => {}}>
              The file exceeds the size limit.
            </Banner>
          </div>
        </Section>

        <Section id="empty-states" title="EmptyState">
          <div style={{ width: 420 }}>
            <EmptyState
              title="No recordings yet"
              description="Anything you capture on this device shows up here."
            />
          </div>
        </Section>
      </div>
    </>
  );
}
