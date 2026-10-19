import { z } from "zod";

export const voiceNoteProps = z.object({
  onRecorded: z.function().optional().describe("Called when a take is kept, with the recording (a Blob, or null if the browser gave none) and its length, ms."),
  onDelete: z.function().optional().describe("Called when the note is deleted."),
  maxDuration: z.number().optional().describe("Longest take, ms. Defaults to 60000."),
  feel: z.enum(["cell", "mercury", "cut"]).optional().describe("How it moves: cell (the default) pinches evenly and each half swells round; mercury is short, quick and jiggles; cut is a clean cut, then the caps slide."),
  size: z.enum(["sm", "md", "lg"]).optional().describe("Height of its caps on the control scale: sm 32px, md 44px, lg 60px, as a HardwareButton of that size. Defaults to the nearest SizeProvider's size."),
  align: z.enum(["center", "start", "end"]).optional().describe("Which edge stays put while the buttons change: center (the default), start or end."),
});

export const meta = {
  name: "echo-voice-note",
  title: "VoiceNote",
  description:
    "Record a voice note in one button. The microphone opens into Stop and the take, whose bars follow your voice while Stop swells with it. Stop, and Stop is swallowed by the take, which becomes a note you can play: it fills with the primary plastic as it plays. × deletes it and everything folds back into the microphone.",
  props: voiceNoteProps,
  examples: [
    {
      title: "Keep the recording",
      description: "Send the Blob wherever notes go.",
      code: "<VoiceNote onRecorded={(audio) => audio && upload(audio)} onDelete={clear} />",
    },
  ],
  feel: "Your voice is visibly in the button while you speak, and the take becomes the thing you play.",
  usage: {
    imports: 'import { VoiceNote } from "@/echo/voice-note";',
    code: "<VoiceNote onRecorded={(audio, ms) => save(audio, ms)} />",
  },
  composition: "VoiceNote → Morph → HardwareButton (the note uses `fill`)",
  a11y: [
    "Every control is named: \"Record a voice note\", \"Stop recording\", \"Play voice note, 0:07\", \"Delete voice note\".",
    "Recording, the note's length, deleting and a missing microphone are announced politely.",
    "Escape deletes the note.",
    "It asks for the microphone only when you press record, and says so if it isn't allowed.",
  ],
  motion: {
    tokens: ["morphFeels.cell", "morphFeels.mercury", "morphFeels.cut"],
    reducedMotion: "The states swap in place and Stop doesn't swell; the bars still show the level.",
  },
  sound: ["Each cap's own press. The recording itself is the only other sound."],
  antiPatterns: ["Never record without the user pressing record: the microphone is theirs."],
} as const;
