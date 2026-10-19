import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToString } from "react-dom/server";

import { HAPTIC_FOR_SOUND, HAPTIC_NAMES, haptic, vibrate } from "./haptics";
import { SOUND_NAMES } from "./sound";
import { SoundProvider, useSound, type SoundContextValue, type SoundProviderProps } from "./sound-provider";

/**
 * Haptics: a phone buzzes for a choice, a completion, a warning or an error,
 * never for a plain press, and not while the person is somewhere else.
 */
type Globals = Record<"navigator" | "matchMedia" | "window" | "document", unknown>;
const saved = Object.fromEntries(
  (["navigator", "matchMedia", "window", "document"] as const).map((k) => [k, Object.getOwnPropertyDescriptor(globalThis, k)]),
);
function stub(values: Partial<Globals>) {
  for (const [k, v] of Object.entries(values)) Object.defineProperty(globalThis, k, { value: v, configurable: true, writable: true });
}
afterEach(() => {
  for (const [k, d] of Object.entries(saved)) {
    if (d) Object.defineProperty(globalThis, k, d);
    else delete (globalThis as Record<string, unknown>)[k];
  }
});

/** A phone the person has touched, recording what it was asked to do. */
function phone({ coarse = true, touched = true, visible = true, api = true } = {}) {
  const buzzes: number[][] = [];
  stub({
    navigator: {
      ...(api ? { vibrate: (p: number[]) => (buzzes.push(p), true) } : {}),
      userActivation: { hasBeenActive: touched, isActive: touched },
    },
    matchMedia: (q: string) => ({ matches: q === "(pointer: coarse)" ? coarse : false }),
    window: {},
    document: { visibilityState: visible ? "visible" : "hidden", hasFocus: () => visible },
  });
  return buzzes;
}

/** The context a provider hands its children, taken from a server render. */
function provider(props: Partial<SoundProviderProps> = {}): SoundContextValue {
  let value: SoundContextValue | null = null;
  function Grab() {
    value = useSound();
    return null;
  }
  renderToString(createElement(SoundProvider, { ...props, children: createElement(Grab) }));
  return value!;
}

test("the tokens that mark a moment carry a haptic, and a plain press doesn't", () => {
  for (const [name, h] of Object.entries(HAPTIC_FOR_SOUND)) {
    assert.ok((SOUND_NAMES as string[]).includes(name), `${name} isn't a sound`);
    assert.ok(HAPTIC_NAMES.includes(h!), `${h} isn't a haptic`);
  }
  for (const quiet of ["tap", "press", "release", "transition"] as const) assert.equal(HAPTIC_FOR_SOUND[quiet], undefined, quiet);
  for (const name of HAPTIC_NAMES) assert.ok(haptic[name].every((ms) => ms > 0 && ms <= 100), `${name} stays short`);
});

test("vibrate asks only a touched touch screen that has the API", () => {
  let buzzes = phone();
  assert.equal(vibrate("tick"), true);
  assert.deepEqual(buzzes, [[8]]);

  phone({ coarse: false });
  assert.equal(vibrate("tick"), false, "a laptop has the API and no motor");
  phone({ touched: false });
  assert.equal(vibrate("tick"), false, "browsers refuse it before the first touch");
  buzzes = phone({ api: false });
  assert.equal(vibrate("tick"), false, "iOS Safari has no Vibration API");
  assert.deepEqual(buzzes, []);
});

test("a token buzzes with its haptic even while sound is off, which it is at first", () => {
  const sound = provider();
  const buzzes = phone();
  assert.equal(sound.muted, true);
  sound.play("select");
  sound.play("error");
  sound.play("tap");
  assert.deepEqual(buzzes, [[...haptic.tick], [...haptic.error]]);
});

test("play can name another haptic or none, and buzz plays one on its own", () => {
  const sound = provider();
  const buzzes = phone();
  sound.play("press", { haptic: "warn" });
  sound.play("select", { haptic: false });
  sound.buzz("success");
  assert.deepEqual(buzzes, [[...haptic.warn], [...haptic.success]]);
});

test("haptics={false} turns them off, and nothing buzzes from a hidden tab", () => {
  let buzzes = phone();
  const off = provider({ haptics: false });
  off.play("error");
  off.buzz("tick");
  assert.deepEqual(buzzes, []);

  const on = provider();
  buzzes = phone({ visible: false });
  on.play("error");
  on.buzz("tick");
  assert.deepEqual(buzzes, []);
});
