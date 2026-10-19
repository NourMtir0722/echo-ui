/**
 * Per-component meta for the sound engine.
 */
import { z } from "zod";
import { typed } from "../../agent/typed";

export const soundProviderProps = z.object({
  backend: typed("SoundBackend").optional().describe("A SoundBackend to render recipes with. Defaults to the zero-dependency WebAudio SynthBackend; swap it to route sound elsewhere or silence it in tests."),
  masterGain: z.number().min(0).max(1).default(0.5).describe("Conservative master gain, scales every recipe."),
  muteOnReducedMotion: z.boolean().default(true).describe("Silence sound when the OS requests reduced motion."),
  defaultMuted: z.boolean().default(true).describe("Muted until the person turns sound on, for anyone who hasn't chosen yet; a stored choice always wins. Pass false where sound is the point from the first press."),
  haptics: z.boolean().default(true).describe("Buzz a phone for the sounds that carry a haptic (a choice changing, a completion, a warning, an error), whether or not sound is on. A device that can't vibrate ignores it; iPhones can't, from a web page."),
});

export const meta = {
  name: "echo-sound",
  title: "Sound Engine",
  description:
    "SoundProvider + SynthBackend. Sound tokens are serializable synth recipes (dry, short, hardware) rendered by a zero-dep WebAudio synth. Lazy AudioContext, persisted mute, per-play jitter, blur guard, reduced-motion coupling. On a phone, the tokens that mark a choice, a completion, a warning or an error also buzz.",
  props: soundProviderProps,
  examples: [
    {
      title: "Wrap the app",
      description: "Provide sound once near the root. It starts muted until the person turns sound on; the AudioContext is created lazily on first pointerdown, and closed when the provider unmounts.",
      code: "<SoundProvider>\n  <App />\n</SoundProvider>",
    },
    {
      title: "Play a token",
      description: "useSound().play resolves a token name to its recipe and jitters it.",
      code: 'const { play } = useSound();\n<button onPointerDown={() => play("press")} onPointerUp={() => play("release")} />',
    },
    {
      title: "A haptic on its own",
      description: "play buzzes for the tokens that carry a haptic, even while sound is off; buzz plays one with no sound. Android browsers vibrate; iPhones can't, from a web page.",
      code: 'const { play, buzz } = useSound();\nplay("select"); // a tick in the hand, and the sound when it\'s on\nbuzz("success");',
    },
    {
      title: "Mute toggle",
      description: "Sound starts muted, so offer this somewhere people can find it. Their choice is persisted to localStorage and wins over defaultMuted.",
      code: "const { muted, setMuted } = useSound();\n<button onClick={() => setMuted(!muted)}>{muted ? \"unmute\" : \"mute\"}</button>",
    },
  ],
  feel: "Dry, short clicks and chirps from a device — never notes from an instrument.",
  usage: {
    imports: "import { SoundProvider } from \"echo-ui-core/sound\";",
    code: [
      "<SoundProvider>",
      "  <App />",
      "</SoundProvider>",
    ].join("\n"),
  },
  sound: [
    "Nine tokens: `tap`, `press`, `release`, `select`, `transition`, `notify`, `caution`, `error`, `celebrate`.",
    "Every play varies pitch by up to 3% and volume by up to 10%.",
    "Silent until the person turns sound on (it starts muted; `defaultMuted={false}` starts with it), until the first pointer press, when muted, in a hidden or unfocused tab, and — by default — under reduced motion.",
    "Haptics, on a phone that can vibrate: `select` a tick; `notify` and `celebrate` a success; `caution` a warning; `error` an error. A tap or a press never buzzes. They don't wait for sound to be on, stay still in a hidden tab, and `haptics={false}` turns them off.",
  ],
  antiPatterns: [
    "Never create an AudioContext at module scope — autoplay policy blocks it and it breaks SSR.",
    "Do not add reverb or long tails; recipes stay dry and short (a device, not an instrument).",
    "Do not ship audio-file assets as the default sound path — synth recipes are the default backend.",
  ],
} as const;
