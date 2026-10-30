"use client";

/**
 * Live theme generator: one color in → the whole library
 * relights. The seed is the SITE's seed (theme-store.ts): it relights this
 * page, the preview, and every doc, gallery and template page the visitor
 * opens next, and it survives a reload. Picking Sky and then opening the
 * Switch doc shows a sky-blue Switch — that is the promise being kept.
 *
 * Rebuilt from registry components (it was the last page still made of
 * browser-default inputs and flat inline-styled buttons): the seed is three
 * ruled rows of molded swatch + recessed Field, the presets are swatch caps,
 * the actions are HardwareButtons, and the CSS lives behind an Accordion.
 *
 * The contrast readout is the guarantee made visible: the primary label's
 * worst point, measured the way the contract test measures it, redrawn as
 * the seed moves. A seed also travels as a link (seed-link.ts); opening one
 * wears it site-wide like any other pick, and if it replaced a seed the
 * visitor had chosen, theirs stays one press away as "Yours".
 */
import { useEffect, useMemo, useState } from "react";
import { SoundProvider } from "echo-ui-core/sound";
import { contrastRatio, createEchoTheme, type EchoSeedInput } from "echo-ui-core/theme";
import {
  DEFAULT_SEED,
  SEED_PRESETS,
  STYLE_PRESETS,
  chosenSiteSeed,
  sameSeed,
  useSiteSeed,
  type Seed,
} from "@/components/site/theme-store";
import { lookOf } from "@/components/site/seeds";
import { seedFromSearch, seedLink } from "@/components/site/seed-link";
import { onDevice } from "@/components/site/device-seed";
import { formatRatio, primaryLabelContrast } from "@/components/site/label-contrast";
import { clipboardBlocked, type Copyable } from "@/components/site/clipboard-blocked";
import { designMd } from "@registry/agent/design-md";
import { Field } from "@registry/echo/field";
import { HardwareButton } from "@registry/echo/hardware-button";
import { SegmentDisplay } from "@registry/echo/segment-display";
import { Accordion } from "@registry/echo/accordion";
import "echo-ui-core/theme/material.css";
import { DeviceShowcase } from "@/components/DeviceShowcase";
import "@/components/site/tool.css";
import "./generator.css";

type Role = "accent" | "chassis" | "paper";

const ROLES: { role: Role; name: string; hint: string }[] = [
  {
    role: "accent",
    name: "Accent",
    hint: "The one lit colour — caps, glow, focus.",
  },
  {
    role: "chassis",
    name: "Chassis",
    hint: "The plastic: surfaces, caps, wells.",
  },
  {
    role: "paper",
    name: "Paper",
    hint: "The text, and the light it prints on.",
  },
];

const HEX = /^#[0-9a-f]{6}$/i;
/** A seed under "Start from": a preset, or (exact) a shared seed or the visitor's own. */
type Start = { name: string; seed: Seed; exact?: boolean };
/** WCAG AA for text this size: what the readout is held to. */
const AA = 4.5;

export default function GeneratorPage() {
  const [seed, setSeed] = useSiteSeed();
  // What is typed into each hex Field. Only a complete #RRGGBB reaches the
  // engine; a half-typed value stays in the Field and nowhere else.
  const [drafts, setDrafts] = useState<Seed>(seed);
  const [status, setStatus] = useState("");
  // A seed opened from a link, and the visitor's own if the link replaced it.
  const [shared, setShared] = useState<{ seed: Seed; yours: Seed | null } | null>(null);

  // The seed can change under the Fields — the saved one arriving after
  // hydration, a preset, another tab — and they must show it.
  useEffect(() => setDrafts(seed), [seed]);

  // Open a shared seed once, then take it out of the address bar: a reload
  // after further edits must not put the link's seed back over them.
  useEffect(() => {
    const incoming = seedFromSearch(window.location.search);
    if (!incoming) return;
    const saved = chosenSiteSeed();
    const yours = saved && !sameSeed(saved, incoming) ? saved : null;
    setSeed(incoming);
    setShared({ seed: incoming, yours });
    window.history.replaceState(null, "", window.location.pathname + window.location.hash);
    // Name the cap that holds theirs: a preset (pressed on the device the link put the site on), or the "Yours" cap added below.
    const back = yours && (SEED_PRESETS.find((p) => sameSeed(onDevice(p.seed, incoming), yours))?.name ?? "Yours");
    say(
      back
        ? `You're wearing a shared seed. To go back to yours, press ${back} under Start from.`
        : "You're wearing a shared seed. The whole site wears it now.",
      6000,
    );
    // Once, on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The page wears the site's typefaces; what you COPY is the plain library
  // theme, whose font roles are system stacks — your project does not have the
  // site's font variables, and a copied theme naming them would silently fall
  // back.
  // A style's whole look: drawn or molded, its corners and its type, under the three colours.
  const look: EchoSeedInput = useMemo(() => lookOf(seed), [seed]);
  const theme = useMemo(() => createEchoTheme(look), [look]);
  const labelRatio = primaryLabelContrast(theme.values);
  // The same label on the accent as picked, flat: what the cap would read if
  // it didn't slide.
  const flatRatio = contrastRatio(theme.values.roles.text, seed.accent);

  const setRole = (role: Role, value: string) => {
    setDrafts((d) => ({ ...d, [role]: value }));
    if (HEX.test(value)) setSeed({ ...seed, [role]: value });
  };

  function say(message: string, ms = 2400) {
    setStatus(message);
    window.setTimeout(() => setStatus((s) => (s === message ? "" : s)), ms);
  }

  const copy = async (what: Copyable, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      say(`${what} copied to the clipboard.`);
    } catch {
      // Stays up: it may be the only place the link is written out.
      setStatus(clipboardBlocked(what, text));
    }
  };

  /*
   * This seed's look as DESIGN.md, for a tool with no terminal to run init in
   * (it opens by sending one that has a terminal to init, with this seed).
   */
  const downloadDesign = () => {
    const text = designMd({ dir: "src/components/echo", seed: look, standalone: true });
    const url = URL.createObjectURL(new Blob([text], { type: "text/markdown" }));
    Object.assign(document.createElement("a"), { href: url, download: "DESIGN.md" }).click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    say("DESIGN.md downloaded: this seed's look, for a tool with no terminal.");
  };

  // A preset is worn on the device the site is on (the light key chose it); a
  // shared seed, and yours, exactly as they were.
  // A shared seed, or yours, gets a cap of its own only when no preset already is it.
  const starts: Start[] = [
    ...SEED_PRESETS,
    ...(shared && !SEED_PRESETS.some((p) => sameSeed(onDevice(p.seed, shared.seed), shared.seed))
      ? [{ name: "Shared", seed: shared.seed, exact: true }]
      : []),
    ...(shared?.yours && !SEED_PRESETS.some((p) => sameSeed(onDevice(p.seed, shared.seed), shared.yours!))
      ? [{ name: "Yours", seed: shared.yours, exact: true }]
      : []),
  ];
  const worn = (p: Start) => (p.exact ? p.seed : onDevice(p.seed, seed));
  const preset = starts.find((p) => sameSeed(worn(p), seed));
  // A style chosen on the Styles page is what these colours start from, until one of them is pressed.
  const style = STYLE_PRESETS.find((p) => p.seed.style === seed.style);
  const isDefault = sameSeed(seed, DEFAULT_SEED);

  return (
    <SoundProvider>
      <div className="tool-page echo-generator">
        <header className="tool-head">
          <p className="tool-eyebrow">Tools</p>
          <h1 className="tool-title">Theme generator</h1>
          <p className="tool-lede">
            One colour in, the whole library relights. Every surface derives
            from a three-value seed in OKLCH — the plastic, the bevels, the
            glow, the text — and stays legible at WCAG AA. What you pick here
            is worn by the whole site, so open any component and it is already
            in it.
          </p>
        </header>

        <div className="gen">
          <section className="gen__seed" aria-labelledby="gen-seed">
            <div className="gen__group">
              <h2 className="tool-label" id="gen-start">
                Start from · {preset?.name ?? style?.name ?? "Custom"}
              </h2>
              <div className="tool-presets" role="group" aria-labelledby="gen-start">
                {starts.map((p) => (
                  <button
                    key={p.name}
                    type="button"
                    className="tool-preset"
                    aria-pressed={preset?.name === p.name}
                    onClick={() => setSeed(worn(p))}
                  >
                    <span
                      className="tool-preset__chip"
                      style={{ background: p.seed.accent }}
                      aria-hidden="true"
                    />
                    {p.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="gen__group">
              <h2 className="tool-label" id="gen-seed">
                Seed
              </h2>
              <ul className="gen__rows">
                {ROLES.map(({ role, name, hint }) => (
                  <li key={role} className="gen__row">
                    <span className="gen__name">
                      {name}
                      <span className="gen__hint">{hint}</span>
                    </span>
                    {/* A half-typed hex snaps back to the colour in use on blur
                        (React's blur bubbles, and Field does not forward it). */}
                    <span
                      className="gen__ctl"
                      onBlur={() =>
                        setDrafts((d) => ({ ...d, [role]: seed[role] }))
                      }
                    >
                      <label
                        className="tool-swatch"
                        style={{ background: seed[role] }}
                      >
                        <input
                          type="color"
                          aria-label={`${name} colour picker`}
                          value={seed[role]}
                          onChange={(e) => setRole(role, e.target.value)}
                        />
                      </label>
                      <Field
                        mono
                        aria-label={`${name} hex`}
                        value={drafts[role]}
                        onValueChange={(v) => setRole(role, v.trim())}
                      />
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="gen__group">
              <h2 className="tool-label" id="gen-contrast">
                Contrast
              </h2>
              <div className="gen__contrast">
                <SegmentDisplay
                  label="Button label"
                  value={formatRatio(labelRatio)}
                  unit=":1"
                />
                <p className="gen__contrast-note">
                  {labelRatio >= AA ? (
                    <>
                      The label on a primary button, at the worst point of its
                      gradient. AA asks for {AA}:1, and Echo holds it for any
                      accent you pick.
                    </>
                  ) : (
                    <>
                      Under {AA}:1. This chassis and paper are too close for the
                      label to read: a pale chassis wants a dark paper, and a
                      dark chassis a light one.
                    </>
                  )}
                </p>
                {/* Only when the accent as picked would fail: the cap sits
                    just past AA, so beside a flat accent that already
                    passes, the comparison reads backwards. */}
                {flatRatio < AA && (
                  <p className="gen__contrast-note gen__contrast-note--dim">
                    On your accent as picked, the same label would read{" "}
                    {formatRatio(flatRatio)}:1. The label keeps the one text
                    colour; the button&rsquo;s plastic slides along your
                    accent&rsquo;s ramp until it reads.
                  </p>
                )}
              </div>
            </div>

            <div className="gen__actions">
              <HardwareButton
                variant="primary"
                onClick={() => copy("CSS", theme.css)}
              >
                Copy CSS
              </HardwareButton>
              <HardwareButton
                onClick={() => copy("Seed", JSON.stringify(look, null, 2))}
              >
                Copy seed
              </HardwareButton>
              <HardwareButton
                onClick={() => copy("Link", seedLink(window.location.origin, seed))}
              >
                Copy link
              </HardwareButton>
              <HardwareButton onClick={downloadDesign}>Download DESIGN.md</HardwareButton>
              <HardwareButton
                variant="ghost"
                disabled={isDefault}
                onClick={() => {
                  setSeed(DEFAULT_SEED);
                  say("The site is back on the Nawwara seed.");
                }}
              >
                Reset to Nawwara
              </HardwareButton>
            </div>
            <p className="tool-status" role="status">
              {status}
            </p>
          </section>

          <section className="gen__preview echo-preview" aria-label="Preview">
            <DeviceShowcase />
          </section>
        </div>

        <Accordion multiple={false} className="gen__css">
          <Accordion.Item value="css">
            <Accordion.Trigger>Generated CSS</Accordion.Trigger>
            <Accordion.Panel>
              <pre className="gen__code">{theme.css}</pre>
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion>
      </div>
    </SoundProvider>
  );
}
