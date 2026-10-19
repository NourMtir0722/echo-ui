"use client";

/**
 * The sound audition bench: tune each synth recipe by ear —
 * freq / decay / gain / bend — then copy it back into sound.ts.
 *
 * Rebuilt from registry components (it was native blue range inputs and flat
 * inline-styled buttons in nine grey cards): the master section is a Switch
 * and a Slider, every parameter is the library's Slider, every action a
 * HardwareButton, and the recipes are ruled rows rather than cards.
 *
 * One wrinkle: every Echo control makes its own sound — the Play cap clicks,
 * a Slider ticks per step. On a bench whose whole job is listening, that
 * feedback would land on top of the very sound being tuned. So the recipe
 * list renders inside ONE SoundProvider with a silent backend: its controls'
 * own sounds go nowhere, while `play` is taken from the outer provider before
 * the silent one begins and passed down, so auditions sound normally. One
 * provider, not one per row — each provider creates its own AudioContext on
 * first press, and browsers cap how many can be live. The master controls
 * stay outside it, so the gain slider's ticks still tell you the level.
 */
import { useState } from "react";
import { AlertDialog } from "@registry/echo/alert-dialog";
import { HardwareButton } from "@registry/echo/hardware-button";
import { Slider } from "@registry/echo/slider";
import { Switch } from "@registry/echo/switch";
import {
  SoundProvider,
  useSound,
  sound,
  SOUND_NAMES,
  type SoundBackend,
  type SoundName,
  type SoundRecipe,
} from "echo-ui-core/sound";
import "echo-ui-core/theme/material.css";
import "@/components/site/tool.css";
import "./audition.css";

/** Swallows every sound — for caps whose own click would mask the audition. */
const silent: SoundBackend = { name: "silent", play() {} };

export default function AuditionPage() {
  return (
    <SoundProvider defaultMuted={false}>
      <Audition />
    </SoundProvider>
  );
}

function Audition() {
  const { muted, setMuted, masterGain, setMasterGain, play } = useSound();
  return (
    <div className="tool-page">
      <header className="tool-head">
        <p className="tool-eyebrow">Tools</p>
        <h1 className="tool-title">Sound audition</h1>
        <p className="tool-lede">
          Tune each recipe by ear, then copy it back into <code>sound.ts</code>.
          Dry, short, hardware — square and triangle bias, no reverb. Audio
          starts on your first press.
        </p>
      </header>

      <section className="aud-master" aria-labelledby="aud-master">
        <h2 className="tool-label" id="aud-master">
          Master
        </h2>
        <div className="aud-master__row">
          <label className="aud-master__switch">
            <Switch
              checked={!muted}
              onCheckedChange={(on) => setMuted(!on)}
              aria-label="Sound"
            />
            <span>{muted ? "Sound off" : "Sound on"}</span>
          </label>
          <div className="aud-param aud-param--master">
            <span className="aud-param__name">Gain</span>
            <Slider
              value={Math.round(masterGain * 100)}
              onValueChange={(v) => setMasterGain(v / 100)}
              min={0}
              max={100}
              step={1}
              aria-label="Master gain"
            />
            <span className="tool-value">{masterGain.toFixed(2)}</span>
          </div>
        </div>
      </section>

      <section aria-labelledby="aud-recipes">
        <h2 className="tool-label" id="aud-recipes">
          Recipes · {SOUND_NAMES.length}
        </h2>
        <SoundProvider backend={silent}>
          <ul className="aud-list">
            {SOUND_NAMES.map((name) => (
              <RecipeRow key={name} name={name} play={play} />
            ))}
          </ul>
        </SoundProvider>
      </section>
    </div>
  );
}

function PlayIcon() {
  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden
    >
      <path d="M4 3l9 5-9 5z" />
    </svg>
  );
}

function RecipeRow({
  name,
  play,
}: {
  name: SoundName;
  play: (recipe: SoundRecipe) => void;
}) {
  const [recipe, setRecipe] = useState<SoundRecipe>({ ...sound[name] });
  const [status, setStatus] = useState("");

  const isArp = Array.isArray(recipe.freq);
  const set = (patch: Partial<SoundRecipe>) =>
    setRecipe((r) => ({ ...r, ...patch }));
  const json = JSON.stringify(recipe);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(json);
      setStatus("Copied.");
    } catch {
      setStatus("Clipboard blocked — the recipe is printed below.");
    }
    window.setTimeout(() => setStatus(""), 1800);
  };

  return (
    <li className="aud-row">
      <div className="aud-row__id">
        <HardwareButton
          iconOnly
          aria-label={`Play ${name}`}
          icon={<PlayIcon />}
          // Pointer-down, not click: the sound should land with the finger,
          // the way every other Echo press does.
          onPointerDown={() => play(recipe)}
          onKeyDown={(e) => {
            if ((e.key === "Enter" || e.key === " ") && !e.repeat) play(recipe);
          }}
        />
        <span className="aud-row__name">
          {name}
          <span className="aud-row__wave">{recipe.wave}</span>
        </span>
      </div>

      <div className="aud-row__params">
        {isArp ? (
          <div className="aud-param">
            <span className="aud-param__name">Notes</span>
            <span className="aud-param__arp">
              {(recipe.freq as number[]).join(" · ")} Hz
            </span>
          </div>
        ) : (
          <Param
            label="Freq"
            name={name}
            min={80}
            max={3000}
            step={10}
            value={recipe.freq as number}
            onChange={(v) => set({ freq: v })}
            format={(v) => `${v} Hz`}
          />
        )}
        <Param
          label="Decay"
          name={name}
          min={10}
          max={400}
          step={5}
          value={Math.round(recipe.decay * 1000)}
          onChange={(v) => set({ decay: v / 1000 })}
          format={(v) => `${(v / 1000).toFixed(3)} s`}
        />
        <Param
          label="Gain"
          name={name}
          min={0}
          max={300}
          step={5}
          value={Math.round(recipe.gain * 1000)}
          onChange={(v) => set({ gain: v / 1000 })}
          format={(v) => (v / 1000).toFixed(3)}
        />
        <Param
          label="Bend"
          name={name}
          min={-600}
          max={600}
          step={10}
          value={recipe.bend ?? 0}
          onChange={(v) => set({ bend: v === 0 ? undefined : v })}
          format={(v) => `${v > 0 ? "+" : ""}${v} Hz`}
        />
      </div>

      <div className="aud-row__actions">
        <HardwareButton size="sm" onClick={copy}>
          Copy
        </HardwareButton>
        {/*
          Reset throws away tuning you cannot get back — the bench keeps no
          history — so it asks first.
        */}
        <AlertDialog
          trigger={
            <HardwareButton size="sm" variant="ghost">
              Reset
            </HardwareButton>
          }
          title={`Reset the ${name} recipe?`}
          description="Your tuning for this sound goes back to the shipped values. The bench keeps no history, so this cannot be undone."
          confirmLabel="Reset"
          onConfirm={() => setRecipe({ ...sound[name] })}
        />
        <span className="tool-status" role="status">
          {status}
        </span>
      </div>

      {/*
        Minified JSON has no spaces, so without `overflow-wrap:
        anywhere` it has no break opportunity and pushes a phone page open.
      */}
      <code className="aud-row__json">{json}</code>
    </li>
  );
}

function Param({
  label,
  name,
  min,
  max,
  step,
  value,
  onChange,
  format,
}: {
  label: string;
  name: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
  format: (v: number) => string;
}) {
  return (
    <div className="aud-param">
      <span className="aud-param__name" aria-hidden="true">
        {label}
      </span>
      <Slider
        value={value}
        onValueChange={onChange}
        min={min}
        max={max}
        step={step}
        aria-label={`${name} ${label.toLowerCase()}`}
      />
      <span className="tool-value">{format(value)}</span>
    </div>
  );
}
