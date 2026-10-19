import { SoundRemount } from "./SoundRemount";

export const metadata = { title: "Sound remount fixture", robots: { index: false, follow: false } };

/**
 * A test fixture: a SoundProvider mounted, pressed (which opens its
 * AudioContext) and unmounted, as one inside a page is when the page changes.
 * The context it opened must be closed with it. tests/sound.spec.ts
 * drives it.
 */
export default function SoundRemountFixture() {
  return <SoundRemount />;
}
