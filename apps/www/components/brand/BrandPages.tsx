"use client";

/**
 * The brand pages (Logo & identity,
 * Logo use, The creature, Movement set, Brand world, Texture & materials,
 * Voice & tone).
 *
 * Two rules carried into the port:
 * - text lists are ruled rows, not grey cards — a principle is a line of
 *   text, and a card under each one was detail the content did not need;
 * - the controls are the library's (Segmented, HardwareButton), so the brand
 *   pages consume the same components everything else does.
 */
import { useState, type ReactNode } from "react";
import { SoundProvider } from "echo-ui-core/sound";
import { Segmented } from "@registry/echo/segmented";
import { ShaderField } from "@registry/echo/shader-field";
import "echo-ui-core/theme/material.css";
import { getBrandPage } from "./brand-manifest";
import { Creature, type Mood } from "./Creature";
import { Actor, BEHAVIORS } from "./Actor";
import { BrandGrain } from "./Grain";
import {
  Flower,
  FusedLockup,
  IconMark,
  LogoBoot,
  LogoClearspace,
  MorphStrip,
  SeparatedLockup,
  StackedLockup,
  WordmarkLogo,
} from "./Logo";
import { aura, BRAND_REFERENCE, creature, neutral } from "./tokens";
import { BLOOMS, DEFAULT_BLOOM, bloomEnd } from "./bloom";
import "./brand.css";

/* --- shared pieces ------------------------------------------------------ */

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="brand-block" aria-label={title}>
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function Rules({ items }: { items: readonly (readonly [string, string])[] }) {
  return (
    <ul className="brand-rules">
      {items.map(([term, def]) => (
        <li key={term}>
          <span className="brand-rules__term">{term}</span>
          <span className="brand-rules__def">{def}</span>
        </li>
      ))}
    </ul>
  );
}

function Specimen({ label, children }: { label: string; children: ReactNode }) {
  return (
    <figure className="brand-specimen" style={{ margin: 0 }}>
      <div className="brand-specimen__art">{children}</div>
      <figcaption className="brand-specimen__label">{label}</figcaption>
    </figure>
  );
}

function Tile({ ok, bg, caption, children }: { ok: boolean; bg: string; caption: string; children: ReactNode }) {
  return (
    <figure className="brand-tile">
      <div className="brand-tile__art" style={{ background: bg }}>
        {children}
        <span className="brand-tile__verdict" data-ok={ok ? "" : undefined} aria-hidden="true">
          {ok ? "✓" : "✕"}
        </span>
      </div>
      <figcaption>
        <span className="sr-only">{ok ? "Do: " : "Don’t: "}</span>
        {caption}
      </figcaption>
    </figure>
  );
}

/* --- Logo & identity ---------------------------------------------------- */

function Identity() {
  const [bloom, setBloom] = useState(0);
  const variant = BLOOMS[bloom] ?? DEFAULT_BLOOM;
  return (
    <>
      <div className="brand-stage">
        <LogoBoot H={64} bloom={variant.id} />
        <Segmented options={BLOOMS.map((b) => b.name)} value={bloom} onValueChange={setBloom} aria-label="Bloom" />
        <span className="brand-stage__caption">Fused signature · pick a bloom, or press the logo to replay</span>
      </div>

      <Block title="The bloom · seed → bud → eight petals">
        <MorphStrip bloom={variant.id} />
        <p className="brand-note">
          The flower grows out of its own drawing. Each of the mark’s eight petals is a circle, so a seed swells and
          every petal buds out of its rim on a spring, and the last frame is the hand-drawn mark itself. The shape
          only ever grows, and nothing crossfades.
        </p>
      </Block>

      <Block title="Bloom variants">
        <Rules
          items={BLOOMS.map((b) => [
            b === DEFAULT_BLOOM ? `${b.name} · default` : b.name,
            `${b.note} ${bloomEnd(b).toFixed(2)}s.`,
          ])}
        />
        <p className="brand-note">
          Every variant starts from nothing and ends on the same eight petals; only the order and the springs change.
        </p>
      </Block>

      <Block title="The lockup family">
        <div className="brand-specimens">
          <Specimen label="Fused">
            <FusedLockup H={42} />
          </Specimen>
          <Specimen label="Separated">
            <SeparatedLockup M={40} />
          </Specimen>
          <Specimen label="Stacked">
            <StackedLockup M={48} />
          </Specimen>
          <Specimen label="Wordmark">
            <WordmarkLogo cap={28} />
          </Specimen>
        </div>
      </Block>

      <Block title="Icon · dark + light masters">
        <div className="brand-specimens" style={{ alignItems: "center" }}>
          <IconMark size={80} surface="dark" />
          <IconMark size={80} surface="light" />
          <IconMark size={52} surface="dark" />
          <IconMark size={38} surface="dark" />
        </div>
      </Block>

      <Block title="Rendering tiers">
        <div className="brand-specimens">
          <Specimen label="Expressive · >64">
            <Flower m={72} tier="expressive" />
          </Specimen>
          <Specimen label="Standard · 24–64">
            <Flower m={48} tier="standard" />
          </Specimen>
          <Specimen label="Micro · <24 · no eyes">
            <Flower m={40} tier="micro" />
          </Specimen>
        </div>
      </Block>

      <Block title="Clear space">
        <div className="brand-specimens" style={{ alignItems: "center" }}>
          <LogoClearspace H={38} />
          <p className="brand-note" style={{ flex: "1 1 14rem" }}>
            0.5·H around the fused lockup, 0.5·M around the mark. The H → O gap is the letter gap, and the flower-O is
            1.3·H.
          </p>
        </div>
      </Block>
    </>
  );
}

/* --- Logo use ----------------------------------------------------------- */

const BUSY = `linear-gradient(135deg, ${aura.raspberry[3]}, ${aura.lavender[3]} 60%, ${aura.peach[3]})`;

function LogoUse() {
  return (
    <>
      <Block title="Choose the mark by its background">
        <div className="brand-tiles">
          <Tile ok bg={neutral.void} caption="Neutral dark → the full-colour mark.">
            <Flower m={54} surface="dark" />
          </Tile>
          <Tile ok bg={neutral.cream} caption="Neutral light → the full-colour mark.">
            <Flower m={54} surface="light" />
          </Tile>
          <Tile ok bg={aura.raspberry[3]} caption="Any colour, photo or aura → the white knockout.">
            <Flower m={54} tone="white" />
          </Tile>
          <Tile ok bg={aura.peach[2]} caption="A pale colour where white is too faint → ink.">
            <Flower m={54} tone="ink" />
          </Tile>
        </div>
      </Block>

      <Block title="Do">
        <div className="brand-tiles">
          <Tile ok bg={aura.raspberry[4]} caption="White lockup on a saturated brand ground.">
            <FusedLockup H={26} tone="white" />
          </Tile>
          <Tile ok bg={neutral.ink} caption="Full-colour lockup on neutral dark.">
            <FusedLockup H={26} />
          </Tile>
          <Tile ok bg={BUSY} caption="The white knockout stays legible on busy grain.">
            <Flower m={54} tone="white" />
          </Tile>
        </div>
      </Block>

      <Block title="Don’t">
        <div className="brand-tiles">
          <Tile ok={false} bg={aura.raspberry[3]} caption="Don’t put the colour mark on colour — it vanishes.">
            <Flower m={54} surface="light" />
          </Tile>
          <Tile ok={false} bg={BUSY} caption="Don’t leave it full-colour on a busy ground.">
            <Flower m={54} surface="light" />
          </Tile>
          <Tile ok={false} bg={neutral.graphite} caption="Don’t recolour the mark to another hue.">
            <Flower m={54} style={{ filter: "hue-rotate(135deg) saturate(1.3)" }} />
          </Tile>
          <Tile ok={false} bg={neutral.graphite} caption="Don’t stretch or distort it.">
            <Flower m={54} style={{ transform: "scaleX(1.7)" }} />
          </Tile>
          <Tile ok={false} bg={neutral.graphite} caption="Don’t rotate the mark.">
            <Flower m={54} style={{ transform: "rotate(18deg)" }} />
          </Tile>
          <Tile ok={false} bg={neutral.graphite} caption="Don’t add shadows, glows or outlines.">
            <Flower
              m={54}
              style={{ filter: `drop-shadow(0 0 9px ${creature.livePink}) drop-shadow(0 0 3px #fff)` }}
            />
          </Tile>
        </div>
      </Block>

      <Block title="Rules">
        <Rules
          items={[
            ["Neutral grounds only", "Full colour lives on neutral dark or light. On colour, a photo or the aura: white — ink on pale colours."],
            ["The eyes are the mark", "Never recolour or remove them. In mono they knock out so they stay legible."],
            ["Size and space", "Keep 0.5·H of clear space. Below 24px use the Micro tier — solid, no eyes."],
            ["One canonical Echo", "Never rotate, stretch, add effects, or redraw the mark."],
          ]}
        />
      </Block>
    </>
  );
}

/* --- The creature ------------------------------------------------------- */

const MOODS: readonly Mood[] = ["watching", "resting"];

function CreaturePage() {
  const [mood, setMood] = useState(0);
  return (
    <>
      <div className="brand-stage">
        <Creature size={170} mood={MOODS[mood]} />
        <Segmented options={["Watching", "Resting"]} value={mood} onValueChange={setMood} aria-label="Mood" />
        <span className="brand-stage__caption">Move your cursor — Echo watches</span>
      </div>

      <Block title="Colour">
        <Rules
          items={[
            [
              "Body",
              `The seed's accent: Echo's purple on the default seed. The creature was drawn in raspberry (${BRAND_REFERENCE.creature.body}, its live fill ${BRAND_REFERENCE.creature.livePink}, its glow ${BRAND_REFERENCE.creature.aura}), and every seed relights all three.`,
            ],
            ["Eyes", `${BRAND_REFERENCE.creature.eye}. Never recoloured, resized or respaced — they are what reads on any ground.`],
            [
              "Themes",
              "Echo wears the seed like everything else: pick Sky and the creature, the mark and the auras turn sky blue with the caps, wells and rails. Only the eyes stay white.",
            ],
          ]}
        />
      </Block>

      <Block title="Behaviour set">
        <Rules
          items={[
            ["Breathe", "A slow idle scale, deeper when resting."],
            ["Look", "The eyes lead: they follow the cursor on a quick spring and glance around when it goes still, and the body leans after them."],
            ["Wander + sway", "Never quite still: a slow drift and sway that never stops, leaning toward the cursor."],
            ["Blink", "At random, with the occasional double-blink."],
            ["Rest", "Paused means sleepy: the lids droop, the breath slows, the eyes settle low. Waking is a small perk and a double blink."],
          ]}
        />
        <p className="brand-note">
          Composed, never bouncy: small amplitudes on slow springs, no squash-and-stretch. A change of mood carries on
          from wherever Echo is. Under reduced motion it holds one still frame.
        </p>
      </Block>
    </>
  );
}

/* --- Movement set ------------------------------------------------------- */

function Movement() {
  const [index, setIndex] = useState(0);
  const [current] = BEHAVIORS[index] ?? BEHAVIORS[0]!;
  return (
    <>
      <div className="brand-stage">
        <Actor size={210} behavior={current} />
        <Segmented
          options={BEHAVIORS.map(([b]) => b)}
          value={index}
          onValueChange={setIndex}
          aria-label="Behaviour"
        />
      </div>

      <Block title="Every behaviour, live">
        <div className="brand-grid">
          {BEHAVIORS.map(([b, desc]) => (
            <figure key={b} className="brand-grid__item">
              <div className="brand-grid__stage">
                <Actor size={120} behavior={b} />
              </div>
              <figcaption style={{ display: "grid", gap: "var(--echo-space-2)" }}>
                <span className="brand-grid__name">{b}</span>
                <span className="brand-grid__desc">{desc}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </Block>

      <Block title="Legs read on both surfaces">
        <div className="brand-specimens">
          <figure className="brand-specimen" style={{ margin: 0 }}>
            <div className="brand-specimen__art" style={{ background: neutral.void }}>
              <Actor size={120} behavior="walk" surface="dark" />
            </div>
            <figcaption className="brand-specimen__label">On dark · cream legs</figcaption>
          </figure>
          <figure className="brand-specimen" style={{ margin: 0 }}>
            <div className="brand-specimen__art" style={{ background: neutral.cream }}>
              <Actor size={120} behavior="walk" surface="light" />
            </div>
            <figcaption className="brand-specimen__label">On light · ink legs</figcaption>
          </figure>
        </div>
        <p className="brand-note">
          Legs are surface-adaptive ink — cream on dark, near-black on light — so they never disappear into the ground.
          Every behaviour falls back to a single composed pose under prefers-reduced-motion.
        </p>
      </Block>
    </>
  );
}

/* --- Brand world -------------------------------------------------------- */

function World() {
  return (
    <>
      <BrandGrain tone="warm" className="brand-poster">
        <div className="brand-poster__inner">
          <div className="brand-poster__top">
            <span className="brand-poster__stamp">Echo · est 2025</span>
            <IconMark size={44} surface="light" radius={12} />
          </div>
          <p className="brand-display">
            Press it.
            <br />
            Feel it land.
          </p>
          <p className="brand-poster__foot">Components you can feel — for the working hour.</p>
        </div>
      </BrandGrain>

      <Block title="Cool register">
        <BrandGrain tone="cool" className="brand-poster" style={{ height: "10rem" }} />
      </Block>

      <Block title="Made of light">
        <div className="brand-shader">
          <ShaderField />
          <div className="brand-shader__copy">
            <p className="brand-display">Made of light.</p>
          </div>
        </div>
        <p className="brand-note">
          The ShaderField component is the grain law made live — domain-warped noise in the accent ramp with animated
          film grain. For marketing heroes and loading moments; never behind product text.
        </p>
      </Block>

      <Block title="Anti-clone">
        <Rules
          items={[
            ["The genre", "Grainy gradient + big type is a genre now. Borrow the texture language."],
            ["What makes it ours", "The flower creature and the tactile device — the two things the genre does not have."],
          ]}
        />
      </Block>
    </>
  );
}

/* --- Texture & materials ------------------------------------------------ */

function Materials() {
  return (
    <>
      <Block title="Grain gradient — the brand texture">
        <div className="brand-specimens" style={{ alignItems: "stretch" }}>
          <BrandGrain tone="warm" className="brand-poster" style={{ width: "min(16rem, 100%)", height: "9rem" }} />
          <BrandGrain tone="cool" className="brand-poster" style={{ width: "min(16rem, 100%)", height: "9rem" }} />
        </div>
        <p className="brand-note">
          Warm (the brand hue into a warm companion) and cool (a cool companion into the brand hue). Marketing gets the
          full field; product surfaces get a grain whisper; the device keeps its own matte speckle. The field relights with
          the seed like everything else; the library’s GrainField is its one-ramp version.
        </p>
      </Block>

      <Block title="Molded materials">
        <div className="brand-materials">
          <div className="brand-material">
            <div
              className="brand-material__chip"
              style={{
                background:
                  "linear-gradient(155deg, var(--echo-cap) 0%, var(--echo-surface) 42%, color-mix(in oklab, var(--echo-surface) 70%, var(--echo-shade-ink, black)) 100%)",
                boxShadow:
                  "inset 0 1.5px 0 rgba(255,255,255,0.07), inset 0 -3px 8px color-mix(in oklab, var(--echo-cast-ink, var(--echo-shade-ink, black)) calc(0.55 * var(--echo-shade, 1) * 100%), transparent), inset 0 0 0 1px color-mix(in oklab, var(--echo-cast-ink, var(--echo-shade-ink, black)) 40.0%, transparent), 0 18px 30px -16px color-mix(in oklab, var(--echo-cast-ink, var(--echo-shade-ink, black)) calc(0.75 * var(--echo-shade, 1) * 100%), transparent)",
              }}
            />
            <span className="brand-material__label">chassis</span>
          </div>
          <div className="brand-material">
            <div
              className="brand-material__chip"
              style={{
                background: "linear-gradient(160deg, color-mix(in oklab, var(--echo-well) 80%, var(--echo-shade-ink, black)), #0e0b11)",
                boxShadow: "inset 0 3px 7px color-mix(in oklab, var(--echo-cast-ink, var(--echo-shade-ink, black)) calc(0.9 * var(--echo-shade, 1) * 100%), transparent), inset 0 -1px 0 rgba(255,255,255,0.05)",
              }}
            />
            <span className="brand-material__label">screen well</span>
          </div>
          <div className="brand-material">
            <div
              className="brand-material__chip"
              style={{
                background:
                  "linear-gradient(180deg, var(--echo-cap-highlight) 0%, var(--echo-cap) 40%, var(--echo-cap) 62%, var(--echo-cap-shadow) 100%)",
                boxShadow:
                  "inset 0 1.5px 0 rgba(255,255,255,0.42), inset 0 -3px 4px color-mix(in oklab, var(--echo-cast-ink, var(--echo-shade-ink, black)) calc(0.5 * var(--echo-shade, 1) * 100%), transparent), 0 4px 0 var(--echo-seam), 0 9px 14px color-mix(in oklab, var(--echo-cast-ink, var(--echo-shade-ink, black)) calc(0.55 * var(--echo-shade, 1) * 100%), transparent)",
              }}
            />
            <span className="brand-material__label">button cap</span>
          </div>
          <div className="brand-material">
            <div
              className="brand-material__chip"
              style={{
                background:
                  "linear-gradient(180deg, var(--echo-primary-cap-top) 0%, var(--echo-primary-cap-mid) 45%, var(--echo-primary-cap-base) 100%)",
                boxShadow:
                  "inset 0 1px 0 rgba(255,255,255,0.45), inset 0 -2px 4px color-mix(in oklab, var(--echo-cast-ink, var(--echo-shade-ink, black)) calc(0.35 * var(--echo-shade, 1) * 100%), transparent), 0 4px 0 var(--echo-accent-pressed), 0 8px 20px color-mix(in srgb, var(--echo-accent-glow) 40%, transparent)",
              }}
            />
            <span className="brand-material__label">lit cap</span>
          </div>
        </div>
        <p className="brand-note">
          These four are --echo-* roles, so they relight with the seed. The library ships them as Panel (raised and
          screen) and HardwareButton; the full overlay set lives in <a href="/gallery/textures">Textures</a>.
        </p>
      </Block>

      <Block title="Rules">
        <Rules
          items={[
            ["One key light", "Top-left. Every highlight and shadow agrees with it."],
            ["Colour is light, not paint", "The glass is neutral; colour only arrives as Echo’s aura, in the seed’s hue. Never tint the glass."],
            ["Nothing is a flat fill", "Matte speckle on hardware, dot-matrix on the screen, spray-grain in marketing."],
          ]}
        />
      </Block>
    </>
  );
}

/* --- Voice & tone ------------------------------------------------------- */

function Voice() {
  return (
    <>
      <Block title="Principles">
        <Rules
          items={[
            ["Companion, not coach", "“I’m watching.” — not “You must focus now!”"],
            ["Quiet confidence", "Short, plain, lowercase-friendly. No hype, no exclamation pile-ups."],
            ["Notice, don’t nag", "Reflect state (“resting”, “saved”) rather than command."],
            ["Warm and concrete", "“Components you can feel,” not “UI, reimagined.”"],
          ]}
        />
      </Block>

      <Block title="Say / not">
        <ul className="brand-say">
          <li>
            <span className="brand-say__mark" aria-hidden="true">✓</span>
            <span><span className="sr-only">Say: </span>Press it. Feel it land.</span>
          </li>
          <li data-no="">
            <span className="brand-say__mark" aria-hidden="true">✕</span>
            <span><span className="sr-only">Not: </span>Unlock your UI potential today!</span>
          </li>
          <li>
            <span className="brand-say__mark" aria-hidden="true">✓</span>
            <span><span className="sr-only">Say: </span>Saved. Changes apply to this device only.</span>
          </li>
          <li data-no="">
            <span className="brand-say__mark" aria-hidden="true">✕</span>
            <span><span className="sr-only">Not: </span>Success!!! Your settings have been updated!</span>
          </li>
        </ul>
      </Block>
    </>
  );
}

/* --- the page ----------------------------------------------------------- */

const BODIES: Record<string, () => ReactNode> = {
  identity: Identity,
  "logo-use": LogoUse,
  creature: CreaturePage,
  movement: Movement,
  world: World,
  materials: Materials,
  voice: Voice,
};

export function BrandPageView({ slug }: { slug: string }) {
  const page = getBrandPage(slug);
  const Body = BODIES[slug];
  if (!page || !Body) return null;
  return (
    <SoundProvider>
      <article className="brand-page">
        <header className="brand-page__head">
          <p className="brand-eyebrow">Brand</p>
          <h1 className="brand-page__title">{page.title}</h1>
          <p className="brand-page__lede">{page.lede}</p>
        </header>
        <Body />
      </article>
    </SoundProvider>
  );
}
