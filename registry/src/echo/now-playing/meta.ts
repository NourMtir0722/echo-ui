import { z } from "zod";

export const nowPlayingProps = z.object({
  title: z.string().describe("What's playing: the track, the episode, the message."),
  artist: z.string().optional().describe("Who it's by, or what it's part of."),
  source: z.string().optional().describe('Where it\'s coming from, engraved over the rest: "Fresh FM", "Voice memo".'),
  artwork: z.unknown().optional().describe("Artwork beside the title, square."),
  playing: z.boolean().describe("Playing now."),
  onPlayingChange: z.function().describe("Called with the new state when play or pause is pressed."),
  position: z.number().describe("Where it is, in seconds."),
  duration: z.number().optional().describe("How long it is, in seconds. Leave out for a live stream. An <audio>'s own duration works as it is: Infinity is live, and NaN (before its metadata loads) reads --:-- with the strip disabled."),
  onSeek: z.function().optional().describe("Called with a new position when someone scrubs. Without it, the strip only shows."),
  onPrevious: z.function().optional().describe("Shows the previous key, and calls this when it's pressed."),
  onNext: z.function().optional().describe("Shows the next key, and calls this when it's pressed."),
  screen: z.enum(["emissive", "reflective"]).default("emissive").describe("The screen's glass: emissive (dark, glowing) or reflective (paper-coloured, printed in ink)."),
});

export const meta = {
  name: "echo-now-playing",
  title: "NowPlaying",
  description:
    "A small player: a screen with where it's from, what's playing and the time in lit segments, a strip to scrub along, and the transport keys under it, play the lit one. For music, podcasts, voice messages and recordings. Every part is an Echo part (SegmentDisplay, Slider, HardwareButtons in a ButtonGroup); you own the audio, this is the device you control it with.",
  props: nowPlayingProps,
  examples: [
    {
      title: "A track",
      description: "Scrub, skip, play and pause, all driven from your player's state.",
      code: '<NowPlaying\n  title="Night Drive"\n  artist="Low Tide"\n  source="Library"\n  playing={playing}\n  onPlayingChange={setPlaying}\n  position={position}\n  duration={214}\n  onSeek={seek}\n  onPrevious={previous}\n  onNext={next}\n/>',
    },
    {
      title: "Live",
      description: "No length, so no strip: the screen says it's live.",
      code: '<NowPlaying title="Breakfast Show" source="Fresh FM 88.5" playing={playing} onPlayingChange={setPlaying} position={elapsed} />',
    },
  ],
  feel: "A pocket radio: a lit screen, a strip under your thumb, three keys.",
  usage: {
    imports: 'import { NowPlaying } from "@/echo/now-playing";',
    code: '<NowPlaying title="Night Drive" playing={false} onPlayingChange={setPlaying} position={0} duration={214} />',
  },
  composition: "NowPlaying\n  the screen: the source, the title and artist, SegmentDisplay (elapsed and length), Slider (position)\n  ButtonGroup: HardwareButton (previous), HardwareButton (play or pause), HardwareButton (next)",
  a11y: [
    "A region named \"Now playing\" and the title.",
    "Play and pause is one button whose name says what it will do; previous and next appear only when you handle them.",
    "The position is a Slider named \"Position\", with every slider key; without onSeek it's shown but can't be moved.",
    "The times are said once each, as \"Elapsed\" and \"Length\".",
    "Keyboard: Tab moves through the buttons and the position; Enter or Space presses a button, and the position takes the Slider's keys (arrows, Page Up and Page Down, Home and End).",
  ],
  motion: {
    tokens: ["springs"],
    reducedMotion: "Keys press and the strip moves without travel, as Echo's always do.",
  },
  sound: ["Each key's press, and the strip's tap at each step, inside a SoundProvider."],
  antiPatterns: [
    "Never let the screen and the audio disagree: position and playing come from your player; this component holds no audio state of its own.",
    "Never put more than three keys under it: previous, play, next. Everything else belongs in a menu.",
  ],
} as const;
