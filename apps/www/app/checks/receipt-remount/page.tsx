import { ReceiptRemount } from "./ReceiptRemount";

export const metadata = { title: "Receipt remount fixture", robots: { index: false, follow: false } };

/**
 * A test fixture: a Receipt that arrives after the page has loaded (so it
 * prints), inside an Activity that can be hidden and shown again while it's
 * printing. Showing it again re-runs its effects, as StrictMode does in
 * development; the paper must come out whole.
 * tests/objects.spec.ts drives it.
 */
export default function ReceiptRemountFixture() {
  return <ReceiptRemount />;
}
