import { test } from "node:test";
import assert from "node:assert/strict";

import { sound, SOUND_NAMES, type SoundRecipe } from "./sound";
import { SynthBackend, jitterRecipe, type PlayContext } from "./backend";

/* ----------------------------------------------------------- token taxonomy */

test("every sound token is a valid, dry, short hardware recipe", () => {
  const waves = new Set(["square", "triangle", "sine", "sawtooth"]);
  for (const name of SOUND_NAMES) {
    const r = sound[name];
    assert.ok(waves.has(r.wave), `${name}: bad wave ${r.wave}`);
    const freqs = Array.isArray(r.freq) ? r.freq : [r.freq];
    assert.ok(freqs.length > 0 && freqs.every((f) => f > 0), `${name}: bad freq`);
    assert.ok(r.decay > 0 && r.decay <= 0.4, `${name}: decay out of hardware range`);
    assert.ok(r.gain > 0 && r.gain <= 1, `${name}: gain out of range`);
    if ("bend" in r) assert.equal(typeof r.bend, "number");
  }
});

/* ------------------------------------------------------------- jitter */

test("jitter is identity at rng=0.5 and bounded at extremes", () => {
  const base: SoundRecipe = { wave: "square", freq: 1000, decay: 0.03, gain: 0.1 };

  const mid = jitterRecipe(base, () => 0.5);
  assert.equal(mid.freq, 1000);
  assert.ok(Math.abs((mid.gain as number) - 0.1) < 1e-9);

  const hi = jitterRecipe(base, () => 1);
  assert.ok(Math.abs((hi.freq as number) - 1030) < 1e-6, "freq +3%");
  assert.ok(Math.abs((hi.gain as number) - 0.11) < 1e-9, "gain +10%");

  const lo = jitterRecipe(base, () => 0);
  assert.ok(Math.abs((lo.freq as number) - 970) < 1e-6, "freq -3%");
});

test("jitter maps over arpeggio frequency arrays", () => {
  const arp: SoundRecipe = { wave: "square", freq: [500, 600, 700], decay: 0.05, gain: 0.1 };
  const j = jitterRecipe(arp, () => 1) as { freq: number[] };
  assert.equal(j.freq.length, 3);
  assert.ok(Math.abs(j.freq[0]! - 515) < 1e-6);
});

/* ----------------------------------------------- SynthBackend scheduling */

class FakeParam {
  events: Array<[string, number, number]> = [];
  setValueAtTime(v: number, t: number) {
    this.events.push(["set", v, t]);
    return this;
  }
  linearRampToValueAtTime(v: number, t: number) {
    this.events.push(["linear", v, t]);
    return this;
  }
  exponentialRampToValueAtTime(v: number, t: number) {
    this.events.push(["exp", v, t]);
    return this;
  }
}

class FakeOsc {
  type = "";
  frequency = new FakeParam();
  started = -1;
  stopped = -1;
  onended: (() => void) | null = null;
  connect() {}
  disconnect() {}
  start(t: number) {
    this.started = t;
  }
  stop(t: number) {
    this.stopped = t;
  }
}

class FakeGain {
  gain = new FakeParam();
  connect() {}
  disconnect() {}
}

class FakeCtx {
  currentTime = 0;
  oscs: FakeOsc[] = [];
  createOscillator() {
    const o = new FakeOsc();
    this.oscs.push(o);
    return o;
  }
  createGain() {
    return new FakeGain();
  }
}

function playInto(recipe: SoundRecipe) {
  const ctx = new FakeCtx();
  const destination = new FakeGain();
  new SynthBackend().play(recipe, {
    ctx: ctx as unknown as PlayContext["ctx"],
    destination: destination as unknown as AudioNode,
  });
  return ctx;
}

test("single-freq recipe schedules one oscillator with an attack/decay envelope", () => {
  const ctx = playInto({ wave: "square", freq: 1800, decay: 0.04, gain: 0.12 });
  assert.equal(ctx.oscs.length, 1);
  const osc = ctx.oscs[0]!;
  assert.equal(osc.type, "square");
  assert.equal(osc.started, 0);
  assert.ok(osc.stopped > 0.04);
});

test("arpeggio recipe schedules one oscillator per step, spaced in time", () => {
  const ctx = playInto({ wave: "square", freq: [523, 659, 784], decay: 0.1, gain: 0.14 });
  assert.equal(ctx.oscs.length, 3);
  assert.equal(ctx.oscs[0]!.started, 0);
  assert.ok(ctx.oscs[1]!.started > ctx.oscs[0]!.started);
  assert.ok(ctx.oscs[2]!.started > ctx.oscs[1]!.started);
});

test("bend applies a linear frequency ramp; no bend leaves frequency steady", () => {
  const bent = playInto({ wave: "square", freq: 1800, decay: 0.04, gain: 0.12, bend: -400 });
  assert.ok(bent.oscs[0]!.frequency.events.some(([k]) => k === "linear"));

  const flat = playInto({ wave: "square", freq: 1400, decay: 0.03, gain: 0.08 });
  assert.ok(!flat.oscs[0]!.frequency.events.some(([k]) => k === "linear"));
});

/* --------------------------------------------------------- SSR safety */

test("importing the sound engine touches no browser globals at module scope", async () => {
  // Runs in Node with no window/AudioContext — a throw here means module-scope access.
  const mod = await import("./index");
  assert.equal(typeof mod.SoundProvider, "function");
  assert.equal(typeof mod.useSound, "function");
  assert.equal(typeof mod.SynthBackend, "function");
  assert.ok(mod.SOUND_NAMES.includes("press"));
});
