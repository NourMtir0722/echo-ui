"use client";

/**
 * Navigation + data gallery: Table, Breadcrumb,
 * Pagination, Steps — rendered for axe, keyboard, and visual regression.
 */
import { useState } from "react";
import type { ReactNode } from "react";
import { Table } from "@registry/echo/table";
import { Breadcrumb } from "@registry/echo/breadcrumb";
import { Pagination } from "@registry/echo/pagination";
import { Steps } from "@registry/echo/steps";
import { HardwareButton } from "@registry/echo/hardware-button";

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section style={{ marginBottom: 36 }}>
      <h2 style={{ fontFamily: "var(--echo-font-machine)", fontSize: 12, fontWeight: 700, color: "var(--echo-text-dim)", textTransform: "uppercase", letterSpacing: 2 }}>
        {title}
      </h2>
      <div
        data-testid={id}
        style={{ display: "grid", gap: 16, padding: 20, borderRadius: 16, background: "var(--echo-surface)" }}
      >
        {children}
      </div>
    </section>
  );
}

export default function NavigationGallery() {
  const [page, setPage] = useState(1);
  const [step, setStep] = useState(1);
  const steps = ["Connect", "Calibrate", "Record", "Done"];

  return (
    <>
      <div className="echo-gallery" style={{ maxWidth: 820, margin: "0 auto", padding: "3rem 1.5rem 6rem" }}>
        <h1 style={{ fontFamily: "var(--site-font-display), var(--echo-font-sans)", fontSize: "2.2rem", fontWeight: 800, letterSpacing: "-0.03em" }}>Navigation &amp; data</h1>

        <Section id="breadcrumbs" title="Breadcrumb">
          <Breadcrumb
            items={[
              { label: "Home", href: "#home" },
              { label: "Device", href: "#device" },
              { label: "Inputs", href: "#inputs" },
              { label: "Input 2" },
            ]}
          />
        </Section>

        <Section id="paginations" title="Pagination">
          <Pagination page={page} count={20} onPageChange={setPage} />
          <Pagination
            page={page}
            count={20}
            siblings={2}
            onPageChange={setPage}
            label="Wide window"
          />
        </Section>

        <Section id="steps" title="Steps">
          <Steps label="Setup" current={step} steps={steps} />
          <div style={{ display: "flex", gap: 12 }}>
            <HardwareButton size="sm" disabled={step === 0} onClick={() => setStep((c) => Math.max(0, c - 1))}>
              Back
            </HardwareButton>
            <HardwareButton
              size="sm"
              variant="primary"
              disabled={step >= steps.length}
              onClick={() => setStep((c) => Math.min(steps.length, c + 1))}
            >
              Next
            </HardwareButton>
          </div>
        </Section>

        <Section id="tables" title="Table">
          <Table caption="Recent takes">
            <Table.Head>
              <Table.Row>
                <Table.HeaderCell>Take</Table.HeaderCell>
                <Table.HeaderCell>Input</Table.HeaderCell>
                <Table.HeaderCell align="end">Length</Table.HeaderCell>
              </Table.Row>
            </Table.Head>
            <Table.Body>
              <Table.Row>
                <Table.HeaderCell scope="row">Room tone</Table.HeaderCell>
                <Table.Cell>1</Table.Cell>
                <Table.Cell numeric>02:41</Table.Cell>
              </Table.Row>
              <Table.Row>
                <Table.HeaderCell scope="row">Vocal pass</Table.HeaderCell>
                <Table.Cell>2</Table.Cell>
                <Table.Cell numeric>01:07</Table.Cell>
              </Table.Row>
              <Table.Row>
                <Table.HeaderCell scope="row">Guitar DI</Table.HeaderCell>
                <Table.Cell>3</Table.Cell>
                <Table.Cell numeric>12:33</Table.Cell>
              </Table.Row>
            </Table.Body>
          </Table>
        </Section>
      </div>
    </>
  );
}
