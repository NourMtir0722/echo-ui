"use client";

/**
 * Right-to-left gallery. Every specimen renders twice at the same
 * width, left-to-right and right-to-left, so the page doubles as a check:
 * tests/rtl.spec.ts requires each part's box in the right-to-left copy to be
 * the mirror image of its box in the left-to-right one. The Arabic section at
 * the end is for reading, not measuring.
 *
 * Right-to-left needs two things from an app: `dir="rtl"` on an ancestor, for
 * the CSS, and Base UI's DirectionProvider, for keyboard and pointer behaviour
 * (arrow keys, slider drag).
 */
import type { ReactNode } from "react";
import { DirectionProvider } from "@base-ui/react/direction-provider";
import { Accordion } from "@registry/echo/accordion";
import { Avatar } from "@registry/echo/avatar";
import { Badge } from "@registry/echo/badge";
import { Banner } from "@registry/echo/banner";
import { Breadcrumb } from "@registry/echo/breadcrumb";
import { Checkbox } from "@registry/echo/checkbox";
import { Field } from "@registry/echo/field";
import { HardwareButton } from "@registry/echo/hardware-button";
import { NumberField } from "@registry/echo/number-field";
import { Pagination } from "@registry/echo/pagination";
import { Progress } from "@registry/echo/progress";
import { RadioGroup } from "@registry/echo/radio-group";
import { Segmented } from "@registry/echo/segmented";
import { Select } from "@registry/echo/select";
import { Slider } from "@registry/echo/slider";
import { StatTile } from "@registry/echo/stat-tile";
import { Steps } from "@registry/echo/steps";
import { Switch } from "@registry/echo/switch";
import { Table } from "@registry/echo/table";
import { Tabs } from "@registry/echo/tabs";
import { Tag } from "@registry/echo/tag";

const label: React.CSSProperties = {
  font: "var(--echo-type-machine-label)",
  letterSpacing: "var(--echo-type-machine-label-tracking)",
  textTransform: "uppercase",
  color: "var(--echo-text-dim)",
};

/** One specimen, rendered in both directions at the same width. */
function Pair({ name, children }: { name: string; children: ReactNode }) {
  return (
    <section style={{ display: "grid", gap: "var(--echo-space-4)" }}>
      <h2 style={{ ...label, margin: 0 }}>{name}</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))", gap: "var(--echo-space-8)" }}>
        {(["ltr", "rtl"] as const).map((dir) => (
          <DirectionProvider key={dir} direction={dir}>
            <div dir={dir} data-specimen={name} data-dir={dir} style={{ minWidth: 0 }}>
              {children}
            </div>
          </DirectionProvider>
        ))}
      </div>
    </section>
  );
}

const row: React.CSSProperties = { display: "flex", gap: "var(--echo-space-6)", alignItems: "center", flexWrap: "wrap" };

export default function RtlGallery() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--echo-well)", padding: "4rem 1.5rem 8rem" }}>
      <div className="echo-gallery" style={{ maxWidth: 900, margin: "0 auto", display: "grid", gap: 48 }}>
        <header style={{ display: "grid", gap: 12 }}>
          <span style={label}>Direction</span>
          <h1 style={{ font: "var(--echo-type-heading)", fontSize: "var(--echo-text-2xl)", color: "var(--echo-text)", margin: 0 }}>
            Right to left
          </h1>
          <p style={{ font: "var(--echo-type-body)", color: "var(--echo-text-dim)", maxWidth: 620, margin: 0 }}>
            Every component, left-to-right beside right-to-left. Set <code>dir=&quot;rtl&quot;</code> on an ancestor and
            wrap the app in Base UI&apos;s <code>DirectionProvider</code>; the layout mirrors, and arrow keys follow
            the reading direction. The light doesn&apos;t move: it still comes from the top left.
          </p>
        </header>

        <Pair name="Switch, checkbox, radio">
          <div style={{ display: "grid", gap: "var(--echo-space-6)" }}>
            <div style={row}>
              <Switch defaultChecked aria-label="Watching" />
              <Switch aria-label="Do not disturb" />
              <Checkbox defaultChecked aria-label="Agree" />
            </div>
            <RadioGroup defaultValue="line" aria-label="Output">
              <RadioGroup.Item value="line">Line out</RadioGroup.Item>
              <RadioGroup.Item value="phones">Phones</RadioGroup.Item>
            </RadioGroup>
          </div>
        </Pair>

        <Pair name="Slider and progress">
          <div style={{ display: "grid", gap: "var(--echo-space-8)" }}>
            <Slider aria-label="Level" defaultValue={30} />
            <Progress value={0.4} aria-label="Upload" />
          </div>
        </Pair>

        <Pair name="Fields">
          <div style={{ display: "grid", gap: "var(--echo-space-6)" }}>
            <Field label="Session name" defaultValue="Night take" />
            <NumberField label="Tempo" defaultValue={120} min={40} max={240} />
            <Select aria-label="Length" defaultValue="25" options={[{ value: "25", label: "25 min" }, { value: "50", label: "50 min" }]} />
          </div>
        </Pair>

        <Pair name="Tabs and accordion">
          <div style={{ display: "grid", gap: "var(--echo-space-6)" }}>
            <Segmented aria-label="Mode" options={["Focus", "Break", "Rest"]} defaultValue={1} />
            <Tabs defaultValue="log">
              <Tabs.List>
                <Tabs.Tab value="meter">Meter</Tabs.Tab>
                <Tabs.Tab value="log">Log</Tabs.Tab>
                <Tabs.Tab value="routing">Routing</Tabs.Tab>
              </Tabs.List>
              <Tabs.Panel value="meter">Levels</Tabs.Panel>
              <Tabs.Panel value="log">Events</Tabs.Panel>
              <Tabs.Panel value="routing">Outputs</Tabs.Panel>
            </Tabs>
            <Accordion>
              <Accordion.Item value="a">
                <Accordion.Trigger>Signal</Accordion.Trigger>
                <Accordion.Panel>Input gain and trim.</Accordion.Panel>
              </Accordion.Item>
            </Accordion>
          </div>
        </Pair>

        <Pair name="Navigation">
          <div style={{ display: "grid", gap: "var(--echo-space-6)" }}>
            <Breadcrumb items={[{ label: "Home", href: "#home" }, { label: "Device", href: "#device" }, { label: "Input" }]} />
            <Pagination page={3} count={9} onPageChange={() => {}} />
            <Steps label="Setup" current={1} steps={["Connect", "Calibrate", "Done"]} />
          </div>
        </Pair>

        <Pair name="Banner, tags, badges">
          <div style={{ display: "grid", gap: "var(--echo-space-6)" }}>
            <Banner title="Upload failed" tone="danger">
              The file exceeds the size limit.
            </Banner>
            <div style={row}>
              <Tag removeLabel="Remove Loop" onRemove={() => {}}>
                Loop
              </Tag>
              <Tag>Draft</Tag>
              <Badge variant="accent">Rec</Badge>
              <Avatar name="Ada Lovelace" status="live" statusLabel="Live" />
            </div>
          </div>
        </Pair>

        <Pair name="Readouts">
          <div style={{ display: "grid", gap: "var(--echo-space-6)" }}>
            <div style={row}>
              <StatTile value="42" unit="ms" label="Latency" />
              <HardwareButton>Arm</HardwareButton>
            </div>
            <Table caption="Recent takes">
              <Table.Head>
                <Table.Row>
                  <Table.HeaderCell>Take</Table.HeaderCell>
                  <Table.HeaderCell align="end">Length</Table.HeaderCell>
                </Table.Row>
              </Table.Head>
              <Table.Body>
                <Table.Row>
                  <Table.Cell>Room tone</Table.Cell>
                  <Table.Cell align="end">02:41</Table.Cell>
                </Table.Row>
              </Table.Body>
            </Table>
          </div>
        </Pair>

        <section dir="rtl" lang="ar" data-testid="arabic" style={{ display: "grid", gap: "var(--echo-space-6)" }}>
          <DirectionProvider direction="rtl">
            <h2 style={{ ...label, margin: 0 }}>بالعربية</h2>
            <Banner title="تعذّر الرفع" tone="danger">
              حجم الملف أكبر من المسموح.
            </Banner>
            <Field label="اسم الجلسة" defaultValue="تسجيل الليل" />
            <div style={row}>
              <Switch defaultChecked aria-label="تشغيل" />
              <Checkbox defaultChecked aria-label="موافق" />
              <HardwareButton>تسجيل</HardwareButton>
            </div>
            <Steps label="الإعداد" current={1} steps={["الاتصال", "المعايرة", "تم"]} />
            <Slider aria-label="المستوى" defaultValue={30} />
          </DirectionProvider>
        </section>
      </div>
    </div>
  );
}
